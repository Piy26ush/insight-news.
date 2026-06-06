import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/insight/PageShell";
import { VehicleList } from "@/components/insight/TechScienceCards";

export const Route = createFileRoute("/vehicles")({
  head: () => ({ meta: [{ title: "Vehicles & Mobility — Insight" }, { name: "description", content: "Cars, bikes, EVs, aerospace." }] }),
  component: () => (
    <PageShell eyebrow="Vehicles & mobility" title="On the move" description="EVs, two-wheelers, aerospace, and the future of transportation.">
      <VehicleList />
    </PageShell>
  ),
});
