import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  live?: boolean;
}

export function SectionHeader({ eyebrow, title, description, action, live }: Props) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3">
      <div>
        {eyebrow && (
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-primary">
            {live && <span className="h-1.5 w-1.5 rounded-full bg-positive animate-pulse-dot" />}
            {eyebrow}
          </div>
        )}
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action ?? (
        <button className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition">
          View all <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
