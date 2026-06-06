# Insight — Complete Deployment Guide

> **Starting from zero?** This guide walks you through setting up every service from scratch.
> Total time: ~45 minutes. Total cost: **$0** (all free tiers).

---

## Table of Contents

1. [Supabase Setup](#1-supabase-setup)
2. [News API Keys](#2-news-api-keys)
3. [AI API Keys](#3-ai-api-keys)
4. [Deploy Edge Functions](#4-deploy-edge-functions)
5. [Register Cron Jobs](#5-register-cron-jobs)
6. [OneSignal Push Notifications](#6-onesignal-push-notifications)
7. [Resend Email Setup](#7-resend-email-setup)
8. [Connect Frontend to Supabase](#8-connect-frontend-to-supabase)
9. [Keep-Alive Setup](#9-keep-alive-setup)
10. [Environment Variables Checklist](#10-environment-variables-checklist)
11. [Testing & Verification](#11-testing--verification)

---

## 1. Supabase Setup

### Create a Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `insight-news`
   - **Database Password**: Generate a strong one and save it
   - **Region**: Choose closest to you (e.g., `South Asia (Mumbai)` for India)
4. Wait ~2 minutes for provisioning

### Get Your API Keys

1. Go to **Project Settings → API**
2. Copy these values to your `.env` file:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role / secret key** → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ **Never expose the service_role key in frontend code!** It bypasses all RLS.

### Run Database Migrations

1. Go to **SQL Editor** (left sidebar) → **New Query**
2. Run each migration file in order:

   ```
   supabase/migrations/001_initial_schema.sql    ← Tables + RLS
   supabase/migrations/002_api_meta.sql          ← Rate limit tracking
   supabase/migrations/003_alerts_triggered.sql  ← Alert notifications
   ```

3. After deploying edge functions (Step 4), run:
   ```
   supabase/migrations/004_cron_jobs.sql         ← Cron job registration
   ```

### Enable Required Extensions

Go to **Database → Extensions** and enable:
- `uuid-ossp` (should be enabled by default)
- `pg_cron` (for scheduled jobs)
- `pg_net` (for HTTP calls from cron jobs)

---

## 2. News API Keys

### GNews (Primary — 100 requests/day free)

1. Go to [gnews.io](https://gnews.io)
2. Sign up for a free account
3. Go to Dashboard → API Key
4. Copy the key → `GNEWS_API_KEY`

### Currents API (Backup — 600 requests/day free)

1. Go to [currentsapi.services](https://currentsapi.services/en)
2. Sign up for a free account
3. Go to API Token page
4. Copy the token → `CURRENTS_API_KEY`

> 💡 RSS feeds (BBC, TechCrunch, NASA, Reuters) don't need API keys — they're free and unlimited.

---

## 3. AI API Keys

### Groq (Recommended First — Free Unlimited)

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up with Google/GitHub
3. Go to **API Keys → Create API Key**
4. Copy the key → `GROQ_API_KEY`

> ✅ Start with Groq — it's completely free with generous rate limits.

### Anthropic Claude (Optional — Higher Quality)

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up and add billing (you get $5 free credits)
3. Go to **API Keys → Create Key**
4. Copy the key → `ANTHROPIC_API_KEY`

> 💡 The system automatically falls back to Groq if Claude fails or has no credits.

---

## 4. Deploy Edge Functions

### Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# or via npm (works everywhere)
npm install -g supabase
```

### Login and Link Project

```bash
# Login to Supabase
supabase login

# Link to your project (get project ref from Dashboard → Settings → General)
supabase link --project-ref YOUR_PROJECT_REF
```

### Set Edge Function Secrets

```bash
# Set all secrets (edge functions read these at runtime)
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# News APIs
supabase secrets set GNEWS_API_KEY=your-gnews-key
supabase secrets set CURRENTS_API_KEY=your-currents-key

# AI APIs
supabase secrets set GROQ_API_KEY=your-groq-key
supabase secrets set ANTHROPIC_API_KEY=your-anthropic-key

# Notifications (add these when you set up OneSignal/Resend)
supabase secrets set ONESIGNAL_APP_ID=your-onesignal-app-id
supabase secrets set ONESIGNAL_API_KEY=your-onesignal-rest-key
supabase secrets set RESEND_API_KEY=your-resend-key
```

### Deploy All Functions

```bash
# Deploy each edge function
supabase functions deploy fetch-news
supabase functions deploy get-articles
supabase functions deploy summarize-article
supabase functions deploy check-alerts
supabase functions deploy send-notifications
supabase functions deploy send-digest
supabase functions deploy ping
```

Or deploy all at once:

```bash
supabase functions deploy
```

### Test a Function

```bash
# Test ping
curl https://YOUR_PROJECT.supabase.co/functions/v1/ping

# Test fetch-news (requires auth)
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/fetch-news \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"

# Test get-articles
curl "https://YOUR_PROJECT.supabase.co/functions/v1/get-articles?category=Tech&limit=5"
```

---

## 5. Register Cron Jobs

### Option A: Supabase pg_cron (Recommended)

1. Make sure `pg_cron` and `pg_net` extensions are enabled (Step 1)
2. Run `supabase/migrations/004_cron_jobs.sql` in the SQL Editor

**But first**, you need to set the app settings that the cron SQL references:

```sql
-- Run this in SQL Editor BEFORE 004_cron_jobs.sql
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
```

Then run `004_cron_jobs.sql`.

### Option B: cron-job.org (Free Alternative)

If pg_cron doesn't work, use [cron-job.org](https://cron-job.org):

1. Sign up (free — 4 cron jobs)
2. Create these jobs:

| Job | URL | Schedule | Headers |
|-----|-----|----------|---------|
| Fetch News | `https://YOUR_PROJECT.supabase.co/functions/v1/fetch-news` | Every 30 min | `Authorization: Bearer SERVICE_ROLE_KEY` |
| Daily Digest | `https://YOUR_PROJECT.supabase.co/functions/v1/send-digest` | Daily 2:30 AM UTC | `Authorization: Bearer SERVICE_ROLE_KEY` |
| Keep Alive | `https://YOUR_PROJECT.supabase.co/functions/v1/ping` | Every 5 days | None |

---

## 6. OneSignal Push Notifications

### Create OneSignal App

1. Go to [onesignal.com](https://onesignal.com) and sign up (free)
2. Click **"New App/Website"**
3. Name it: `Insight News`
4. Select platform: **Web**
5. Choose integration: **Custom Code**

### Configure Web Push

1. **Site Setup**:
   - Site Name: `Insight`
   - Site URL: `https://your-vercel-url.vercel.app` (or localhost for testing)
   - Auto Resubscribe: ✅ Enabled
   - Default notification icon: Upload a small icon

2. **Permission Prompt**:
   - Choose "Push Slide Prompt"
   - Auto-prompt: After 10 seconds on page

### Get OneSignal Keys

1. Go to **Settings → Keys & IDs**
2. Copy:
   - **OneSignal App ID** → `ONESIGNAL_APP_ID`
   - **REST API Key** → `ONESIGNAL_API_KEY`

### Add OneSignal to Frontend

Add this script tag in your root HTML or `__root.tsx` head:

```html
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
<script>
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
      appId: "YOUR_ONESIGNAL_APP_ID",
    });
  });
</script>
```

---

## 7. Resend Email Setup

1. Go to [resend.com](https://resend.com) and sign up (free — 3000 emails/month)
2. Get your API key from the dashboard → `RESEND_API_KEY`
3. (Optional) Add and verify a custom domain for sending

> 💡 On the free tier, you can only send from `onboarding@resend.dev`. The code is already configured for this.

---

## 8. Connect Frontend to Supabase

The frontend (Lovable/TanStack Start app) only needs two environment variables:

```bash
# In your .env file (or Vercel/Lovable environment settings)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

The `src/lib/supabase.ts` file handles client initialization automatically.

### If deploying on Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Redeploy

### If deploying on Lovable:

1. Go to your Lovable project settings
2. Add the Supabase integration
3. Enter your Supabase URL and anon key

---

## 9. Keep-Alive Setup

Supabase free tier pauses projects after 7 days of inactivity.

1. Go to [cron-job.org](https://cron-job.org) and sign up
2. Create a new cron job:
   - **URL**: `https://YOUR_PROJECT.supabase.co/functions/v1/ping`
   - **Schedule**: Every 5 days
   - **Request method**: GET
3. Save and activate

---

## 10. Environment Variables Checklist

### Supabase Edge Function Secrets
Set via `supabase secrets set KEY=VALUE`:

| Variable | Source | Required |
|----------|--------|----------|
| `SUPABASE_URL` | Supabase Dashboard | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard | ✅ Yes |
| `GNEWS_API_KEY` | gnews.io | ✅ Yes |
| `CURRENTS_API_KEY` | currentsapi.services | ❌ Optional |
| `ANTHROPIC_API_KEY` | console.anthropic.com | ❌ Optional |
| `GROQ_API_KEY` | console.groq.com | ✅ Recommended |
| `ONESIGNAL_APP_ID` | onesignal.com | ❌ Optional |
| `ONESIGNAL_API_KEY` | onesignal.com | ❌ Optional |
| `RESEND_API_KEY` | resend.com | ❌ Optional |

### Frontend Environment (Vercel/Lovable)

| Variable | Source | Required |
|----------|--------|----------|
| `VITE_SUPABASE_URL` | Supabase Dashboard | ✅ Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard | ✅ Yes |

---

## 11. Testing & Verification

### Quick Smoke Test

```bash
# 1. Check ping
curl https://YOUR_PROJECT.supabase.co/functions/v1/ping
# Expected: {"status":"ok","timestamp":"..."}

# 2. Manually trigger a news fetch
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/fetch-news \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
# Expected: {"success":true,"fetched":50,"inserted":48,...}

# 3. Verify articles were stored
curl "https://YOUR_PROJECT.supabase.co/functions/v1/get-articles?limit=5"
# Expected: {"articles":[...],"pagination":{...}}

# 4. Check the Supabase Table Editor
# Go to Dashboard → Table Editor → articles
# You should see rows with titles, categories, sources
```

### Verify Cron Jobs

1. Go to Supabase Dashboard → **SQL Editor**
2. Run: `SELECT * FROM cron.job;`
3. You should see `fetch-news-every-30min` and `send-daily-digest`

### Verify Edge Function Logs

1. Go to Supabase Dashboard → **Edge Functions**
2. Click on any function → **Logs**
3. You should see console.log output from each function execution

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CRON (every 30 min)                       │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │   fetch-news       │                        │
│                    │  (GNews + RSS)     │                        │
│                    └──────┬──┬──────────┘                        │
│                           │  │                                   │
│              ┌────────────┘  └────────────┐                     │
│              │                            │                      │
│    ┌─────────▼─────────┐     ┌───────────▼──────────┐          │
│    │ summarize-article  │     │   check-alerts        │          │
│    │ (Claude / Groq)    │     │   (keyword match)     │          │
│    └─────────┬──────────┘     └───────────┬──────────┘          │
│              │                            │                      │
│              ▼                 ┌──────────▼──────────┐          │
│     articles.summary           │ send-notifications   │          │
│     articles.sentiment         │ (OneSignal push)     │          │
│                                └─────────────────────┘          │
│                                                                  │
│    ┌────────────────────┐     ┌────────────────────┐            │
│    │  send-digest        │     │      ping            │           │
│    │  (8 AM IST daily)   │     │  (every 5 days)      │           │
│    │  via Resend email   │     │  keep-alive           │           │
│    └────────────────────┘     └────────────────────┘            │
│                                                                  │
│                     ┌──────────────────┐                        │
│                     │   get-articles    │◄── Frontend reads      │
│                     │   (public API)    │    from here            │
│                     └──────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Free Tier Limits Reference

| Service | Free Tier | Our Usage |
|---------|-----------|-----------|
| Supabase | 500 MB DB, 2 GB bandwidth, 500K edge invocations | Well within limits |
| GNews | 100 requests/day | ~48/day (every 30 min) |
| Currents | 600 requests/day | ~48/day (backup only) |
| Groq | Unlimited (rate limited) | ~50-100 calls/day |
| Anthropic | $5 free credit | Optional |
| OneSignal | 10K subscribers, unlimited notifications | Personal use |
| Resend | 3000 emails/month | 30/month (daily digest) |
| cron-job.org | 4 free cron jobs | 3 jobs |
