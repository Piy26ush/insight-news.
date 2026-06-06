import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/insight/PageShell";
import { notifications } from "@/lib/mock-data";
import { AlertTriangle, Info, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Insight" },
      { name: "description", content: "Critical alerts and updates." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const groups = [
    {
      key: "critical",
      title: "Critical alerts",
      icon: AlertTriangle,
      items: notifications.critical,
      color: "text-critical",
      border: "border-critical/30 bg-critical/5",
    },
    {
      key: "important",
      title: "Important updates",
      icon: Info,
      items: notifications.important,
      color: "text-warning",
      border: "border-warning/30 bg-warning/5",
    },
    {
      key: "general",
      title: "General updates",
      icon: Bell,
      items: notifications.general,
      color: "text-primary",
      border: "border-primary/30 bg-primary/5",
    },
  ];
  return (
    <PageShell
      eyebrow="Inbox"
      title="Notifications"
      description="Categorized signal from your watchlists, ranked by urgency."
    >
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.key}>
            <div className="flex items-center gap-2 mb-3">
              <g.icon className={cn("h-4 w-4", g.color)} />
              <h3 className="text-sm font-semibold">{g.title}</h3>
              <span className="text-[10px] font-mono text-muted-foreground border border-border rounded-full px-2 py-0.5">
                {g.items.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {g.items.map((n, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl glass-card p-4 border-l-2 hover:bg-primary/5 transition",
                    g.border,
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold">{n.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                      {n.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
