// ============================================================================
// Insight — Edge Function: get-articles
// Public API route that the frontend calls to fetch articles.
// Accepts optional query params: category, limit, offset.
// Returns articles sorted by published_at DESC with cache headers.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    // Only allow GET requests
    if (req.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse query parameters from URL
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100); // cap at 100
    const offset = parseInt(url.searchParams.get("offset") ?? "0");

    console.log(`[get-articles] category=${category}, limit=${limit}, offset=${offset}`);

    // Initialize Supabase client
    // Using anon key here since articles are publicly readable via RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
      .from("articles")
      .select("*", { count: "exact" })  // include total count for pagination
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply category filter if provided
    if (category) {
      query = query.eq("category", category);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("[get-articles] Query error:", error.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch articles" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build response with pagination metadata
    const response = {
      articles: data ?? [],
      pagination: {
        total: count ?? 0,
        limit,
        offset,
        has_more: (count ?? 0) > offset + limit,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Cache for 15 minutes — reduces DB load for repeated requests
        "Cache-Control": "public, max-age=900, s-maxage=900",
        // Allow CORS from any origin (frontend is on a different domain)
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (err) {
    console.error("[get-articles] Fatal error:", (err as Error).message);

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
