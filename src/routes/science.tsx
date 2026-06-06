import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/insight/PageShell";
import { ScienceCards } from "@/components/insight/TechScienceCards";

export const Route = createFileRoute("/science")({
  head: () => ({
    meta: [
      { title: "Science — Insight" },
      { name: "description", content: "Space, medicine, physics, biology." },
    ],
  }),
  component: () => (
    <PageShell
      eyebrow="Science & discovery"
      title="From the frontier"
      description="Space missions, medical breakthroughs, and research that moves the needle."
    >
      <ScienceCards />
    </PageShell>
  ),
});
