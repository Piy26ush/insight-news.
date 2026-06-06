import { importantEvents } from "@/lib/mock-data";

export function ImportantEvents() {
  return (
    <div className="rounded-xl glass-card overflow-hidden">
      <div className="divide-y divide-border">
        {importantEvents.map((e, idx) => (
          <div key={e.id} className="group flex gap-4 p-4 hover:bg-primary/5 transition">
            <div className="flex flex-col items-center w-12 shrink-0">
              <span className="text-2xl font-semibold tabular-nums text-gradient-primary leading-none">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div className="mt-2 w-px flex-1 bg-border" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-primary">{e.category}</span>
                  <h3 className="mt-1 text-base font-semibold leading-snug group-hover:text-primary transition">{e.headline}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{e.summary}</p>
                </div>
                <ImpactGauge value={e.impact} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImpactGauge({ value }: { value: number }) {
  const r = 18; const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <div className="relative shrink-0 w-12 h-12">
      <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
        <circle cx="22" cy="22" r={r} stroke="oklch(1 0 0 / 8%)" strokeWidth="3" fill="none" />
        <circle cx="22" cy="22" r={r} stroke="oklch(0.68 0.18 250)" strokeWidth="3" fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-[11px] font-mono tabular-nums font-semibold">{value}</div>
    </div>
  );
}
