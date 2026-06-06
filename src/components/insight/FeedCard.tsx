import { Bookmark, Share2, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FeedItem } from "@/lib/mock-data";

const importanceStyles: Record<FeedItem["importance"], { dot: string; label: string; text: string }> = {
  critical: { dot: "bg-critical shadow-[0_0_10px_oklch(0.65_0.24_22)]", label: "Critical", text: "text-critical" },
  high:     { dot: "bg-warning shadow-[0_0_10px_oklch(0.82_0.16_88)]",  label: "High",     text: "text-warning" },
  medium:   { dot: "bg-primary shadow-[0_0_10px_oklch(0.68_0.18_250)]", label: "Medium",   text: "text-primary" },
  low:      { dot: "bg-muted-foreground", label: "Low", text: "text-muted-foreground" },
};

export function FeedCard({ item }: { item: FeedItem }) {
  const imp = importanceStyles[item.importance];
  return (
    <article className="group relative rounded-xl glass-card p-4 transition hover:border-primary/30 hover:shadow-glow">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center pt-1">
          <span className={cn("h-2 w-2 rounded-full animate-pulse-dot", imp.dot)} />
          <span className="mt-2 text-[9px] font-mono tabular-nums text-muted-foreground rotate-180" style={{ writingMode: "vertical-rl" }}>
            {item.score}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider flex-wrap">
            {item.url && (
              <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1 py-0.5 text-[8px] font-bold text-primary animate-pulse">
                <Sparkles className="h-2 w-2" /> AI Enriched
              </span>
            )}
            <span className="text-primary">{item.category}</span>
            <span className="text-border">·</span>
            <span className="text-muted-foreground">{item.source}</span>
            <span className="text-border">·</span>
            <span className="text-muted-foreground">{item.time}</span>
            <span className={cn("ml-auto", imp.text)}>{imp.label}</span>
          </div>

          <h3 className="mt-1.5 text-[15px] font-semibold leading-snug text-foreground group-hover:text-primary transition">
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-1.5 align-middle">
                <span>{item.headline}</span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground" />
              </a>
            ) : (
              item.headline
            )}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">{item.summary}</p>

          <div className="mt-3 flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
              <Bookmark className="h-3.5 w-3.5" /> Save
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
              <Share2 className="h-3.5 w-3.5" /> Share
            </Button>
            <div className="ml-auto flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <div className="w-20 h-1 rounded-full bg-secondary overflow-hidden">
                <div className={cn("h-full", imp.dot)} style={{ width: `${item.score}%` }} />
              </div>
              <span className="tabular-nums">{item.score}/100</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
