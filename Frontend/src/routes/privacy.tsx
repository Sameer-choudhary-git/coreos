import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — OnboardIQ" },
      { name: "description", content: "How the OnboardIQ prototype handles demo data." },
      { property: "og:title", content: "Privacy Policy — OnboardIQ" },
      { property: "og:description", content: "Privacy information for the OnboardIQ prototype." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell>
      <article className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-4 text-muted-foreground">This hackathon prototype stores all data only in your browser's local storage. Nothing is sent to a server. Only the last four digits of Aadhaar are ever collected. Clear your browser data to remove everything.</p>
      </article>
    </PageShell>
  ),
});
