import { breakingTicker } from "@/lib/mock-data";
import { Zap } from "lucide-react";

export function BreakingBanner() {
  const items = [...breakingTicker, ...breakingTicker];
  return (
    <div className="relative overflow-hidden rounded-xl glass-card shadow-elevated">
      <div className="absolute inset-y-0 left-0 z-10 flex items-center gap-2 pl-4 pr-6 bg-gradient-to-r from-critical/90 via-critical/80 to-transparent">
        <div className="relative">
          <Zap className="h-4 w-4 text-critical-foreground" fill="currentColor" />
          <span className="absolute inset-0 animate-ping opacity-60">
            <Zap className="h-4 w-4 text-critical-foreground" />
          </span>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-critical-foreground font-mono">Breaking</span>
      </div>

      <div className="py-3 pl-36 pr-4 overflow-hidden">
        <div className="flex gap-12 whitespace-nowrap animate-ticker">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="text-[10px] font-mono uppercase tracking-wider text-primary px-1.5 py-0.5 rounded border border-primary/30 bg-primary/5">
                {item.tag}
              </span>
              <span className="text-foreground/90">{item.text}</span>
              <span className="text-muted-foreground font-mono text-xs">· {item.time}</span>
              <span className="h-1 w-1 rounded-full bg-border" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
