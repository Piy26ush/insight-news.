// ============================================================================
// Insight — Category Mapper
// Takes a raw article from any source (GNews, RSS, Currents) and classifies
// it into one of the 5 Insight categories based on keyword matching.
// ============================================================================

import type { ArticleCategory, ArticleInsert } from "./database.types";

// ============================================================================
// Keyword dictionaries for each category
// Order matters: more specific categories (AI) are checked before broad ones (Tech).
// ============================================================================

const CATEGORY_KEYWORDS: Record<ArticleCategory, string[]> = {
  AI: [
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "neural network",
    "llm",
    "large language model",
    "gpt",
    "claude",
    "gemini",
    "openai",
    "anthropic",
    "generative ai",
    "chatbot",
    "transformer",
    "diffusion model",
    "copilot",
    "ai agent",
    "agentic",
    "agi",
    "alignment",
    "fine-tuning",
    "prompt",
    "stable diffusion",
    "midjourney",
    "hugging face",
    "langchain",
    "vector database",
    "rag",
    "retrieval augmented",
    "ai safety",
    "superintelligence",
  ],
  Science: [
    "nasa",
    "isro",
    "spacex",
    "space",
    "astronomy",
    "telescope",
    "exoplanet",
    "jwst",
    "mars",
    "moon",
    "rocket",
    "satellite",
    "orbit",
    "crispr",
    "gene therapy",
    "dna",
    "rna",
    "clinical trial",
    "vaccine",
    "quantum",
    "qubit",
    "fusion",
    "particle physics",
    "cern",
    "climate change",
    "carbon capture",
    "renewable energy",
    "biodiversity",
    "neuroscience",
    "stem cell",
    "biology",
    "chemistry",
    "physics",
  ],
  Markets: [
    "stock",
    "market",
    "nasdaq",
    "s&p 500",
    "dow jones",
    "nifty",
    "sensex",
    "fed",
    "federal reserve",
    "interest rate",
    "inflation",
    "gdp",
    "ipo",
    "earnings",
    "revenue",
    "profit",
    "dividend",
    "valuation",
    "crude oil",
    "gold price",
    "bitcoin",
    "crypto",
    "forex",
    "bull",
    "bear",
    "rally",
    "selloff",
    "correction",
    "rbi",
    "monetary policy",
    "fiscal",
    "bond",
    "yield",
    "treasury",
    "mutual fund",
    "etf",
    "hedge fund",
    "venture capital",
  ],
  Tech: [
    "apple",
    "google",
    "microsoft",
    "amazon",
    "meta",
    "nvidia",
    "tesla",
    "semiconductor",
    "chip",
    "processor",
    "gpu",
    "software",
    "hardware",
    "startup",
    "saas",
    "cloud computing",
    "cybersecurity",
    "hack",
    "breach",
    "zero-day",
    "malware",
    "ransomware",
    "blockchain",
    "web3",
    "metaverse",
    "vr",
    "ar",
    "mixed reality",
    "5g",
    "6g",
    "internet",
    "browser",
    "app",
    "developer",
    "electric vehicle",
    "ev",
    "autonomous driving",
    "self-driving",
    "figma",
    "github",
    "docker",
    "kubernetes",
    "devops",
  ],
  Global: [
    "geopolitics",
    "diplomacy",
    "sanctions",
    "trade war",
    "nato",
    "un",
    "united nations",
    "g20",
    "g7",
    "summit",
    "treaty",
    "election",
    "parliament",
    "congress",
    "legislation",
    "policy",
    "war",
    "conflict",
    "ceasefire",
    "refugee",
    "humanitarian",
    "india",
    "china",
    "russia",
    "ukraine",
    "usa",
    "eu",
    "europe",
    "middle east",
    "africa",
    "asia",
    "pacific",
    "opec",
    "energy crisis",
    "supply chain",
  ],
};

// ============================================================================
// Category Classification
// ============================================================================

/**
 * Classifies an article into an Insight category based on keywords in the
 * title and description. Checks more specific categories first (AI before Tech).
 *
 * @param title       - The article title
 * @param description - The article description/snippet (optional)
 * @returns The best-match ArticleCategory
 */
export function classifyCategory(title: string, description?: string): ArticleCategory {
  const text = `${title} ${description ?? ""}`.toLowerCase();

  // Check categories in priority order: AI first (subset of Tech)
  const priorityOrder: ArticleCategory[] = ["AI", "Science", "Markets", "Tech", "Global"];

  let bestCategory: ArticleCategory = "Global";
  let bestScore = 0;

  for (const category of priorityOrder) {
    const keywords = CATEGORY_KEYWORDS[category];
    let score = 0;

    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score++;
        // Title matches count double — they're more signal-dense
        if (title.toLowerCase().includes(keyword)) {
          score++;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

// ============================================================================
// Raw article normalization — from any API source to our DB schema
// ============================================================================

/** Shape of a raw article from GNews API */
export interface GNewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string; url: string };
}

/** Shape of a raw article from RSS (via rss2json.com) */
export interface RSSArticle {
  title: string;
  description: string;
  link: string;
  thumbnail: string;
  pubDate: string;
  author: string;
  enclosure?: { link: string };
}

/** Shape of a raw article from Currents API */
export interface CurrentsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  image: string;
  published: string;
  author: string;
  category: string[];
}

/**
 * Normalizes a GNews article into our database insert format.
 */
export function normalizeGNewsArticle(raw: GNewsArticle): ArticleInsert {
  return {
    title: raw.title,
    summary: raw.description || null,
    url: raw.url,
    source: raw.source?.name ?? "GNews",
    category: classifyCategory(raw.title, raw.description),
    sentiment: null,
    published_at: raw.publishedAt,
    image_url: raw.image || null,
  };
}

/**
 * Normalizes an RSS article into our database insert format.
 *
 * @param raw      - The raw RSS item
 * @param feedName - Name of the RSS feed source (e.g. "BBC Tech", "TechCrunch")
 */
export function normalizeRSSArticle(raw: RSSArticle, feedName: string): ArticleInsert {
  return {
    title: raw.title,
    summary: stripHtmlTags(raw.description) || null,
    url: raw.link,
    source: feedName,
    category: classifyCategory(raw.title, raw.description),
    sentiment: null,
    published_at: raw.pubDate,
    image_url: raw.thumbnail || raw.enclosure?.link || null,
  };
}

/**
 * Normalizes a Currents API article into our database insert format.
 */
export function normalizeCurrentsArticle(raw: CurrentsArticle): ArticleInsert {
  return {
    title: raw.title,
    summary: raw.description || null,
    url: raw.url,
    source: raw.author || "Currents",
    category: classifyCategory(raw.title, raw.description),
    sentiment: null,
    published_at: raw.published,
    image_url: raw.image || null,
  };
}

// ============================================================================
// Utility
// ============================================================================

/** Strips HTML tags from RSS descriptions */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
