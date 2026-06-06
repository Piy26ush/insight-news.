// ============================================================================
// Insight — Edge Function: refresh-news
// Lightweight RSS-only fetch cycle triggered on-demand by the frontend.
// Never uses paid APIs (GNews) — completely free.
// Protects database with a 2-minute cooldown check.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
  let text = html.replace(/<!--[\s\S]*?-->/g, "");
  if (text.includes("href=") && text.includes("font color=")) {
    text = text.replace(/<[^>]*>/g, " ");
  } else {
    text = text.replace(/<[^>]*>/g, "");
  }
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return text.replace(/\s+/g, " ").trim();
}

// RSS Feed list (matches fetch-news list)
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

// ============================================================================
// Main handler
// ============================================================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    console.log("[refresh-news] Starting custom refresh cycle...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // -----------------------------------------------------------------------
    // Cooldown check (2 minutes)
    // -----------------------------------------------------------------------
    const { data: latestArticle } = await supabase
      .from("articles")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestArticle && latestArticle.fetched_at) {
      const timeDiff = Date.now() - new Date(latestArticle.fetched_at).getTime();
      if (timeDiff < 120000) {
        console.log("[refresh-news] Request within 2-minute cooldown window. Skipping fetch.");
        return new Response(
          JSON.stringify({
            success: true,
            cooldown: true,
            inserted: 0,
            message: "Already up to date (cooldown active)",
          }),
          {
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }
    }

    const allArticles: ArticleInsert[] = [];
    const errors: string[] = [];

    // Fetch all RSS feeds in parallel
    console.log(`[refresh-news] Fetching ${RSS_FEEDS.length} RSS feeds in parallel...`);
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
      } else {
        errors.push(`RSS ${feed.name}: ${res.reason.message}`);
        console.error(`[refresh-news] Failed to fetch RSS ${feed.name}:`, res.reason);
      }
    });

    // 1. URL-deduplicate
    const uniqueUrls = new Set<string>();
    const urlDeduplicated = allArticles.filter((a) => {
      if (uniqueUrls.has(a.url)) return false;
      uniqueUrls.add(a.url);
      return true;
    });

    // 2. Fuzzy Title-deduplicate
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
      `[refresh-news] Total fetched: ${allArticles.length}, URL-deduped: ${urlDeduplicated.length}, Fuzzy-deduped: ${finalArticles.length}`,
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

    console.log(`[refresh-news] Custom refresh inserted/updated: ${insertedCount} articles`);

    // Trigger summarization for newly inserted articles if any
    if (insertedCount > 0) {
      try {
        const { data: unsummarized } = await supabase
          .from("articles")
          .select("id")
          .is("summary", null)
          .order("fetched_at", { ascending: false })
          .limit(10);

        if (unsummarized && unsummarized.length > 0) {
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
              console.error(`[refresh-news] Failed to trigger summarize for ${article.id}`);
            }
          }
        }
      } catch (err) {
        console.error("[refresh-news] Summarization chain error:", (err as Error).message);
      }
    }

    // Trigger alerts if any articles inserted
    if (insertedCount > 0) {
      try {
        fetch(`${supabaseUrl}/functions/v1/check-alerts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ source: "refresh-news" }),
        });
      } catch (err) {
        console.error("[refresh-news] check-alerts chain error:", (err as Error).message);
      }
    }

    const responsePayload = {
      success: true,
      cooldown: false,
      inserted: insertedCount,
      fetched: allArticles.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[refresh-news] Fatal error:", (err as Error).message);
    return new Response(
      JSON.stringify({
        success: false,
        error: (err as Error).message,
      }),
      {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
