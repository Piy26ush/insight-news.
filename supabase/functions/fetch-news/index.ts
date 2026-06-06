// ============================================================================
// Insight — Edge Function: fetch-news
// Fetches news from GNews API + RSS feeds, normalizes, deduplicates, and
// stores in the articles table. Designed to run every 30 minutes via pg_cron.
//
// After inserting new articles, chains to:
//   1. summarize-article — generates AI summaries
//   2. check-alerts      — matches against user keyword alerts
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// Types (inline to keep edge function self-contained)
// ============================================================================

interface ArticleInsert {
  title: string;
  summary: string | null;
  url: string;
  source: string;
  category: string;
  sentiment: string | null;
  published_at: string;
  image_url: string | null;
}

interface GNewsResponse {
  totalArticles: number;
  articles: Array<{
    title: string;
    description: string;
    content: string;
    url: string;
    image: string | null;
    publishedAt: string;
    source: { name: string; url: string };
  }>;
}

interface RSSJsonResponse {
  status: string;
  items: Array<{
    title: string;
    description: string;
    link: string;
    thumbnail: string;
    pubDate: string;
    author: string;
    enclosure?: { link: string };
  }>;
}

// ============================================================================
// Category keywords (duplicated here to keep edge function self-contained)
// ============================================================================

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  AI: [
    "artificial intelligence", "machine learning", "deep learning", "llm",
    "gpt", "claude", "openai", "anthropic", "generative ai", "chatbot",
    "ai agent", "agentic", "neural network", "transformer",
  ],
  Science: [
    "nasa", "isro", "spacex", "space", "astronomy", "exoplanet", "jwst",
    "crispr", "gene therapy", "quantum", "fusion", "climate change",
    "neuroscience", "biology", "physics",
  ],
  Markets: [
    "stock", "market", "nasdaq", "nifty", "sensex", "fed", "interest rate",
    "inflation", "ipo", "earnings", "crude oil", "gold price", "bitcoin",
    "crypto", "rbi", "monetary policy",
  ],
  Tech: [
    "apple", "google", "microsoft", "nvidia", "semiconductor", "chip",
    "software", "startup", "cybersecurity", "hack", "zero-day",
    "electric vehicle", "ev", "5g", "cloud computing",
  ],
  Global: [
    "geopolitics", "sanctions", "nato", "united nations", "g20", "election",
    "war", "conflict", "ceasefire", "opec", "energy crisis",
  ],
};

