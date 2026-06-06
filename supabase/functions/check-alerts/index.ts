// ============================================================================
// Insight — Edge Function: check-alerts
// Matches new articles against user keyword alerts.
// If a match is found, inserts a row into alerts_triggered.
//
// Triggered by fetch-news after each news cycle.
// Designed to chain into send-notifications (Phase 4).
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    console.log("[check-alerts] Starting keyword alert matching...");

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // -----------------------------------------------------------------------
    // 1. Fetch all active keyword alerts
    // -----------------------------------------------------------------------
    const { data: alerts, error: alertsError } = await supabase
      .from("user_alerts")
      .select("*")
      .eq("is_active", true);

    if (alertsError) {
      console.error("[check-alerts] Failed to fetch alerts:", alertsError.message);
      return new Response(JSON.stringify({ error: "Failed to fetch alerts" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!alerts || alerts.length === 0) {
      console.log("[check-alerts] No active alerts configured");
      return new Response(
        JSON.stringify({ success: true, matches: 0, reason: "no active alerts" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    console.log(`[check-alerts] Found ${alerts.length} active alerts`);

    // -----------------------------------------------------------------------
    // 2. Fetch recent articles (last 60 minutes — covers the fetch-news cycle)
    // -----------------------------------------------------------------------
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: recentArticles, error: articlesError } = await supabase
      .from("articles")
      .select("id, title, summary, category")
      .gte("fetched_at", oneHourAgo);

    if (articlesError) {
      console.error("[check-alerts] Failed to fetch articles:", articlesError.message);
      return new Response(JSON.stringify({ error: "Failed to fetch recent articles" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!recentArticles || recentArticles.length === 0) {
      console.log("[check-alerts] No recent articles to check");
      return new Response(
        JSON.stringify({ success: true, matches: 0, reason: "no recent articles" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    console.log(
      `[check-alerts] Checking ${recentArticles.length} recent articles against ${alerts.length} alerts`,
    );

    // -----------------------------------------------------------------------
    // 3. Match keywords against article titles and summaries
    // -----------------------------------------------------------------------
    interface AlertMatch {
      user_id: string;
      article_id: string;
      keyword: string;
    }

    const matches: AlertMatch[] = [];

    for (const alert of alerts) {
      const keyword = alert.keyword.toLowerCase();

      for (const article of recentArticles) {
        // If the alert has a category filter, skip non-matching categories
        if (alert.category && article.category !== alert.category) {
          continue;
        }

        // Case-insensitive keyword search in title and summary
        const title = (article.title ?? "").toLowerCase();
        const summary = (article.summary ?? "").toLowerCase();

        if (title.includes(keyword) || summary.includes(keyword)) {
          matches.push({
            user_id: alert.user_id,
            article_id: article.id,
            keyword: alert.keyword, // store original casing
          });
        }
      }
    }

    console.log(`[check-alerts] Found ${matches.length} keyword matches`);

    // -----------------------------------------------------------------------
    // 4. Insert matches into alerts_triggered table (dedup via UNIQUE constraint)
    // -----------------------------------------------------------------------
    let insertedCount = 0;

    if (matches.length > 0) {
      // Insert one by one to handle unique constraint violations gracefully
      for (const match of matches) {
        const { error: insertError } = await supabase.from("alerts_triggered").upsert(
          {
            user_id: match.user_id,
            article_id: match.article_id,
            keyword: match.keyword,
          },
          {
            onConflict: "user_id,article_id,keyword",
            ignoreDuplicates: true,
          },
        );

        if (!insertError) {
          insertedCount++;
        }
      }
    }

    // -----------------------------------------------------------------------
    // 5. Chain: trigger send-notifications for new pending alerts
    // -----------------------------------------------------------------------
    if (insertedCount > 0) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-notifications`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ source: "check-alerts" }),
        });
        console.log("[check-alerts] Triggered send-notifications");
      } catch (err) {
        console.warn("[check-alerts] Failed to trigger notifications:", (err as Error).message);
      }
    }

    const result = {
      success: true,
      alerts_checked: alerts.length,
      articles_checked: recentArticles.length,
      matches_found: matches.length,
      inserted: insertedCount,
    };

    console.log("[check-alerts] Complete:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[check-alerts] Fatal error:", (err as Error).message);

    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
