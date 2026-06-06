import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/insight/PageShell";
import { FeedCard } from "@/components/insight/FeedCard";
import { Bookmark } from "lucide-react";
import { savedArticles as mockSavedArticles } from "@/lib/mock-data";
import { getSupabase, mapArticleToFeedItem } from "@/lib/supabase";
import type { FeedItem } from "@/lib/mock-data";

export const Route = createFileRoute("/saved")({
  head: () => ({ meta: [{ title: "Saved Articles — Insight" }, { name: "description", content: "Your saved reading list." }] }),
  component: SavedPage,
});

function SavedPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Fetch saved articles joined with article details
          const { data, error } = await supabase
            .from("saved_articles")
            .select(`
              *,
              articles (*)
            `)
            .eq("user_id", user.id)
            .order("saved_at", { ascending: false });

          if (error) throw error;

          if (data && data.length > 0) {
            const articles = data.map((d: any) => d.articles).filter(Boolean);
            setFeed(articles.map(mapArticleToFeedItem));
          } else {
            setFeed([]); // Empty state
          }
        } else {
          // Fallback to mock data for preview/guest
          setFeed(mockSavedArticles);
        }
      } catch (err) {
        console.error("Failed to load saved articles, falling back to mock data", err);
        setFeed(mockSavedArticles);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <PageShell eyebrow="Library" title="Saved articles" description="Your personal reading queue, organized by recency.">
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : feed.length === 0 ? (
        <div className="rounded-xl glass-card p-12 text-center">
          <Bookmark className="h-6 w-6 mx-auto text-muted-foreground" />
          <h3 className="mt-3 font-semibold">Nothing saved yet</h3>
          <p className="text-sm text-muted-foreground">Tap the bookmark icon on any article to keep it here.</p>
        </div>
      ) : (
        <div className="space-y-3">{feed.map((f) => <FeedCard key={f.id} item={f} />)}</div>
      )}
    </PageShell>
  );
}
