-- ============================================================================
-- Insight — Phase 4: Cron Job Registration
-- Run this AFTER all edge functions are deployed.
--
-- IMPORTANT: pg_cron must be enabled in your Supabase project first.
-- Go to Dashboard → Database → Extensions → search "pg_cron" → Enable
-- ============================================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- ============================================================================
-- 1. NEWS FETCH — Every 1 minute
-- Calls the fetch-news edge function which handles:
--   - Fetching from GNews + RSS + Currents
--   - Deduplication and storage
--   - Chaining to summarize-article and check-alerts
-- ============================================================================
SELECT cron.schedule(
  'fetch-news-every-1min',
  '* * * * *',    -- every 1 minute
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/fetch-news',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ============================================================================
-- 2. DAILY DIGEST — Every day at 8:00 AM IST (2:30 AM UTC)
-- Sends a summary email of the day's top articles.
-- ============================================================================
SELECT cron.schedule(
  'send-daily-digest',
  '30 2 * * *',      -- 2:30 AM UTC = 8:00 AM IST
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-digest',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ============================================================================
-- NOTE: The pg_net extension is required for HTTP calls from pg_cron.
-- It should be enabled by default on Supabase, but if the cron jobs
-- fail with "function net.http_post does not exist", enable it:
--
--   CREATE EXTENSION IF NOT EXISTS pg_net;
--
-- ============================================================================

-- ============================================================================
-- ALTERNATIVE: If pg_net is not available, you can use a simpler approach
-- by calling edge functions from an external cron service like cron-job.org.
-- In that case, skip the SELECT cron.schedule calls above and instead
-- register these URLs on cron-job.org:
--
--   1. https://YOUR_PROJECT.supabase.co/functions/v1/fetch-news
--      Schedule: every 30 minutes
--      Headers: Authorization: Bearer YOUR_SERVICE_ROLE_KEY
--
--   2. https://YOUR_PROJECT.supabase.co/functions/v1/send-digest
--      Schedule: daily at 2:30 AM UTC
--      Headers: Authorization: Bearer YOUR_SERVICE_ROLE_KEY
--
--   3. https://YOUR_PROJECT.supabase.co/functions/v1/ping
--      Schedule: every 5 days
--      No auth needed
-- ============================================================================
