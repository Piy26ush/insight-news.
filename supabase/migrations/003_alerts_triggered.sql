-- ============================================================================
-- Insight — Phase 3: Alerts Triggered Table
-- Stores matched keyword alerts that need to be sent as notifications.
-- Run this in Supabase SQL Editor AFTER 001 and 002 migrations.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.alerts_triggered (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id   UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  keyword      TEXT NOT NULL,                -- the keyword that matched
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at  TIMESTAMPTZ,                 -- NULL until push notification sent
  UNIQUE(user_id, article_id, keyword)      -- prevent duplicate alerts for same match
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_alerts_triggered_user    ON public.alerts_triggered (user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered_pending ON public.alerts_triggered (notified_at) WHERE notified_at IS NULL;

-- RLS: users can read their own alerts, service role can insert/update
ALTER TABLE public.alerts_triggered ENABLE ROW LEVEL SECURITY;

-- Users can see their own triggered alerts
CREATE POLICY "alerts_triggered_select_own"
  ON public.alerts_triggered FOR SELECT
  USING (auth.uid() = user_id);

-- Edge functions (service_role) can insert alerts
CREATE POLICY "alerts_triggered_insert_service"
  ON public.alerts_triggered FOR INSERT
  WITH CHECK (true);

-- Edge functions (service_role) can update notified_at
CREATE POLICY "alerts_triggered_update_service"
  ON public.alerts_triggered FOR UPDATE
  USING (true)
  WITH CHECK (true);
