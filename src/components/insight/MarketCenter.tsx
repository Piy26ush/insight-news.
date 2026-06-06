import { marketTicks } from "@/lib/mock-data";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function MarketCenter() {
  return (
    <div className="rounded-xl glass-card overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-border [&>*]:border-border">
        {marketTicks.map((t) => {
          const up = t.change >= 0;
          return (
            <div key={t.symbol} className="p-3.5 group hover:bg-primary/5 transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{t.symbol}</span>
                <span className={cn("text-[10px] font-mono tabular-nums flex items-center", up ? "text-positive" : "text-critical")}>
                  {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {t.changePct.toFixed(2)}%
                </span>
              </div>
              <div className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                {t.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="mt-0.5 flex items-baseline justify-between">
                <span className="text-[11px] text-muted-foreground">{t.name}</span>
                <span className={cn("text-[11px] font-mono tabular-nums", up ? "text-positive" : "text-critical")}>
                  {up ? "+" : ""}{t.change.toFixed(2)}
                </span>
              </div>
              <Sparkline up={up} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Sparkline({ up }: { up: boolean }) {
  // deterministic-ish points
  const pts = Array.from({ length: 20 }, (_, i) => {
    const base = 50 + Math.sin(i * 0.7) * 8 + (Math.cos(i * 1.3) * 6);
    return up ? base - i * 0.6 + 8 : base + i * 0.6;
  });
  const max = Math.max(...pts); const min = Math.min(...pts);
  const norm = pts.map((p) => 28 - ((p - min) / (max - min || 1)) * 24);
  const d = norm.map((y, i) => `${i === 0 ? "M" : "L"} ${i * 5} ${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 95 30" className="mt-2 w-full h-8 overflow-visible">
      <path d={d} fill="none" stroke={up ? "oklch(0.72 0.18 152)" : "oklch(0.65 0.24 22)"} strokeWidth="1.4" />
      <path d={`${d} L 95 30 L 0 30 Z`} fill={up ? "oklch(0.72 0.18 152 / 12%)" : "oklch(0.65 0.24 22 / 12%)"} />
    </svg>
  );
}
