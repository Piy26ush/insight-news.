import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/insight/PageShell";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { interestCategories } from "@/lib/mock-data";
import { getSupabase, getUserPreferences, upsertUserPreferences } from "@/lib/supabase";
import { toast } from "sonner";
import type { ArticleCategory } from "@/lib/database.types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Insight" },
      { name: "description", content: "Customize your interests and preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [interests, setInterests] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(interestCategories.map((c, i) => [c.id, i < 5])),
  );
  const [digest, setDigest] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPrefs() {
      try {
        const supabase = getSupabase();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          const prefs = await getUserPreferences(user.id);
          if (prefs) {
            // Map preferred_categories array back to record
            const activeCats = Object.fromEntries(
              interestCategories.map((c) => [
                c.id,
                prefs.preferred_categories.includes(c.id.toUpperCase() as ArticleCategory),
              ]),
            );
            setInterests(activeCats);
            setDigest(prefs.digest_enabled);
          }
        }
      } catch (err) {
        console.error("Failed to load user preferences", err);
      } finally {
        setLoading(false);
      }
    }
    loadPrefs();
  }, []);

  const toggleInterest = async (id: string) => {
    const nextInterests = { ...interests, [id]: !interests[id] };
    setInterests(nextInterests);

    if (userId) {
      // Convert true items to uppercase categories list
      const preferredCategories = Object.entries(nextInterests)
        .filter(([_, active]) => active)
        .map(([key]) => key.toUpperCase() as ArticleCategory);

      try {
        await upsertUserPreferences({
          user_id: userId,
          preferred_categories: preferredCategories,
          digest_enabled: digest,
          theme: "dark",
        });
        toast.success("Preferences updated");
      } catch {
        toast.error("Failed to update preferences");
      }
    }
  };

  const toggleDigest = async (enabled: boolean) => {
    setDigest(enabled);

    if (userId) {
      const preferredCategories = Object.entries(interests)
        .filter(([_, active]) => active)
        .map(([key]) => key.toUpperCase() as ArticleCategory);

      try {
        await upsertUserPreferences({
          user_id: userId,
          preferred_categories: preferredCategories,
          digest_enabled: enabled,
          theme: "dark",
        });
        toast.success("Preferences updated");
      } catch {
        toast.error("Failed to update preferences");
      }
    }
  };

  return (
    <PageShell
      eyebrow="Preferences"
      title="Settings"
      description="Tune Insight to your domains. We'll rank everything for you accordingly."
    >
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="rounded-xl glass-card p-6">
            <h3 className="text-sm font-semibold">Your interests</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Toggle on the domains you want Insight to prioritize.
            </p>
            <Separator className="my-5" />
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
              {interestCategories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-3 border-b border-border/50 last:border-b-0"
                >
                  <div>
                    <div className="text-sm font-medium">{c.label}</div>
                    <div className="text-xs text-muted-foreground">{c.desc}</div>
                  </div>
                  <Switch
                    checked={!!interests[c.id]}
                    onCheckedChange={() => toggleInterest(c.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl glass-card p-6 mt-6">
            <h3 className="text-sm font-semibold">Delivery</h3>
            <Separator className="my-5" />
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div>
                <div className="text-sm font-medium">Daily digest</div>
                <div className="text-xs text-muted-foreground">
                  One email at 8:00 AM IST with the top stories.
                </div>
              </div>
              <Switch checked={digest} onCheckedChange={toggleDigest} />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-border/50 opacity-60">
              <div>
                <div className="text-sm font-medium">Critical alerts (Push)</div>
                <div className="text-xs text-muted-foreground">
                  Requires OneSignal configuration.
                </div>
              </div>
              <Switch checked={true} disabled />
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}
