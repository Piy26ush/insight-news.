import { trendingTopics } from "@/lib/mock-data";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function TrendingTopics() {
  return (
    <div className="flex flex-wrap gap-2">
      {trendingTopics.map((t) => {
        const up = t.delta >= 0;
        return (
          <button
            key={t.label}
            className="group flex items-center gap-2 rounded-full glass-card px-3 py-1.5 text-xs hover:border-primary/40 hover:bg-primary/10 transition"
          >
            <span className="text-foreground">#{t.label}</span>
            <span className="text-muted-foreground font-mono tabular-nums">{t.count.toLocaleString()}</span>
            <span className={cn("flex items-center gap-0.5 font-mono", up ? "text-positive" : "text-critical")}>
              {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(t.delta)}%
            </span>
          </button>
        );
      })}
    </div>
  );
}
