import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { Logo, btn } from "@/components/site";
import { now, statusLabel, store, useStore, type Application } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/officer")({
  head: () => ({
    meta: [
      { title: "Officer Console — OnboardIQ" },
      { name: "description", content: "Review queue for authorised KYC and Compliance officers." },
      { property: "og:title", content: "Officer Console — OnboardIQ" },
      { property: "og:description", content: "Maker-checker KYC review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Officer,
});

function Officer() {
  const navigate = useNavigate();
  const officer = useStore(() => store.officer());
  const apps = useStore(() => store.apps()) ?? [];
  const [sel, setSel] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (officer === null) navigate({ to: "/admin-login" });
  }, [officer, navigate]);
  if (!officer) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;

  const isMaker = officer.role === "maker";
  const queue = apps.filter((a) => (isMaker ? ["under_review", "docs_required"].includes(a.status) : a.status === "pending_checker"));
  const others = apps.filter((a) => !queue.includes(a));
  const current = apps.find((a) => a.email === sel) ?? null;

  const update = (a: Application, patch: Partial<Application>, label: string) => {
    store.saveApp({ ...a, ...patch, history: [...a.history, { at: now(), label: `${label} (${officer.id})` }] });
    setNote("");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-navy text-navy-foreground">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3"><Logo light /><span className="rounded-full bg-navy-foreground/10 px-3 py-1 text-xs font-semibold">{isMaker ? "KYC Officer · Maker" : "Compliance Officer · Checker"}</span></div>
          <button className={cn(btn.ghost, "text-navy-foreground/80 hover:bg-navy-foreground/10 hover:text-navy-foreground")} onClick={() => { store.officerLogout(); navigate({ to: "/admin-login" }); }}><LogOut className="h-4 w-4" /> Log out</button>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-xl border bg-card p-4 shadow-soft">
          <h2 className="px-2 font-semibold">{isMaker ? "Investigation queue" : "Awaiting final decision"} ({queue.length})</h2>
          <List items={queue} sel={sel} onSel={setSel} />
          <h3 className="mt-6 px-2 text-xs font-semibold tracking-wider text-muted-foreground">ALL OTHER APPLICATIONS</h3>
          <List items={others} sel={sel} onSel={setSel} />
          {apps.length === 0 && <p className="px-2 py-6 text-sm text-muted-foreground">No applications yet. Submit one from the applicant dashboard.</p>}
        </section>
        <section className="rounded-xl border bg-card p-6 shadow-soft">
          {!current ? <p className="text-sm text-muted-foreground">Select an application to view details.</p> : (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-bold">{current.fullName}</h2>
                <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", current.risk === "HIGH" ? "bg-destructive/10 text-destructive" : current.risk === "MEDIUM" ? "bg-warning-soft text-warning" : "bg-success-soft text-success")}>Risk: {current.risk}</span>
              </div>
              <p className="text-sm text-muted-foreground">{current.email} · {statusLabel[current.status]}</p>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">PAN</dt><dd>{current.pan}</dd></div>
                <div><dt className="text-muted-foreground">Aadhaar</dt><dd>XXXX XXXX {current.aadhaarLast4}</dd></div>
                <div><dt className="text-muted-foreground">DOB</dt><dd>{current.dob}</dd></div>
                <div><dt className="text-muted-foreground">Documents</dt><dd>{Object.values(current.docs).join(", ") || "—"}</dd></div>
                <div className="sm:col-span-2"><dt className="text-muted-foreground">Rule engine flag</dt><dd>{current.reason ?? "None"}</dd></div>
                {current.makerNote && <div className="sm:col-span-2"><dt className="text-muted-foreground">Maker recommendation</dt><dd>{current.makerNote}</dd></div>}
              </dl>

              {isMaker && current.status === "under_review" && (
                <Actions note={note} setNote={setNote} label="Investigation note">
                  <button className={btn.success} onClick={() => update(current, { status: "pending_checker", makerNote: `Recommend APPROVE: ${note || "—"}` }, "Recommended approval")}>Recommend approve</button>
                  <button className={btn.danger} onClick={() => update(current, { status: "pending_checker", makerNote: `Recommend REJECT: ${note || "—"}` }, "Recommended rejection")}>Recommend reject</button>
                  <button className={btn.outline} onClick={() => update(current, { status: "docs_required", reason: note || "Please upload clearer documents." }, "Requested documents")}>Request documents</button>
                </Actions>
              )}
              {!isMaker && current.status === "pending_checker" && (
                <Actions note={note} setNote={setNote} label="Decision reason (shown to applicant if rejected)">
                  <button className={btn.success} onClick={() => update(current, { status: "approved", reason: undefined }, "Final approval")}>Approve</button>
                  <button className={btn.danger} onClick={() => update(current, { status: "rejected", reason: note || "Your details could not be verified." }, "Final rejection")}>Reject</button>
                  <button className={btn.outline} onClick={() => update(current, { status: "under_review" }, "Returned to maker")}>Return to maker</button>
                </Actions>
              )}
              {!((isMaker && current.status === "under_review") || (!isMaker && current.status === "pending_checker")) && (
                <p className="mt-6 rounded-lg bg-muted p-3 text-sm text-muted-foreground">No action available for your role at this stage.</p>
              )}

              <h3 className="mt-6 text-sm font-semibold">Audit trail</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{current.history.map((h, i) => <li key={i}>{h.at} — {h.label}</li>)}</ul>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function List({ items, sel, onSel }: { items: Application[]; sel: string | null; onSel: (e: string) => void }) {
  return (
    <ul className="mt-2 space-y-1">
      {items.map((a) => (
        <li key={a.email}>
          <button onClick={() => onSel(a.email)} className={cn("w-full rounded-lg px-3 py-2 text-left text-sm transition", sel === a.email ? "bg-secondary" : "hover:bg-muted")}>
            <span className="block font-medium">{a.fullName}</span>
            <span className="text-xs text-muted-foreground">{statusLabel[a.status]} · {a.risk}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Actions({ children, note, setNote, label }: { children: React.ReactNode; note: string; setNote: (s: string) => void; label: string }) {
  return (
    <div className="mt-6 space-y-3 rounded-lg border p-4">
      <label className="block text-sm font-medium">{label}
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} className="mt-1.5 w-full rounded-lg border border-input bg-surface p-2.5 text-sm outline-none focus:border-primary" />
      </label>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
