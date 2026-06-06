// ============================================================================
// Insight — Edge Function: send-notifications
// Reads unprocessed rows from alerts_triggered (notified_at IS NULL),
// sends push notifications via OneSignal REST API, and marks as notified.
//
// Chained from check-alerts after keyword matches are found.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    console.log("[send-notifications] Starting notification dispatch...");

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // OneSignal credentials
    const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
    const oneSignalApiKey = Deno.env.get("ONESIGNAL_API_KEY");

    if (!oneSignalAppId || !oneSignalApiKey) {
      console.log("[send-notifications] OneSignal not configured — skipping push notifications");
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "OneSignal not configured" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // -----------------------------------------------------------------------
    // 1. Fetch pending (unnotified) alerts with article details
    // -----------------------------------------------------------------------
    const { data: pendingAlerts, error: fetchError } = await supabase
      .from("alerts_triggered")
      .select(
        `
        id,
        user_id,
        article_id,
        keyword,
        triggered_at
      `,
      )
      .is("notified_at", null)
      .order("triggered_at", { ascending: true })
      .limit(50); // Process max 50 at a time

    if (fetchError) {
      console.error("[send-notifications] Failed to fetch pending alerts:", fetchError.message);
      return new Response(JSON.stringify({ error: "Failed to fetch pending alerts" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!pendingAlerts || pendingAlerts.length === 0) {
      console.log("[send-notifications] No pending notifications");
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`[send-notifications] Processing ${pendingAlerts.length} pending alerts`);

    let sentCount = 0;
    let errorCount = 0;

    // -----------------------------------------------------------------------
    // 2. For each pending alert, fetch article and send notification
    // -----------------------------------------------------------------------
    for (const alert of pendingAlerts) {
      try {
        // Fetch the matching article
        const { data: article } = await supabase
          .from("articles")
          .select("title, url")
          .eq("id", alert.article_id)
          .single();

        if (!article) {
          console.warn(`[send-notifications] Article ${alert.article_id} not found, skipping`);
          continue;
        }

        // Truncate title to 100 characters for the notification body
        const body =
          article.title.length > 100 ? article.title.substring(0, 97) + "..." : article.title;

        // -----------------------------------------------------------------------
        // 3. Send push notification via OneSignal REST API
        // -----------------------------------------------------------------------
        const notificationPayload = {
          app_id: oneSignalAppId,
          // Send to all subscribed users (for a personal project, this is fine)
          // For multi-user: use "include_external_user_ids" with alert.user_id
          included_segments: ["Subscribed Users"],
          headings: { en: `Insight Alert: ${alert.keyword}` },
          contents: { en: body },
          url: article.url,
          // Chrome web push settings
          chrome_web_badge: "https://insight-news.vercel.app/favicon.ico",
        };

        const notifResponse = await fetch("https://onesignal.com/api/v1/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${oneSignalApiKey}`,
          },
          body: JSON.stringify(notificationPayload),
        });

        if (!notifResponse.ok) {
          const errorBody = await notifResponse.text();
          console.error(`[send-notifications] OneSignal error: ${errorBody}`);
          errorCount++;
          continue;
        }

        const notifResult = await notifResponse.json();
        console.log(
          `[send-notifications] Sent notification ${notifResult.id} for keyword "${alert.keyword}"`,
        );

        // -----------------------------------------------------------------------
        // 4. Mark alert as notified
        // -----------------------------------------------------------------------
        const { error: updateError } = await supabase
          .from("alerts_triggered")
          .update({ notified_at: new Date().toISOString() })
          .eq("id", alert.id);

        if (updateError) {
          console.error(`[send-notifications] Failed to mark as notified:`, updateError.message);
        } else {
          sentCount++;
        }
      } catch (err) {
        console.error(
          `[send-notifications] Error processing alert ${alert.id}:`,
          (err as Error).message,
        );
        errorCount++;
      }
    }

    const result = {
      success: true,
      total_pending: pendingAlerts.length,
      sent: sentCount,
      errors: errorCount,
    };

    console.log("[send-notifications] Complete:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-notifications] Fatal error:", (err as Error).message);

    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
