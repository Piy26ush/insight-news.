import { createFileRoute } from "@tanstack/react-router";
import { CategoryView } from "@/components/insight/CategoryView";

export const Route = createFileRoute("/cybersecurity")({
  head: () => ({
    meta: [
      { title: "Cybersecurity — Insight" },
      { name: "description", content: "Threats, breaches, zero-days." },
    ],
  }),
  component: () => (
    <CategoryView
      title="Cybersecurity"
      eyebrow="Threats"
      description="Active exploits, breaches, and the threat landscape — updated continuously."
      category="Cybersecurity"
    />
  ),
});
