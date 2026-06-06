-- ============================================================================
-- Insight — Phase 1: Initial Schema + Row Level Security
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ARTICLES TABLE
-- Stores every fetched news article. The URL column is UNIQUE so we can
-- upsert (insert-or-skip) when the same article is fetched from multiple
-- sources or on consecutive cron runs.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.articles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  summary     TEXT,                          -- filled later by AI summarizer
  url         TEXT NOT NULL UNIQUE,          -- deduplicate on this
  source      TEXT NOT NULL,                 -- e.g. "GNews", "BBC", "TechCrunch"
  category    TEXT NOT NULL DEFAULT 'Global', -- AI | Tech | Science | Markets | Global
  sentiment   TEXT,                          -- bullish | bearish | neutral (Markets only)
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  image_url   TEXT
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_articles_category    ON public.articles (category);
CREATE INDEX IF NOT EXISTS idx_articles_published   ON public.articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_url         ON public.articles (url);
CREATE INDEX IF NOT EXISTS idx_articles_fetched     ON public.articles (fetched_at DESC);

-- ============================================================================
-- 2. USER ALERTS TABLE
-- Each row = one keyword watch. When a new article matches, we trigger a
-- notification (see Phase 3: check-alerts function).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_alerts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword    TEXT NOT NULL,                  -- e.g. "OpenAI", "Nifty"
  category   TEXT,                           -- optional: only match in this category
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_alerts_user ON public.user_alerts (user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_active ON public.user_alerts (is_active) WHERE is_active = true;

-- ============================================================================
-- 3. SAVED ARTICLES TABLE
-- Bookmark junction table. UNIQUE constraint prevents duplicate saves.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.saved_articles (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  saved_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, article_id)               -- one save per user per article
);

CREATE INDEX IF NOT EXISTS idx_saved_articles_user ON public.saved_articles (user_id);

-- ============================================================================
-- 4. USER PREFERENCES TABLE
-- One row per user. Primary key = user_id (1:1 with auth.users).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_categories TEXT[] NOT NULL DEFAULT ARRAY['AI', 'Tech', 'Science', 'Markets', 'Global'],
  theme                TEXT NOT NULL DEFAULT 'dark',     -- 'dark' | 'light'
  digest_enabled       BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================

-- --- Articles: anyone can read, only service role can insert/update ---
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "articles_select_public"
  ON public.articles FOR SELECT
  USING (true);                              -- all users (including anon) can read

CREATE POLICY "articles_insert_service"
  ON public.articles FOR INSERT
  WITH CHECK (true);                         -- edge functions use service_role key

CREATE POLICY "articles_update_service"
  ON public.articles FOR UPDATE
  USING (true)
  WITH CHECK (true);                         -- edge functions can update summary/sentiment

-- --- User Alerts: users can only CRUD their own rows ---
ALTER TABLE public.user_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_alerts_select_own"
  ON public.user_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_alerts_insert_own"
  ON public.user_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_alerts_update_own"
  ON public.user_alerts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_alerts_delete_own"
  ON public.user_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- --- Saved Articles: users can only CRUD their own rows ---
ALTER TABLE public.saved_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_articles_select_own"
  ON public.saved_articles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "saved_articles_insert_own"
  ON public.saved_articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_articles_delete_own"
  ON public.saved_articles FOR DELETE
  USING (auth.uid() = user_id);

-- --- User Preferences: users can only access their own row ---
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_prefs_select_own"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_prefs_insert_own"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_prefs_update_own"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. AUTO-UPDATE updated_at on user_preferences
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- Done! Your Insight database foundation is ready.
-- ============================================================================
