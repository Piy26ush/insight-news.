import { useState, useEffect } from "react";
import { PageShell } from "@/components/insight/PageShell";
import { FeedCard } from "@/components/insight/FeedCard";
import { feedItems } from "@/lib/mock-data";
import {
  getArticles as fetchArticlesFromDb,
  mapArticleToFeedItem,
  getSupabase,
} from "@/lib/supabase";
import type { FeedItem } from "@/lib/mock-data";
import type { ArticleCategory } from "@/lib/database.types";

interface Props {
  title: string;
  eyebrow: string;
  description: string;
  category?: string;
}

export function CategoryView({ title, eyebrow, description, category }: Props) {
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        let articles = [];

        // Map frontend categories to database categories
        let dbCategory: ArticleCategory | undefined = undefined;
        if (category) {
          const catLower = category.toLowerCase();
          if (catLower === "world" || catLower === "global") {
            dbCategory = "Global";
          } else if (catLower === "technology" || catLower === "tech") {
            dbCategory = "Tech";
          } else if (catLower === "ai") {
            dbCategory = "AI";
          } else if (catLower === "science") {
            dbCategory = "Science";
          } else if (catLower === "markets") {
            dbCategory = "Markets";
          } else if (catLower === "india") {
            dbCategory = "India";
          } else if (catLower === "sports") {
            dbCategory = "Sports";
          } else if (catLower === "cybersecurity") {
            dbCategory = "Cybersecurity";
          } else if (catLower === "vehicles") {
            dbCategory = "Vehicles";
          } else if (catLower === "business") {
            dbCategory = "Business";
          }
        }

        if (category && category.toLowerCase() === "india") {
          // India: fetch matching category OR fallback to title/summary text match
          const supabase = getSupabase();
          const { data } = await supabase
            .from("articles")
            .select("*")
            .or("category.eq.India,title.ilike.%india%,summary.ilike.%india%")
            .order("published_at", { ascending: false })
            .limit(20);
          articles = data || [];
        } else if (dbCategory) {
          articles = await fetchArticlesFromDb(dbCategory, 20);
        } else {
          // General fetch
          articles = await fetchArticlesFromDb(undefined, 20);
        }

        if (articles && articles.length > 0) {
          setFeed(articles.map(mapArticleToFeedItem));
        } else {
          // Fallback to filtering mock data
          const items = category
            ? feedItems.filter((f) => f.category.toLowerCase() === category.toLowerCase())
            : feedItems;
          setFeed(items.length ? items : feedItems.slice(0, 5));
        }
      } catch (err) {
        console.error(`Failed to load category feed for ${category}`, err);
        const items = category
          ? feedItems.filter((f) => f.category.toLowerCase() === category.toLowerCase())
          : feedItems;
        setFeed(items.length ? items : feedItems.slice(0, 5));
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
  }, [category]);

  return (
    <PageShell eyebrow={eyebrow} title={title} description={description}>
      <div className="space-y-3">
        {feed.map((f) => (
          <FeedCard key={f.id} item={f} />
        ))}
      </div>
    </PageShell>
  );
}
