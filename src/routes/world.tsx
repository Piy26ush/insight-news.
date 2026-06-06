import { createFileRoute } from "@tanstack/react-router";
import { CategoryView } from "@/components/insight/CategoryView";

export const Route = createFileRoute("/world")({
  head: () => ({
    meta: [
      { title: "World — Insight" },
      { name: "description", content: "Global stories that matter." },
    ],
  }),
  component: () => (
    <CategoryView
      title="World"
      eyebrow="Global"
      description="Global stories that matter — geopolitics, conflict, diplomacy, climate."
      category="World"
    />
  ),
});
