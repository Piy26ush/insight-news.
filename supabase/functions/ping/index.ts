// ============================================================================
// Insight — Edge Function: ping (Keep-Alive)
// Returns a simple health check response.
// Register this URL on cron-job.org (free) to run every 5 days.
// This prevents the Supabase free tier project from auto-pausing.
// ============================================================================

Deno.serve(async (_req: Request) => {
  const result = {
    status: "ok",
    service: "insight-news-aggregator",
    timestamp: new Date().toISOString(),
    uptime: Deno.osUptime?.() ?? "unknown",
  };

  console.log("[ping] Health check:", JSON.stringify(result));

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
  });
});
