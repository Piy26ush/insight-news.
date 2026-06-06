// ============================================================================
// Insight — Edge Function: fetch-news
// Fetches news from GNews API + RSS feeds, normalizes, deduplicates, and
// stores in the articles table. Designed to run every 53 minutes via pg_cron.
//
// After inserting new articles, chains to:
//   1. summarize-article — generates AI summaries
//   2. check-alerts      — matches against user keyword alerts
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// Types
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

// ============================================================================
// Category keywords
// ============================================================================

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  AI: [
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "llm",
    "gpt",
    "claude",
    "openai",
    "anthropic",
    "generative ai",
    "chatbot",
    "ai agent",
    "agentic",
    "neural network",
    "transformer",
  ],
  Science: [
    "nasa",
    "isro",
    "spacex",
    "space",
    "astronomy",
    "exoplanet",
    "jwst",
    "crispr",
    "gene therapy",
    "quantum",
    "fusion",
    "climate change",
    "neuroscience",
    "biology",
    "physics",
    "health",
    "medical",
    "disease",
    "vaccine",
  ],
  Markets: [
    "stock",
    "market",
    "nasdaq",
    "nifty",
    "sensex",
    "fed",
    "interest rate",
    "inflation",
    "ipo",
    "earnings",
    "crude oil",
    "gold price",
    "bitcoin",
    "crypto",
    "rbi",
    "sebi",
    "mutual fund",
    "nse",
    "bse",
    "rupee",
    "fiscal deficit",
  ],
  Tech: [
    "apple",
    "google",
    "microsoft",
    "nvidia",
    "semiconductor",
    "chip",
    "software",
    "startup",
    "5g",
    "cloud computing",
  ],
  Cybersecurity: [
    "ransomware",
    "phishing",
    "data breach",
    "malware",
    "ddos",
    "vulnerability",
    "cybersecurity",
    "hack",
    "zero-day",
  ],
  Vehicles: [
    "electric vehicle",
    "ev",
    "tesla",
    "tata motors",
    "mahindra",
    "formula 1",
    "f1",
    "aerospace",
    "automotive",
    "car",
    "autonomous driving",
  ],
  Sports: [
    "cricket",
    "ipl",
    "bcci",
    "kohli",
    "rohit",
    "olympics",
    "tennis",
    "sports",
    "football",
    "soccer",
    "trophy",
  ],
  India: [
    "modi",
    "parliament",
    "lok sabha",
    "rajya sabha",
    "supreme court",
    "bjp",
    "congress",
    "aap",
    "india",
    "delhi",
    "mumbai",
  ],
  Business: [
    "deals",
    "acquisition",
    "merger",
    "corporate",
    "startup funding",
    "venture capital",
    "business",
    "ceo",
    "revenue",
  ],
  Global: [
    "geopolitics",
    "sanctions",
    "nato",
    "united nations",
    "g20",
    "election",
    "war",
    "conflict",
    "ceasefire",
    "opec",
    "energy crisis",
  ],
};

