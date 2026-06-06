import { createFileRoute } from "@tanstack/react-router";
import { CategoryView } from "@/components/insight/CategoryView";

export const Route = createFileRoute("/india")({
  head: () => ({ meta: [{ title: "India — Insight" }, { name: "description", content: "Top stories shaping India." }] }),
  component: () => <CategoryView title="India" eyebrow="Region" description="Top stories shaping India — policy, markets, technology, and geopolitics." category="India" />,
});
