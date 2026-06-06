import { createFileRoute } from "@tanstack/react-router";
import { CategoryView } from "@/components/insight/CategoryView";

export const Route = createFileRoute("/sports")({
  head: () => ({
    meta: [
      { title: "Sports — Insight" },
      { name: "description", content: "Sports headlines and scores." },
    ],
  }),
  component: () => (
    <CategoryView
      title="Scores & headlines"
      eyebrow="Sports"
      description="Cricket, F1, football, and the Olympics — your highlights."
      category="Sports"
    />
  ),
});