function classifyCategory(title: string, description?: string, defaultCat?: string): string {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  const priorityOrder = ["AI", "Cybersecurity", "Vehicles", "Sports", "India", "Markets", "Tech", "Science", "Business", "Global"];
  let bestCategory = defaultCat || "Global";
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

function cleanDescription(html: string): string {
  if (!html) return "";
  // Remove HTML comments
  let text = html.replace(/<!--[\s\S]*?-->/g, "");
  // Extract text from lists or standard HTML tags
  if (text.includes("href=") && text.includes("font color=")) {
    text = text.replace(/<[^>]*>/g, " ");
  } else {
    text = text.replace(/<[^>]*>/g, "");
  }
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // Normalize spaces
  return text.replace(/\s+/g, " ").trim();
}

// ============================================================================
// RSS Feed Configuration (17 feeds total)
// ============================================================================

const RSS_FEEDS = [
  {
    name: "Google News India",
    url: "https://news.google.com/rss/headlines/section/topic/NATION?hl=en-IN&gl=IN&ceid=IN:en",
    defaultCategory: "India",
  },
  {
    name: "Google News Sports",
    url: "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-IN&gl=IN&ceid=IN:en",
    defaultCategory: "Sports",
  },
  {
    name: "Google News Health",
    url: "https://news.google.com/rss/headlines/section/topic/HEALTH?hl=en-US&gl=US&ceid=US:en",
    defaultCategory: "Science",
  },
  {
    name: "Google News Tech",
    url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en",
    defaultCategory: "Tech",
  },
  {
    name: "Google News Science",
    url: "https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en",
    defaultCategory: "Science",
  },
  {
    name: "Google News Business",
    url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en",
    defaultCategory: "Business",
  },
  {
    name: "Google News World",
    url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en",
    defaultCategory: "Global",
  },
  {
    name: "NDTV Top Stories",
    url: "https://feeds.feedburner.com/ndtvnews-top-stories",
    defaultCategory: "India",
  },
  {
    name: "Times of India",
    url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    defaultCategory: "India",
  },
  {
    name: "Indian Express",
    url: "https://indianexpress.com/section/india/feed/",
    defaultCategory: "India",
  },
  {
    name: "Hindustan Times",
    url: "https://www.hindustantimes.com/rss/topnews/rssfeed.xml",
    defaultCategory: "India",
  },
  {
    name: "Moneycontrol",
    url: "https://www.moneycontrol.com/rss/latestnews.xml",
    defaultCategory: "Markets",
  },
  {
    name: "LiveMint",
    url: "https://www.livemint.com/rss/news",
    defaultCategory: "Markets",
  },
  {
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    defaultCategory: "Tech",
  },
  {
    name: "Wired Science",
    url: "https://www.wired.com/feed/category/science/latest/rss",
    defaultCategory: "Science",
  },
  {
    name: "NASA",
    url: "https://www.nasa.gov/rss/dyn/breaking_news.rss",
    defaultCategory: "Science",
  },
  {
    name: "ESPN Cricinfo",
    url: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml",
    defaultCategory: "Sports",
  },
];

function parseRssXml(xmlText: string, feed: typeof RSS_FEEDS[number]): ArticleInsert[] {
  const items: ArticleInsert[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const content = match[1];

    const getTagValue = (tag: string) => {
      const cdataRegex = new RegExp(
        `<${tag}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${tag}>`,
      );
      const m = content.match(cdataRegex);
      if (m) return (m[1] || m[2] || "").trim();
      return "";
    };

    const rawTitle = getTagValue("title");
    const link = getTagValue("link");
    const description = getTagValue("description");
    const pubDate = getTagValue("pubDate");

    let image: string | null = null;
    const mediaContentMatch = content.match(/<media:content[^>]*url="([^"]*)"/i);
    const mediaThumbnailMatch = content.match(/<media:thumbnail[^>]*url="([^"]*)"/i);
    const enclosureMatch = content.match(/<enclosure[^>]*url="([^"]*)"/i);
    const imgTagMatch = content.match(/<img[^>]*src="([^"]*)"/i);

    if (mediaContentMatch) image = mediaContentMatch[1];
    else if (mediaThumbnailMatch) image = mediaThumbnailMatch[1];
    else if (enclosureMatch) image = enclosureMatch[1];
    else if (imgTagMatch) image = imgTagMatch[1];

    if (image && !image.startsWith("http")) {
      image = null;
    }

    const sourceMatch = content.match(/<source[^>]*>(.*?)<\/source>/i);
    const parsedSource = sourceMatch ? sourceMatch[1].trim() : null;

    let displayTitle = rawTitle;
    let sourceName = parsedSource || feed.name;

    // Clean source name out of the title if it follows "Headline - Source" pattern
    const lastHyphen = rawTitle.lastIndexOf(" - ");
    if (lastHyphen > 0) {
      const potentialSource = rawTitle.substring(lastHyphen + 3).trim();
      if (potentialSource.length > 0 && potentialSource.length < 40) {
        sourceName = potentialSource;
        displayTitle = rawTitle.substring(0, lastHyphen).trim();
      }
    }

    if (displayTitle && link) {
      items.push({
        title: displayTitle,
        summary: cleanDescription(description) || null,
        url: link,
        source: sourceName,
        category: classifyCategory(displayTitle, description, feed.defaultCategory),
        sentiment: null,
        published_at: pubDate || new Date().toISOString(),
        image_url: image,
      });
    }
  }
  return items;
}

// Jaccard similarity logic for fuzzy title deduplication
function getTitleSimilarity(titleA: string, titleB: string): number {
  const normalize = (t: string) =>
    t
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(Boolean);
  const wordsA = new Set(normalize(titleA));
  const wordsB = new Set(normalize(titleB));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }
  const union = wordsA.size + wordsB.size - intersection;
  return intersection / union;
}

const GNEWS_CATEGORIES = ["technology", "science", "business", "world", "general"];

// ============================================================================
// Main handler
// ============================================================================

