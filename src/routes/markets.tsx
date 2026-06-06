import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/insight/PageShell";
import { MarketCenter } from "@/components/insight/MarketCenter";
import { FeedCard } from "@/components/insight/FeedCard";
import { SectionHeader } from "@/components/insight/SectionHeader";
import { feedItems } from "@/lib/mock-data";
import { getArticles as fetchArticlesFromDb, mapArticleToFeedItem } from "@/lib/supabase";
import type { FeedItem } from "@/lib/mock-data";

export const Route = createFileRoute("/markets")({
  head: () => ({ meta: [{ title: "Markets — Insight" }, { name: "description", content: "Live markets dashboard." }] }),
  component: MarketsPage,
});

function MarketsPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const articles = await fetchArticlesFromDb("Markets", 20);
        if (articles && articles.length > 0) {
          setFeed(articles.map(mapArticleToFeedItem));
        } else {
          setFeed(feedItems.filter((f) => ["Markets", "Business"].includes(f.category)));
        }
      } catch (err) {
        console.error("Failed to load markets feed", err);
        setFeed(feedItems.filter((f) => ["Markets", "Business"].includes(f.category)));
      }
    }
    loadData();
  }, []);

  return (
    <PageShell eyebrow="Live markets" title="Market center" description="Indices, commodities, FX — live tape with intraday sparklines.">
      <MarketCenter />
      <div className="mt-8">
        <SectionHeader live eyebrow="Market wire" title="Market-moving stories" />
        <div className="space-y-3">
          {feed.map((f) => <FeedCard key={f.id} item={f} />)}
        </div>
      </div>
    </PageShell>
  );
}
