import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — OnboardIQ" },
      { name: "description", content: "Terms for using the OnboardIQ prototype." },
      { property: "og:title", content: "Terms of Service — OnboardIQ" },
      { property: "og:description", content: "Terms for the OnboardIQ prototype." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell>
      <article className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-4 text-muted-foreground">OnboardIQ is a demonstration only. It does not perform real identity verification and does not open real bank accounts. Use synthetic test data only.</p>
      </article>
    </PageShell>
  ),
});
