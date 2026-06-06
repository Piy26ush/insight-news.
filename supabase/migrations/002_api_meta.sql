-- ============================================================================
-- Insight — Phase 2: API Call Tracking for Rate Limit Management
-- Run this in Supabase SQL Editor AFTER 001_initial_schema.sql
-- ============================================================================

-- ============================================================================
-- API_CALL_LOG TABLE
-- Tracks how many API calls we've made to each news source per day.
-- The fetch-news edge function checks this before calling paid APIs
-- to avoid exceeding free tier limits.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.api_call_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source          TEXT NOT NULL,              -- 'gnews' | 'currents' | 'rss'
  call_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count      INTEGER NOT NULL DEFAULT 0,
  last_called_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source, call_date)                  -- one row per source per day
);

-- No RLS needed — this table is only accessed by edge functions via service_role key
ALTER TABLE public.api_call_log ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (edge functions use service_role key)
CREATE POLICY "api_call_log_service_all"
  ON public.api_call_log FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Helper function: increment API call counter and return current count
-- Usage from edge function: SELECT increment_api_calls('gnews')
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_api_calls(p_source TEXT)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Upsert: insert if no row for today, otherwise increment
  INSERT INTO public.api_call_log (source, call_date, call_count, last_called_at)
  VALUES (p_source, CURRENT_DATE, 1, now())
  ON CONFLICT (source, call_date)
  DO UPDATE SET
    call_count = api_call_log.call_count + 1,
    last_called_at = now()
  RETURNING call_count INTO current_count;

  RETURN current_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Helper function: get today's call count for a source
-- Usage: SELECT get_api_call_count('gnews')
-- Returns 0 if no calls have been made today
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_api_call_count(p_source TEXT)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT call_count INTO current_count
  FROM public.api_call_log
  WHERE source = p_source AND call_date = CURRENT_DATE;

  RETURN COALESCE(current_count, 0);
END;
$$ LANGUAGE plpgsql;
