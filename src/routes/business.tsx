import { createFileRoute } from "@tanstack/react-router";
import { CategoryView } from "@/components/insight/CategoryView";

export const Route = createFileRoute("/business")({
  head: () => ({
    meta: [
      { title: "Business — Insight" },
      { name: "description", content: "Deals, earnings, and corporate moves." },
    ],
  }),
  component: () => (
    <CategoryView
      title="Business"
      eyebrow="Corporate"
      description="Deals, earnings, IPOs, and the moves shaping global business."
      category="Business"
    />
  ),
});
