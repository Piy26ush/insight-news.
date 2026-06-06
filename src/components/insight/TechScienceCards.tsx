import { techItems, scienceItems, vehicleItems } from "@/lib/mock-data";
import { ChevronRight } from "lucide-react";

export function TechCards() {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {techItems.map((i) => (
        <div
          key={i.title}
          className="group rounded-xl glass-card p-4 hover:border-primary/30 transition"
        >
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
            <span className="text-primary">{i.tag}</span>
            <span className="text-border">·</span>
            <span className="text-muted-foreground">{i.time}</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-snug group-hover:text-primary transition">
            {i.title}
          </h3>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{i.desc}</p>
        </div>
      ))}
    </div>
  );
}

export function ScienceCards() {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {scienceItems.map((i) => (
        <div
          key={i.title}
          className="group relative rounded-xl glass-card p-4 overflow-hidden hover:border-primary/30 transition"
        >
          <div className="absolute right-0 top-0 h-24 w-24 bg-gradient-radial from-primary/10 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
              <span className="text-primary">{i.tag}</span>
              <span className="text-border">·</span>
              <span className="text-muted-foreground">{i.time}</span>
            </div>
            <h3 className="mt-2 text-sm font-semibold leading-snug group-hover:text-primary transition">
              {i.title}
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{i.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function VehicleList() {
  return (
    <div className="rounded-xl glass-card divide-y divide-border overflow-hidden">
      {vehicleItems.map((v) => (
        <button
          key={v.title}
          className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-primary/5 transition group"
        >
          <span className="text-[10px] font-mono uppercase text-primary w-16 shrink-0">
            {v.tag}
          </span>
          <span className="text-sm flex-1 group-hover:text-primary transition">{v.title}</span>
          <span className="text-[10px] font-mono text-muted-foreground">{v.time}</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition" />
        </button>
      ))}
    </div>
  );
}