Deno.serve(async (req: Request) => {
  try {
    console.log("[fetch-news] Starting news fetch cycle...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const allArticles: ArticleInsert[] = [];
    const errors: string[] = [];

    // Calculate if GNews should be skipped (before 12:00 PM IST)
    const now = new Date();
    const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const istHour = istTime.getUTCHours();
    let skipGNews = istHour < 12;

    // -----------------------------------------------------------------------
    // 1. Fetch from GNews (Conditional on Time + Quota + 50-minute throttling)
    // -----------------------------------------------------------------------
    const gnewsApiKey = Deno.env.get("GNEWS_API_KEY");

    if (gnewsApiKey && !skipGNews) {
      const todayStr = now.toISOString().split("T")[0];
      const { data: lastCallData } = await supabase
        .from("api_call_log")
        .select("last_called_at")
        .eq("source", "gnews")
        .eq("call_date", todayStr)
        .maybeSingle();

      if (lastCallData && lastCallData.last_called_at) {
        const timeDiff = Date.now() - new Date(lastCallData.last_called_at).getTime();
        if (timeDiff < 50 * 60 * 1000) {
          console.log(`[fetch-news] GNews called ${Math.round(timeDiff / 60000)}m ago — skipping GNews this cycle to throttle calls`);
          skipGNews = true;
        }
      }
    }

    if (gnewsApiKey && !skipGNews) {
      const { data: countData } = await supabase.rpc("get_api_call_count", {
        p_source: "gnews",
      });
      const gnewsCallCount = countData ?? 0;
      console.log(`[fetch-news] GNews calls today: ${gnewsCallCount}/100`);

      if (gnewsCallCount < 90) {
        for (const category of GNEWS_CATEGORIES) {
          try {
            const url = `https://gnews.io/api/v4/top-headlines?category=${category}&lang=en&max=10&apikey=${gnewsApiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
              errors.push(`GNews ${category}: HTTP ${response.status}`);
              continue;
            }

            const data: GNewsResponse = await response.json();
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
      console.log(
        skipGNews
          ? `[fetch-news] Morning time (IST ${istHour}:00 < 12:00) — skipping GNews to save quota`
          : "[fetch-news] No GNEWS_API_KEY set — skipping GNews",
      );
    }

    // -----------------------------------------------------------------------
    // 2. Fetch all RSS feeds in parallel (Promise.allSettled)
    // -----------------------------------------------------------------------
    console.log(`[fetch-news] Fetching ${RSS_FEEDS.length} RSS feeds in parallel...`);
    const feedPromises = RSS_FEEDS.map(async (feed) => {
      const response = await fetch(feed.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const xmlText = await response.text();
      return parseRssXml(xmlText, feed);
    });

    const results = await Promise.allSettled(feedPromises);

    results.forEach((res, index) => {
      const feed = RSS_FEEDS[index];
      if (res.status === "fulfilled") {
        allArticles.push(...res.value);
        console.log(`[fetch-news] RSS ${feed.name}: ${res.value.length} articles`);
      } else {
        errors.push(`RSS ${feed.name}: ${res.reason.message}`);
        console.error(`[fetch-news] Failed to fetch RSS ${feed.name}:`, res.reason);
      }
    });

    // Track one general RSS increment call
    await supabase.rpc("increment_api_calls", { p_source: "rss" });

    // -----------------------------------------------------------------------
    // 3. Deduplicate (URL-based and Fuzzy Title-based)
    // -----------------------------------------------------------------------
    // A. URL-based deduplication
    const uniqueUrls = new Set<string>();
    const urlDeduplicated = allArticles.filter((a) => {
      if (uniqueUrls.has(a.url)) return false;
      uniqueUrls.add(a.url);
      return true;
    });

    // B. Jaccard fuzzy title-based deduplication
    const finalArticles: ArticleInsert[] = [];
    for (const article of urlDeduplicated) {
      let isDuplicate = false;
      for (const existing of finalArticles) {
        if (getTitleSimilarity(article.title, existing.title) > 0.65) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        finalArticles.push(article);
      }
    }

    console.log(
      `[fetch-news] Total fetched: ${allArticles.length}, URL-deduped: ${urlDeduplicated.length}, Fuzzy-deduped: ${finalArticles.length}`,
    );

    let insertedCount = 0;

    if (finalArticles.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < finalArticles.length; i += batchSize) {
        const batch = finalArticles.slice(i, i + batchSize);

        const { data: inserted, error: insertError } = await supabase
          .from("articles")
          .upsert(batch, {
            onConflict: "url",
            ignoreDuplicates: true,
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
    // 4. Trigger AI Summaries (up to 10 articles)
    // -----------------------------------------------------------------------
    if (insertedCount > 0) {
      try {
        const { data: unsummarized } = await supabase
          .from("articles")
          .select("id")
          .is("summary", null)
          .order("fetched_at", { ascending: false })
          .limit(10);

        if (unsummarized && unsummarized.length > 0) {
          console.log(`[fetch-news] Triggering summarization for ${unsummarized.length} articles`);
          for (const article of unsummarized) {
            try {
              fetch(`${supabaseUrl}/functions/v1/summarize-article`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${supabaseKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ article_id: article.id }),
              });
            } catch {
              console.error(`[fetch-news] Failed to trigger summarize for ${article.id}`);
            }
          }
        }
      } catch (err) {
        console.error("[fetch-news] Summarization chain error:", (err as Error).message);
      }
    }

    // -----------------------------------------------------------------------
    // 5. Trigger Alerts
    // -----------------------------------------------------------------------
    if (insertedCount > 0) {
      try {
        fetch(`${supabaseUrl}/functions/v1/check-alerts`, {
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
    }

    const result = {
      success: true,
      fetched: allArticles.length,
      deduplicated: finalArticles.length,
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
      },
    );
  }
});