function classifyCategory(title: string, description?: string): string {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  const priorityOrder = ["AI", "Science", "Markets", "Tech", "Global"];
  let bestCategory = "Global";
  let bestScore = 0;

  for (const category of priorityOrder) {
    let score = 0;
    for (const keyword of CATEGORY_KEYWORDS[category]) {
      if (text.includes(keyword)) {
        score++;
        if (title.toLowerCase().includes(keyword)) score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  return bestCategory;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

// ============================================================================
// RSS Feed Configuration
// These are free and unlimited — our fallback when paid APIs hit rate limits
// ============================================================================

const RSS_FEEDS = [
  { name: "Google News Tech", url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en" },
  { name: "Google News Science", url: "https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en" },
  { name: "Google News Business", url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en" },
  { name: "Google News World", url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { name: "NASA", url: "https://www.nasa.gov/rss/dyn/breaking_news.rss" },
];

function parseRssXml(xmlText: string): Array<{
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image: string | null;
}> {
  const items: any[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const content = match[1];

    const getTagValue = (tag: string) => {
      const cdataRegex = new RegExp(`<${tag}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${tag}>`);
      const m = content.match(cdataRegex);
      if (m) return (m[1] || m[2] || "").trim();
      return "";
    };

    const title = getTagValue("title");
    const link = getTagValue("link");
    const description = getTagValue("description");
    const pubDate = getTagValue("pubDate");

    let image: string | null = null;
    const mediaMatch = content.match(/<media:content[^>]*url="([^"]*)"/i);
    const enclosureMatch = content.match(/<enclosure[^>]*url="([^"]*)"/i);
    const imgTagMatch = content.match(/<img[^>]*src="([^"]*)"/i);
    
    if (enclosureMatch) image = enclosureMatch[1];
    else if (mediaMatch) image = mediaMatch[1];
    else if (imgTagMatch) image = imgTagMatch[1];

    if (title && link) {
      items.push({
        title,
        link,
        description,
        pubDate,
        image
      });
    }
  }
  return items;
}


// ============================================================================
// GNews fetch categories
// ============================================================================

const GNEWS_CATEGORIES = ["technology", "science", "business", "world", "general"];

// ============================================================================
// Main handler
// ============================================================================

Deno.serve(async (req: Request) => {
  try {
    console.log("[fetch-news] Starting news fetch cycle...");

    // Initialize Supabase admin client (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const allArticles: ArticleInsert[] = [];
    const errors: string[] = [];

    // -----------------------------------------------------------------------
    // 1. Check GNews rate limit before calling
    // -----------------------------------------------------------------------
    const gnewsApiKey = Deno.env.get("GNEWS_API_KEY");
    let gnewsCallCount = 0;

    if (gnewsApiKey) {
      // Get today's call count
      const { data: countData } = await supabase.rpc("get_api_call_count", {
        p_source: "gnews",
      });
      gnewsCallCount = countData ?? 0;
      console.log(`[fetch-news] GNews calls today: ${gnewsCallCount}/100`);

      if (gnewsCallCount < 90) {
        // Safe to call GNews — fetch each category
        for (const category of GNEWS_CATEGORIES) {
          try {
            const url = `https://gnews.io/api/v4/top-headlines?category=${category}&lang=en&max=10&apikey=${gnewsApiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
              errors.push(`GNews ${category}: HTTP ${response.status}`);
              continue;
            }

            const data: GNewsResponse = await response.json();

            // Track the API call
            await supabase.rpc("increment_api_calls", { p_source: "gnews" });

            for (const article of data.articles) {
              allArticles.push({
                title: article.title,
                summary: article.description || null,
                url: article.url,
                source: article.source?.name ?? "GNews",
                category: classifyCategory(article.title, article.description),
                sentiment: null,
                published_at: article.publishedAt,
                image_url: article.image || null,
              });
            }

            console.log(`[fetch-news] GNews ${category}: ${data.articles.length} articles`);
          } catch (err) {
            errors.push(`GNews ${category}: ${(err as Error).message}`);
          }
        }
      } else {
        console.log("[fetch-news] GNews rate limit near — skipping, falling back to RSS only");
      }
    } else {
      console.log("[fetch-news] No GNEWS_API_KEY set — skipping GNews");
    }

    // -----------------------------------------------------------------------
    // 2. Always fetch RSS feeds (free and unlimited)
    // -----------------------------------------------------------------------
    for (const feed of RSS_FEEDS) {
      try {
        const response = await fetch(feed.url);

        if (!response.ok) {
          errors.push(`RSS ${feed.name}: HTTP ${response.status}`);
          continue;
        }

        const xmlText = await response.text();
        const items = parseRssXml(xmlText);

        for (const item of items) {
          allArticles.push({
            title: item.title,
            summary: stripHtml(item.description) || null,
            url: item.link,
            source: feed.name,
            category: classifyCategory(item.title, item.description),
            sentiment: null,
            published_at: item.pubDate,
            image_url: item.image,
          });
        }

        console.log(`[fetch-news] RSS ${feed.name}: ${items.length} articles`);

        // Track RSS calls too (for monitoring, no rate limit needed)
        await supabase.rpc("increment_api_calls", { p_source: "rss" });
      } catch (err) {
        errors.push(`RSS ${feed.name}: ${(err as Error).message}`);
      }
    }

    // -----------------------------------------------------------------------
    // 3. Fetch from Currents API (backup, 600 req/day free)
    // -----------------------------------------------------------------------
    const currentsApiKey = Deno.env.get("CURRENTS_API_KEY");

    if (currentsApiKey) {
      const { data: currentsCount } = await supabase.rpc("get_api_call_count", {
        p_source: "currents",
      });

      if ((currentsCount ?? 0) < 550) {
        try {
          const url = `https://api.currentsapi.services/v1/latest-news?language=en&apiKey=${currentsApiKey}`;
          const response = await fetch(url);

          if (response.ok) {
            const data = await response.json();
            await supabase.rpc("increment_api_calls", { p_source: "currents" });

            for (const article of data.news ?? []) {
              allArticles.push({
                title: article.title,
                summary: article.description || null,
                url: article.url,
                source: article.author || "Currents",
                category: classifyCategory(article.title, article.description),
                sentiment: null,
                published_at: article.published,
                image_url: article.image || null,
              });
            }

            console.log(`[fetch-news] Currents API: ${(data.news ?? []).length} articles`);
          } else {
            errors.push(`Currents API: HTTP ${response.status}`);
          }
        } catch (err) {
          errors.push(`Currents API: ${(err as Error).message}`);
        }
      } else {
        console.log("[fetch-news] Currents rate limit near — skipping");
      }
    }

    // -----------------------------------------------------------------------
    // 4. Deduplicate by URL and upsert into articles table
    // -----------------------------------------------------------------------
    // Remove duplicates within this batch (same URL from multiple sources)
    const uniqueUrls = new Set<string>();
    const deduplicated = allArticles.filter((a) => {
      if (uniqueUrls.has(a.url)) return false;
      uniqueUrls.add(a.url);
      return true;
    });

    console.log(`[fetch-news] Total fetched: ${allArticles.length}, deduplicated: ${deduplicated.length}`);

    let insertedCount = 0;

    if (deduplicated.length > 0) {
      // Upsert in batches of 50 to avoid payload limits
      const batchSize = 50;
      for (let i = 0; i < deduplicated.length; i += batchSize) {
        const batch = deduplicated.slice(i, i + batchSize);

        const { data: inserted, error: insertError } = await supabase
          .from("articles")
          .upsert(batch, {
            onConflict: "url",
            ignoreDuplicates: true,  // skip existing URLs silently
          })
          .select("id");

        if (insertError) {
          errors.push(`Upsert batch ${i}: ${insertError.message}`);
        } else {
          insertedCount += inserted?.length ?? 0;
        }
      }
    }

    console.log(`[fetch-news] Inserted/updated: ${insertedCount} articles`);

    // -----------------------------------------------------------------------
    // 5. Chain: trigger summarize-article for new unsummarized articles
    // -----------------------------------------------------------------------
    try {
      const { data: unsummarized } = await supabase
        .from("articles")
        .select("id")
        .is("summary", null)
        .order("fetched_at", { ascending: false })
        .limit(10); // Process 10 at a time to stay within AI API limits

      if (unsummarized && unsummarized.length > 0) {
        console.log(`[fetch-news] Triggering summarization for ${unsummarized.length} articles`);

        // Call summarize-article edge function for each
        for (const article of unsummarized) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/summarize-article`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ article_id: article.id }),
            });
          } catch {
            // Don't let summarization failures block the main flow
            console.error(`[fetch-news] Failed to trigger summarize for ${article.id}`);
          }
        }
      }
    } catch (err) {
      console.error("[fetch-news] Summarization chain error:", (err as Error).message);
    }

    // -----------------------------------------------------------------------
    // 6. Chain: trigger check-alerts for keyword matches
    // -----------------------------------------------------------------------
    try {
      await fetch(`${supabaseUrl}/functions/v1/check-alerts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source: "fetch-news" }),
      });
      console.log("[fetch-news] Triggered check-alerts");
    } catch (err) {
      console.error("[fetch-news] check-alerts chain error:", (err as Error).message);
    }

    // -----------------------------------------------------------------------
    // 7. Return summary
    // -----------------------------------------------------------------------
    const result = {
      success: true,
      fetched: allArticles.length,
      deduplicated: deduplicated.length,
      inserted: insertedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    };

    console.log("[fetch-news] Cycle complete:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[fetch-news] Fatal error:", (err as Error).message);

    return new Response(
      JSON.stringify({
        success: false,
        error: (err as Error).message,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
