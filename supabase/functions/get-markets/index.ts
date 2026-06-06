// ============================================================================
// Insight — Edge Function: get-markets
// Fetches real-time stock indices, currencies, and commodities from Yahoo Finance.
// Returns them with CORS enabled so the frontend client can fetch directly.
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface MarketSymbol {
  symbol: string;
  ySymbol: string;
  name: string;
  currency?: string;
}

const SYMBOLS: MarketSymbol[] = [
  { symbol: "NIFTY", ySymbol: "^NSEI", name: "Nifty 50" },
  { symbol: "SENSEX", ySymbol: "^BSESN", name: "Sensex" },
  { symbol: "NDX", ySymbol: "^NDX", name: "Nasdaq" },
  { symbol: "DJI", ySymbol: "^DJI", name: "Dow Jones" },
  { symbol: "GOLD", ySymbol: "GC=F", name: "Gold", currency: "$/oz" },
  { symbol: "SILVER", ySymbol: "SI=F", name: "Silver", currency: "$/oz" },
  { symbol: "CRUDE", ySymbol: "CL=F", name: "Crude Oil", currency: "$/bbl" },
  { symbol: "USDINR", ySymbol: "INR=X", name: "USD / INR" },
];

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[get-markets] Fetching indices from Yahoo Finance...");

    const promises = SYMBOLS.map(async (item) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.ySymbol)}?interval=1m&range=1d`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        const meta = data.chart?.result?.[0]?.meta;

        if (!meta) {
          throw new Error("No metadata in chart response");
        }

        const price = meta.regularMarketPrice;
        const prevClose = meta.previousClose || meta.chartPreviousClose || price;
        const change = price - prevClose;
        const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;

        return {
          symbol: item.symbol,
          name: item.name,
          price,
          change,
          changePct,
          currency: item.currency,
        };
      } catch (err) {
        console.error(
          `[get-markets] Failed to fetch ${item.symbol} (${item.ySymbol}):`,
          (err as Error).message,
        );
        return null;
      }
    });

    const results = await Promise.all(promises);
    const validResults = results.filter((r) => r !== null);

    console.log(
      `[get-markets] Successfully fetched ${validResults.length}/${SYMBOLS.length} indices`,
    );

    return new Response(JSON.stringify(validResults), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30", // cache for 30 seconds
      },
      status: 200,
    });
  } catch (err) {
    console.error("[get-markets] Fatal error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
