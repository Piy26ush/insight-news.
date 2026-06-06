// ============================================================================
// Insight — Edge Function: summarize-article
// Generates a 3-sentence AI summary for a given article.
// For Markets articles, also runs sentiment analysis (bullish/bearish/neutral).
//
// Triggered by fetch-news after inserting new articles.
// Uses Claude Sonnet as primary, Groq as fallback.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// AI helper (inlined for edge function self-containment)
// ============================================================================

interface AIResult {
  text: string;
  model: string;
  fallback: boolean;
}

async function callClaude(
  prompt: string,
  apiKey: string,
  maxTokens: number
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Claude API ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const text = data.content?.find(
      (b: { type: string; text?: string }) => b.type === "text"
    )?.text;

    if (!text) throw new Error("Claude returned no text");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function callGroq(
  prompt: string,
  apiKey: string,
  maxTokens: number
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Groq API ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Groq returned no text");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function tryClaudeOrGroq(prompt: string, maxTokens = 300): Promise<AIResult> {
  const claudeKey = Deno.env.get("ANTHROPIC_API_KEY");
  const groqKey = Deno.env.get("GROQ_API_KEY");

  if (claudeKey) {
    try {
      console.log("[summarize] Trying Claude...");
      const text = await callClaude(prompt, claudeKey, maxTokens);
      console.log("[summarize] ✓ Claude succeeded");
      return { text, model: "claude-sonnet-4-6", fallback: false };
    } catch (err) {
      console.warn("[summarize] Claude failed:", (err as Error).message);
    }
  }

  if (groqKey) {
    try {
      console.log("[summarize] Falling back to Groq...");
      const text = await callGroq(prompt, groqKey, maxTokens);
      console.log("[summarize] ✓ Groq succeeded");
      return { text, model: "llama3-8b-8192", fallback: true };
    } catch (err) {
      console.error("[summarize] Groq also failed:", (err as Error).message);
    }
  }

  throw new Error("No AI providers available");
}

// ============================================================================
// Article content fetcher
// Tries to extract readable text from the article URL.
// Falls back to title + existing summary if fetch fails.
// ============================================================================

async function fetchArticleContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Insight News Aggregator/1.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Basic HTML → text extraction:
    // Remove script/style tags and their content, then strip remaining HTML
    const cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Take first 2000 chars to keep the prompt short and token-efficient
    return cleaned.substring(0, 2000);
  } catch (err) {
    console.warn(`[summarize] Failed to fetch article content: ${(err as Error).message}`);
    return ""; // Will use title + summary as fallback
  }
}

// ============================================================================
// Main handler
// ============================================================================

Deno.serve(async (req: Request) => {
  try {
    // Parse the article ID from the request body
    const { article_id } = await req.json();

    if (!article_id) {
      return new Response(
        JSON.stringify({ error: "article_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[summarize] Processing article: ${article_id}`);

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the article from the database
    const { data: article, error: fetchError } = await supabase
      .from("articles")
      .select("*")
      .eq("id", article_id)
      .single();

    if (fetchError || !article) {
      console.error("[summarize] Article not found:", fetchError?.message);
      return new Response(
        JSON.stringify({ error: "Article not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Skip if already summarized
    if (article.summary && article.summary.length > 50) {
      console.log("[summarize] Article already has a good summary, skipping");
      return new Response(
        JSON.stringify({ status: "skipped", reason: "already summarized" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // -----------------------------------------------------------------------
    // 1. Fetch article content from URL
    // -----------------------------------------------------------------------
    const content = await fetchArticleContent(article.url);

    // Build the text we'll send to the AI
    const articleText = content
      ? `Title: ${article.title}\n\nContent: ${content}`
      : `Title: ${article.title}\n\nDescription: ${article.summary ?? "No description available."}`;

    // -----------------------------------------------------------------------
    // 2. Generate 3-sentence summary
    // -----------------------------------------------------------------------
    const summaryPrompt = `Summarize this news article in exactly 3 concise, neutral sentences. No bullet points, no headers — just 3 sentences.\n\n${articleText}`;

    const summaryResult = await tryClaudeOrGroq(summaryPrompt, 200);

    // -----------------------------------------------------------------------
    // 3. Sentiment analysis (Markets category only)
    // -----------------------------------------------------------------------
    let sentiment: string | null = null;

    if (article.category === "Markets") {
      try {
        const sentimentPrompt = `Classify the market sentiment of this article as exactly one word: bullish, bearish, or neutral.\n\nTitle: ${article.title}\nSummary: ${summaryResult.text}`;

        const sentimentResult = await tryClaudeOrGroq(sentimentPrompt, 10);

        // Extract just the sentiment word
        const sentimentWord = sentimentResult.text.toLowerCase().trim();
        if (["bullish", "bearish", "neutral"].includes(sentimentWord)) {
          sentiment = sentimentWord;
        } else {
          // Try to find the sentiment word in the response
          if (sentimentWord.includes("bullish")) sentiment = "bullish";
          else if (sentimentWord.includes("bearish")) sentiment = "bearish";
          else sentiment = "neutral";
        }

        console.log(`[summarize] Sentiment: ${sentiment} (via ${sentimentResult.model})`);
      } catch (err) {
        console.warn("[summarize] Sentiment analysis failed:", (err as Error).message);
        sentiment = "neutral"; // default to neutral on failure
      }
    }

    // -----------------------------------------------------------------------
    // 4. Save summary and sentiment back to the database
    // -----------------------------------------------------------------------
    const updateData: Record<string, unknown> = {
      summary: summaryResult.text,
    };

    if (sentiment) {
      updateData.sentiment = sentiment;
    }

    const { error: updateError } = await supabase
      .from("articles")
      .update(updateData)
      .eq("id", article_id);

    if (updateError) {
      console.error("[summarize] Failed to save summary:", updateError.message);
      return new Response(
        JSON.stringify({ error: "Failed to save summary" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = {
      success: true,
      article_id,
      model: summaryResult.model,
      fallback: summaryResult.fallback,
      sentiment: sentiment ?? undefined,
      summary_length: summaryResult.text.length,
    };

    console.log("[summarize] Complete:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[summarize] Fatal error:", (err as Error).message);

    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
