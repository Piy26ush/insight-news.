import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/insight/PageShell";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/sports")({
  head: () => ({ meta: [{ title: "Sports — Insight" }, { name: "description", content: "Sports headlines and scores." }] }),
  component: () => (
    <PageShell eyebrow="Sports" title="Scores & headlines" description="Cricket, F1, football, and the Olympics — your highlights.">
      <div className="rounded-xl glass-card p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 grid place-items-center mb-4">
          <Trophy className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-base font-semibold">Sports feed warming up</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          We're pulling in live scores and headlines. Check back during match windows.
        </p>
      </div>
    </PageShell>
  ),
});
