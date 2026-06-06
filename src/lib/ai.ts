// ============================================================================
// Insight — AI Helper: Claude / Groq Fallback
// Tries Claude Sonnet first for quality. Falls back to Groq (free unlimited)
// if Claude fails, times out, or returns an error.
//
// Usage:
//   const result = await tryClaudeOrGroq("Summarize this article: ...");
//   console.log(result.text, result.model);
// ============================================================================

/** Result from an AI completion call */
export interface AIResult {
  text: string;
  model: string; // which model actually produced the result
  fallback: boolean; // true if Groq was used as fallback
}

// ============================================================================
// Claude Sonnet (Primary)
// ============================================================================

/**
 * Calls Claude Sonnet via the Anthropic Messages API.
 *
 * @param prompt  - The user message to send
 * @param apiKey  - Anthropic API key
 * @param maxTokens - Max tokens in response (default 300, keep low for cost)
 * @returns The text response
 * @throws Error if the API call fails
 */
async function callClaude(
  prompt: string,
  apiKey: string,
  maxTokens: number = 300,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

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
      const errorBody = await response.text();
      throw new Error(`Claude API ${response.status}: ${errorBody}`);
    }

    const data = await response.json();

    // Extract text from the response content blocks
    const textBlock = data.content?.find(
      (block: { type: string; text?: string }) => block.type === "text",
    );

    if (!textBlock?.text) {
      throw new Error("Claude returned no text content");
    }

    return textBlock.text;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// Groq (Free Fallback)
// ============================================================================

/**
 * Calls Groq's chat completion API with Llama 3 8B.
 * Groq offers free unlimited API access — perfect as a fallback.
 *
 * @param prompt  - The user message to send
 * @param apiKey  - Groq API key
 * @param maxTokens - Max tokens in response (default 300)
 * @returns The text response
 * @throws Error if the API call fails
 */
async function callGroq(prompt: string, apiKey: string, maxTokens: number = 300): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

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
        temperature: 0.3, // low temp for factual summaries
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Groq API ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("Groq returned no text content");
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// Primary export: tryClaudeOrGroq
// ============================================================================

/**
 * Tries to get an AI completion, with automatic fallback.
 *
 * Strategy:
 *   1. Try Claude Sonnet first (best quality)
 *   2. If Claude fails (error, timeout, no API key), try Groq (free)
 *   3. If both fail, throws an error
 *
 * @param prompt    - The prompt to send
 * @param maxTokens - Max tokens for the response (default 300)
 * @returns AIResult with the text, model used, and whether it was a fallback
 */
export async function tryClaudeOrGroq(prompt: string, maxTokens: number = 300): Promise<AIResult> {
  const claudeKey = Deno.env.get("ANTHROPIC_API_KEY");
  const groqKey = Deno.env.get("GROQ_API_KEY");

  // --- Attempt 1: Claude Sonnet ---
  if (claudeKey) {
    try {
      console.log("[ai] Attempting Claude Sonnet...");
      const text = await callClaude(prompt, claudeKey, maxTokens);
      console.log("[ai] ✓ Claude succeeded");
      return { text, model: "claude-sonnet-4-6", fallback: false };
    } catch (err) {
      console.warn("[ai] Claude failed:", (err as Error).message);
      // Fall through to Groq
    }
  } else {
    console.log("[ai] No ANTHROPIC_API_KEY — skipping Claude");
  }

  // --- Attempt 2: Groq (free fallback) ---
  if (groqKey) {
    try {
      console.log("[ai] Falling back to Groq (llama3-8b)...");
      const text = await callGroq(prompt, groqKey, maxTokens);
      console.log("[ai] ✓ Groq succeeded (fallback)");
      return { text, model: "llama3-8b-8192", fallback: true };
    } catch (err) {
      console.error("[ai] Groq also failed:", (err as Error).message);
      throw new Error(
        `Both AI providers failed. Claude: ${claudeKey ? "error" : "no key"}. Groq: ${(err as Error).message}`,
      );
    }
  }

  throw new Error("No AI API keys configured. Set ANTHROPIC_API_KEY or GROQ_API_KEY.");
}
