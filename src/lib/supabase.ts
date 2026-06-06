// ============================================================================
// Insight — Supabase Client Setup & Helper Functions
// This is the main interface between the frontend and Supabase.
// ============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { FeedItem } from "./mock-data";
import type {
  Database,
  Article,
  ArticleCategory,
  SavedArticle,
  UserAlert,
  UserAlertInsert,
  UserPreferences,
  UserPreferencesInsert,
} from "./database.types";

// ============================================================================
// Client Initialization
// ============================================================================

/**
 * Creates a Supabase client for browser/frontend usage.
 * Uses the anon key — all queries are subject to RLS policies.
 * The VITE_ prefix makes these available in the browser bundle.
 */
export function createSupabaseClient(): SupabaseClient<Database> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. " +
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

/**
 * Creates a Supabase admin client for server-side / edge function usage.
 * Uses the service_role key — BYPASSES all RLS policies.
 * NEVER expose this client to the browser.
 */
export function createSupabaseAdmin(): SupabaseClient<Database> {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!url || !key) {
    throw new Error(
      "Missing Supabase admin environment variables. " +
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your edge function secrets."
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Singleton client instance for frontend use */
let _client: SupabaseClient<Database> | null = null;

/**
 * Returns a singleton Supabase client for the frontend.
 * Call this instead of createSupabaseClient() in components.
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!_client) {
    _client = createSupabaseClient();
  }
  return _client;
}

// ============================================================================
// Article Helpers
// ============================================================================

/**
 * Fetches articles from the database, optionally filtered by category.
 * Results are sorted by published_at descending (newest first).
 *
 * @param category - Optional category filter (AI, Tech, Science, Markets, Global)
 * @param limit    - Max number of articles to return (default: 20)
 * @param offset   - Pagination offset (default: 0)
 * @returns Array of Article objects
 */
export async function getArticles(
  category?: ArticleCategory,
  limit: number = 20,
  offset: number = 0
): Promise<Article[]> {
  const supabase = getSupabase();

  let query = supabase
    .from("articles")
    .select("*")
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply category filter if specified
  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getArticles] Error fetching articles:", error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Fetches a single article by its ID.
 *
 * @param articleId - UUID of the article
 * @returns The Article or null if not found
 */
export async function getArticleById(articleId: string): Promise<Article | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", articleId)
    .single();

  if (error) {
    console.error("[getArticleById] Error:", error.message);
    return null;
  }

  return data;
}

// ============================================================================
// Saved Articles Helpers
// ============================================================================

/**
 * Saves (bookmarks) an article for the current user.
 * Uses upsert to silently handle duplicate saves.
 *
 * @param userId    - UUID of the authenticated user
 * @param articleId - UUID of the article to save
 * @returns The SavedArticle row, or null on error
 */
export async function saveArticle(
  userId: string,
  articleId: string
): Promise<SavedArticle | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("saved_articles")
    .upsert(
      { user_id: userId, article_id: articleId },
      { onConflict: "user_id,article_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("[saveArticle] Error saving article:", error.message);
    return null;
  }

  return data;
}

/**
 * Removes a saved article bookmark.
 *
 * @param userId    - UUID of the authenticated user
 * @param articleId - UUID of the article to unsave
 * @returns true if deleted, false on error
 */
export async function unsaveArticle(
  userId: string,
  articleId: string
): Promise<boolean> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("saved_articles")
    .delete()
    .eq("user_id", userId)
    .eq("article_id", articleId);

  if (error) {
    console.error("[unsaveArticle] Error:", error.message);
    return false;
  }

  return true;
}

/**
 * Fetches all articles saved by the current user, with full article data.
 *
 * @param userId - UUID of the authenticated user
 * @returns Array of SavedArticle rows (join with articles for full data)
 */
export async function getSavedArticles(userId: string): Promise<SavedArticle[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("saved_articles")
    .select("*")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false });

  if (error) {
    console.error("[getSavedArticles] Error:", error.message);
    return [];
  }

  return data ?? [];
}

// ============================================================================
// User Alerts Helpers
// ============================================================================

/**
 * Fetches all keyword alerts for a user.
 *
 * @param userId - UUID of the authenticated user
 * @returns Array of UserAlert objects
 */
export async function getUserAlerts(userId: string): Promise<UserAlert[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("user_alerts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getUserAlerts] Error:", error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Creates a new keyword alert for a user.
 *
 * @param alert - The alert to create (user_id, keyword, category)
 * @returns The created UserAlert or null on error
 */
export async function createAlert(
  alert: UserAlertInsert
): Promise<UserAlert | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("user_alerts")
    .insert(alert)
    .select()
    .single();

  if (error) {
    console.error("[createAlert] Error:", error.message);
    return null;
  }

  return data;
}

/**
 * Toggles an alert's is_active status.
 *
 * @param alertId  - UUID of the alert
 * @param isActive - New active status
 * @returns true if updated, false on error
 */
export async function toggleAlert(
  alertId: string,
  isActive: boolean
): Promise<boolean> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("user_alerts")
    .update({ is_active: isActive })
    .eq("id", alertId);

  if (error) {
    console.error("[toggleAlert] Error:", error.message);
    return false;
  }

  return true;
}

/**
 * Deletes a keyword alert.
 *
 * @param alertId - UUID of the alert to delete
 * @returns true if deleted, false on error
 */
export async function deleteAlert(alertId: string): Promise<boolean> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("user_alerts")
    .delete()
    .eq("id", alertId);

  if (error) {
    console.error("[deleteAlert] Error:", error.message);
    return false;
  }

  return true;
}

// ============================================================================
// User Preferences Helpers
// ============================================================================

/**
 * Fetches the preferences for a user. Returns null if no preferences are set.
 *
 * @param userId - UUID of the authenticated user
 * @returns UserPreferences or null
 */
export async function getUserPreferences(
  userId: string
): Promise<UserPreferences | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    // PGRST116 = no rows found — that's fine, user just hasn't set prefs yet
    if (error.code !== "PGRST116") {
      console.error("[getUserPreferences] Error:", error.message);
    }
    return null;
  }

  return data;
}

/**
 * Creates or updates user preferences (upsert on user_id PK).
 *
 * @param prefs - The preferences to save
 * @returns The saved UserPreferences or null on error
 */
export async function upsertUserPreferences(
  prefs: UserPreferencesInsert
): Promise<UserPreferences | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(prefs, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    console.error("[upsertUserPreferences] Error:", error.message);
    return null;
  }

  return data;
}

/**
 * Maps a database Article to a frontend FeedItem.
 */
export function mapArticleToFeedItem(article: Article): FeedItem {
  // Simple relative time formatting
  const published = new Date(article.published_at);
  const diffMs = Date.now() - published.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let timeStr = "Just now";
  if (diffDays > 0) {
    timeStr = `${diffDays}d ago`;
  } else if (diffHours > 0) {
    timeStr = `${diffHours}h ago`;
  } else if (diffMins > 0) {
    timeStr = `${diffMins}m ago`;
  }

  // Derive importance score based on title length
  let score = Math.floor(Math.sin(article.title.length) * 30) + 60;
  if (score < 0) score = Math.abs(score);
  if (score > 100) score = 100;
  if (score < 30) score = 30;

  let importance: "critical" | "high" | "medium" | "low" = "medium";
  if (score > 85) importance = "critical";
  else if (score > 70) importance = "high";
  else if (score < 45) importance = "low";

  return {
    id: article.id,
    category: article.category,
    headline: article.title,
    source: article.source,
    time: timeStr,
    summary: article.summary || "No summary available.",
    importance,
    score,
  };
}

