import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/insight/PageShell";
import { FeedCard } from "@/components/insight/FeedCard";
import { BreakingBanner } from "@/components/insight/BreakingBanner";
import { feedItems } from "@/lib/mock-data";
import { getArticles as fetchArticlesFromDb, mapArticleToFeedItem } from "@/lib/supabase";
import type { FeedItem } from "@/lib/mock-data";

export const Route = createFileRoute("/breaking")({
  head: () => ({
    meta: [
      { title: "Breaking News — Insight" },
      { name: "description", content: "Live breaking news as it happens." },
    ],
  }),
  component: BreakingPage,
});

function BreakingPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const articles = await fetchArticlesFromDb(undefined, 50);
        if (articles && articles.length > 0) {
          const mapped = articles.map(mapArticleToFeedItem);
          const critical = mapped.filter(
            (f) => f.importance === "critical" || f.importance === "high",
          );
          setFeed(critical.length > 0 ? critical : mapped.slice(0, 10)); // fallback to showing top if none match
        } else {
          setFeed(feedItems.filter((f) => f.importance === "critical" || f.importance === "high"));
        }
      } catch (err) {
        console.error("Failed to load breaking feed", err);
        setFeed(feedItems.filter((f) => f.importance === "critical" || f.importance === "high"));
      }
    }
    loadData();
  }, []);

  return (
    <PageShell
      eyebrow="Live"
      title="Breaking news"
      description="The most urgent signals in the last 24 hours, ranked by importance."
    >
      <BreakingBanner />
      <div className="space-y-3 mt-2">
        {feed.map((f) => (
          <FeedCard key={f.id} item={f} />
        ))}
      </div>
    </PageShell>
  );
}
