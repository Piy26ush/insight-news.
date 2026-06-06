// ============================================================================
// Insight — Edge Function: send-digest
// Sends a daily email digest with the top 5 articles (one per category)
// from the last 24 hours. Runs at 8:00 AM IST via pg_cron.
//
// Uses Resend API (free tier: 3000 emails/month).
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    console.log("[send-digest] Starting daily digest generation...");

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.log("[send-digest] RESEND_API_KEY not set — skipping digest email");
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "Resend not configured" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // -----------------------------------------------------------------------
    // 1. Fetch users who have digest enabled
    // -----------------------------------------------------------------------
    const { data: users, error: usersError } = await supabase
      .from("user_preferences")
      .select("user_id")
      .eq("digest_enabled", true);

    if (usersError) {
      console.error("[send-digest] Failed to fetch users:", usersError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch users" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!users || users.length === 0) {
      console.log("[send-digest] No users with digest enabled");
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "no users with digest enabled" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // -----------------------------------------------------------------------
    // 2. Fetch top articles from the last 24 hours (one per category)
    // -----------------------------------------------------------------------
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const categories = ["AI", "Tech", "Science", "Markets", "Global"];
    const topArticles: Array<{ title: string; summary: string | null; url: string; category: string }> = [];

    for (const category of categories) {
      const { data: articles } = await supabase
        .from("articles")
        .select("title, summary, url, category")
        .eq("category", category)
        .gte("published_at", yesterday)
        .order("published_at", { ascending: false })
        .limit(1);

      if (articles && articles.length > 0) {
        topArticles.push(articles[0]);
      }
    }

    if (topArticles.length === 0) {
      console.log("[send-digest] No articles from the last 24 hours");
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "no recent articles" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-digest] Found ${topArticles.length} top articles for digest`);

    // -----------------------------------------------------------------------
    // 3. Format the digest email (plain text)
    // -----------------------------------------------------------------------
    const today = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let emailBody = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    emailBody += `INSIGHT DAILY DIGEST — ${today}\n`;
    emailBody += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    emailBody += `Your top stories from the last 24 hours:\n\n`;

    for (let i = 0; i < topArticles.length; i++) {
      const article = topArticles[i];
      emailBody += `${i + 1}. [${article.category}] ${article.title}\n`;
      if (article.summary) {
        emailBody += `   ${article.summary.substring(0, 150)}...\n`;
      }
      emailBody += `   🔗 ${article.url}\n\n`;
    }

    emailBody += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    emailBody += `Sent by Insight Intelligence Terminal\n`;
    emailBody += `Manage your digest: [your-app-url]/settings\n`;

    // -----------------------------------------------------------------------
    // 4. Send email via Resend API to each user
    // -----------------------------------------------------------------------
    let sentCount = 0;

    for (const user of users) {
      try {
        // Get user email from auth.users
        const { data: authUser } = await supabase.auth.admin.getUserById(user.user_id);

        if (!authUser?.user?.email) {
          console.warn(`[send-digest] No email for user ${user.user_id}`);
          continue;
        }

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Insight <onboarding@resend.dev>",  // Resend's free tier sender
            to: [authUser.user.email],
            subject: `Insight Daily Digest — ${today}`,
            text: emailBody,
          }),
        });

        if (response.ok) {
          sentCount++;
          console.log(`[send-digest] Sent digest to ${authUser.user.email}`);
        } else {
          const errorBody = await response.text();
          console.error(`[send-digest] Resend error for ${authUser.user.email}: ${errorBody}`);
        }
      } catch (err) {
        console.error(`[send-digest] Error sending to user ${user.user_id}:`, (err as Error).message);
      }
    }

    const result = {
      success: true,
      articles_in_digest: topArticles.length,
      users_targeted: users.length,
      emails_sent: sentCount,
    };

    console.log("[send-digest] Complete:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-digest] Fatal error:", (err as Error).message);

    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
