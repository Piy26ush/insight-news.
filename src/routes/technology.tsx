import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/insight/PageShell";
import { TechCards } from "@/components/insight/TechScienceCards";
import { FeedCard } from "@/components/insight/FeedCard";
import { SectionHeader } from "@/components/insight/SectionHeader";
import { feedItems } from "@/lib/mock-data";
import { getArticles as fetchArticlesFromDb, mapArticleToFeedItem } from "@/lib/supabase";
import type { FeedItem } from "@/lib/mock-data";

export const Route = createFileRoute("/technology")({
  head: () => ({
    meta: [
      { title: "Technology & AI — Insight" },
      { name: "description", content: "AI, software, hardware, startups." },
    ],
  }),
  component: TechnologyPage,
});

function TechnologyPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const techArticles = await fetchArticlesFromDb("Tech", 20);
        const aiArticles = await fetchArticlesFromDb("AI", 20);
        const combined = [...techArticles, ...aiArticles]
          .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
          .slice(0, 20);

        if (combined.length > 0) {
          setFeed(combined.map(mapArticleToFeedItem));
        } else {
          setFeed(feedItems.filter((f) => f.category === "Technology" || f.category === "AI"));
        }
      } catch (err) {
        console.error("Failed to load tech feed", err);
        setFeed(feedItems.filter((f) => f.category === "Technology" || f.category === "AI"));
      }
    }

    loadData();

    // Auto-refresh interval (every 90 seconds)
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
    <PageShell
      eyebrow="Technology & AI"
      title="What's shipping in tech"
      description="AI breakthroughs, product launches, funding, and platform shifts."
    >
      <TechCards />
      <div className="mt-8">
        <SectionHeader eyebrow="Tech wire" title="Deeper signal" />
        <div className="space-y-3">
          {feed.map((f) => (
            <FeedCard key={f.id} item={f} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
