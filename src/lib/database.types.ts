// ============================================================================
// Insight — Database TypeScript Types
// These types mirror the Supabase schema defined in 001_initial_schema.sql.
// In production, you'd auto-generate these with `supabase gen types typescript`.
// ============================================================================

/** Article importance / sentiment categories */
export type ArticleCategory = "AI" | "Tech" | "Science" | "Markets" | "Global";
export type ArticleSentiment = "bullish" | "bearish" | "neutral";
export type ThemePreference = "dark" | "light";

// ============================================================================
// Row types — what you get back from a SELECT query
// ============================================================================

/** A single news article as stored in the `articles` table */
export interface Article {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  source: string;
  category: ArticleCategory;
  sentiment: ArticleSentiment | null;
  published_at: string;       // ISO 8601 timestamptz
  fetched_at: string;         // ISO 8601 timestamptz
  image_url: string | null;
}

/** A keyword alert configured by a user */
export interface UserAlert {
  id: string;
  user_id: string;
  keyword: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

/** A bookmarked article */
export interface SavedArticle {
  id: string;
  user_id: string;
  article_id: string;
  saved_at: string;
}

/** User personalization preferences (1:1 with auth.users) */
export interface UserPreferences {
  user_id: string;
  preferred_categories: ArticleCategory[];
  theme: ThemePreference;
  digest_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/** A triggered alert notification (created in Phase 3 migration) */
export interface AlertTriggered {
  id: string;
  user_id: string;
  article_id: string;
  keyword: string;
  triggered_at: string;
  notified_at: string | null;
}

/** API call tracking for rate-limit management (created in Phase 2 migration) */
export interface ApiCallLog {
  id: string;
  source: string;
  call_date: string;           // DATE as string (YYYY-MM-DD)
  call_count: number;
  last_called_at: string;
}

// ============================================================================
// Insert types — what you pass to an INSERT query (omit auto-generated fields)
// ============================================================================

export type ArticleInsert = Omit<Article, "id" | "fetched_at"> & {
  id?: string;
  fetched_at?: string;
};

export type UserAlertInsert = Omit<UserAlert, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type SavedArticleInsert = Omit<SavedArticle, "id" | "saved_at"> & {
  id?: string;
  saved_at?: string;
};

export type UserPreferencesInsert = Omit<UserPreferences, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};

export type AlertTriggeredInsert = Omit<AlertTriggered, "id" | "triggered_at" | "notified_at"> & {
  id?: string;
  triggered_at?: string;
  notified_at?: string | null;
};

// ============================================================================
// Supabase Database type map — used by createClient<Database>()
// ============================================================================

export interface Database {
  public: {
    Tables: {
      articles: {
        Row: Article;
        Insert: ArticleInsert;
        Update: Partial<ArticleInsert>;
      };
      user_alerts: {
        Row: UserAlert;
        Insert: UserAlertInsert;
        Update: Partial<UserAlertInsert>;
      };
      saved_articles: {
        Row: SavedArticle;
        Insert: SavedArticleInsert;
        Update: Partial<SavedArticleInsert>;
      };
      user_preferences: {
        Row: UserPreferences;
        Insert: UserPreferencesInsert;
        Update: Partial<UserPreferencesInsert>;
      };
      alerts_triggered: {
        Row: AlertTriggered;
        Insert: AlertTriggeredInsert;
        Update: Partial<AlertTriggeredInsert>;
      };
      api_call_log: {
        Row: ApiCallLog;
        Insert: Omit<ApiCallLog, "id"> & { id?: string };
        Update: Partial<Omit<ApiCallLog, "id">>;
      };
    };
  };
}
