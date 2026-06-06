import { globalSnapshots } from "@/lib/mock-data";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function GlobalSnapshot() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {globalSnapshots.map((r) => {
        const TrendIcon = r.trend === "up" ? ArrowUpRight : r.trend === "down" ? ArrowDownRight : Minus;
        const color = r.trend === "up" ? "text-positive" : r.trend === "down" ? "text-critical" : "text-muted-foreground";
        return (
          <div key={r.region} className="rounded-xl glass-card p-3.5 hover:border-primary/30 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl leading-none">{r.flag}</span>
                <span className="text-xs font-semibold">{r.region}</span>
              </div>
              <TrendIcon className={cn("h-3.5 w-3.5", color)} />
            </div>
            <p className="mt-2.5 text-xs leading-snug text-foreground/90 line-clamp-3 min-h-[3rem]">{r.headline}</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary/40 to-primary" style={{ width: `${r.activity}%` }} />
              </div>
              <span className="text-[10px] font-mono tabular-nums text-muted-foreground">{r.activity}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
