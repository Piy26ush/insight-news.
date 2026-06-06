import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  delta: string;
  tone: "positive" | "critical" | "warning";
}

export function StatCard({ label, value, delta, tone }: Props) {
  const positive = !delta.startsWith("-");
  const toneColor =
    tone === "positive" ? "text-positive" : tone === "critical" ? "text-critical" : "text-warning";

  return (
    <div className="group relative overflow-hidden rounded-xl glass-card p-4 transition hover:border-primary/40">
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition" />
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-gradient-primary">
          {value}
        </span>
        <span className={cn("flex items-center gap-1 text-xs font-mono", toneColor)}>
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {delta}
        </span>
      </div>
    </div>
  );
}
