import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/insight/PageShell";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, X } from "lucide-react";
import { FeedCard } from "@/components/insight/FeedCard";
import { feedItems } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search — Insight" },
      { name: "description", content: "Search across global intelligence." },
    ],
  }),
  component: SearchPage,
});

const filterGroups = [
  { name: "Time", options: ["Today", "This Week", "This Month"] },
  { name: "Region", options: ["India", "Global"] },
  { name: "Domain", options: ["Markets", "Technology", "Science"] },
];

function SearchPage() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Record<string, string | null>>({});

  const toggle = (group: string, val: string) =>
    setActive((s) => ({ ...s, [group]: s[group] === val ? null : val }));

  const results = useMemo(() => {
    let r = feedItems;
    if (query) {
      const q = query.toLowerCase();
      r = r.filter(
        (f) =>
          f.headline.toLowerCase().includes(q) ||
          f.summary.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q),
      );
    }
    const domain = active.Domain;
    if (domain) r = r.filter((f) => f.category.toLowerCase() === domain.toLowerCase());
    const region = active.Region;
    if (region === "India") r = r.filter((f) => f.category === "India");
    return r;
  }, [query, active]);

  return (
    <PageShell
      eyebrow="Search"
      title="Global search"
      description="Query the entire intelligence corpus. Filter by time, region, and domain."
    >
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search markets, regions, technologies, events…"
          className="pl-12 pr-12 h-14 text-base glass-card border-border"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {filterGroups.map((g) => (
          <div key={g.name} className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground w-16">
              {g.name}
            </span>
            {g.options.map((opt) => (
              <button
                key={opt}
                onClick={() => toggle(g.name, opt)}
                className={cn(
                  "text-xs rounded-full px-3 py-1 border transition",
                  active[g.name] === opt
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">
            {results.length} result{results.length === 1 ? "" : "s"}
          </h3>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Ranked by relevance
          </span>
        </div>
        {results.length === 0 ? (
          <div className="rounded-xl glass-card p-12 text-center">
            <SearchIcon className="h-6 w-6 mx-auto text-muted-foreground" />
            <h3 className="mt-3 font-semibold">No matches</h3>
            <p className="text-sm text-muted-foreground">
              Try a different query or relax your filters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((f) => (
              <FeedCard key={f.id} item={f} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
