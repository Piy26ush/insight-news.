import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { BreakingBanner } from "@/components/insight/BreakingBanner";
import { StatCard } from "@/components/insight/StatCard";
import { FeedCard } from "@/components/insight/FeedCard";
import { SectionHeader } from "@/components/insight/SectionHeader";
import { TrendingTopics } from "@/components/insight/TrendingTopics";
import { GlobalSnapshot } from "@/components/insight/GlobalSnapshot";
import { MarketCenter } from "@/components/insight/MarketCenter";
import { TechCards, ScienceCards, VehicleList } from "@/components/insight/TechScienceCards";
import { ImportantEvents } from "@/components/insight/ImportantEvents";
import { overviewStats, feedItems } from "@/lib/mock-data";
import { getArticles as fetchArticlesFromDb, mapArticleToFeedItem } from "@/lib/supabase";
import type { FeedItem } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Insight — Intelligence Dashboard" },
      {
        name: "description",
        content:
          "Everything important. Nothing unnecessary. Real-time intelligence across markets, technology, science, and global events.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isMock, setIsMock] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const articles = await fetchArticlesFromDb(undefined, 20);
        if (articles && articles.length > 0) {
          setFeed(articles.map(mapArticleToFeedItem));
          setIsMock(false);
        } else {
          setFeed(feedItems);
          setIsMock(true);
        }
      } catch (err) {
        console.error("Failed to load live feed, falling back to mock data", err);
        setFeed(feedItems);
        setIsMock(true);
      }
    }
    loadData();

    // Poll every 90s
    const interval = setInterval(loadData, 90000);

    // Listen for manual refresh events
    const handleManualRefresh = () => {
      loadData();
    };
    window.addEventListener("insight:refresh", handleManualRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("insight:refresh", handleManualRefresh);
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-positive animate-pulse-dot" />
            Live intelligence feed
          </div>
          <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight text-gradient-primary">
            Everything important. Nothing unnecessary.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your personal command center for what's happening in the world, right now.
          </p>
        </div>
      </div>

      <BreakingBanner />

      {/* Today's overview */}
      <section>
        <SectionHeader
          eyebrow="Today's overview"
          title="Pulse of the world"
          description="Aggregated signal across every desk in the last 24 hours."
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {overviewStats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </section>

      {/* Two-column live feed + side rail */}
      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <SectionHeader
            live
            eyebrow="Live feed"
            title="Intelligence stream"
            description="Twitter-style chronological feed, scored for importance."
            to="/breaking"
          />
          <div className="space-y-3">
            {feed.map((f) => (
              <FeedCard key={f.id} item={f} />
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <section>
            <SectionHeader eyebrow="Trending" title="What the world is talking about" />
            <TrendingTopics />
          </section>
          <section>
            <SectionHeader eyebrow="Market center" title="Markets, live" to="/markets" />
            <MarketCenter />
          </section>
        </aside>
      </div>

      {/* Global snapshot */}
      <section>
        <SectionHeader
          eyebrow="Global snapshot"
          title="Regions at a glance"
          description="One headline per region, with activity intensity."
        />
        <GlobalSnapshot />
      </section>

      {/* Tech + Science */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <SectionHeader eyebrow="Technology & AI" title="What's shipping" to="/technology" />
          <TechCards />
        </section>
        <section>
          <SectionHeader eyebrow="Science & discovery" title="From the frontier" to="/science" />
          <ScienceCards />
        </section>
      </div>

      {/* Vehicles + Important events */}
      <div className="grid lg:grid-cols-3 gap-6">
        <section>
          <SectionHeader eyebrow="Vehicles & mobility" title="On the move" to="/vehicles" />
          <VehicleList />
        </section>
        <section className="lg:col-span-2">
          <SectionHeader
            eyebrow="Top 10 today"
            title="Most important events globally"
            description="Ranked by impact across markets, geopolitics, and technology."
          />
          <ImportantEvents />
        </section>
      </div>

      <footer className="pt-8 pb-4 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        <span>Insight Intelligence Terminal · v1.0</span>
        <span>Data refreshes every 90s · {isMock ? "Mock dataset" : "Live database"}</span>
      </footer>
    </div>
  );
}
