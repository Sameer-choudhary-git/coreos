import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, FileCheck2, LogOut, Upload, XCircle } from "lucide-react";
import { Field, Logo, btn } from "@/components/site";
import { StatusTimeline } from "@/components/StatusTimeline";
import { evaluate, now, statusLabel, store, useStore, type Application } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Applicant Dashboard — OnboardIQ" },
      { name: "description", content: "Complete your KYC application and track its status." },
      { property: "og:title", content: "Applicant Dashboard — OnboardIQ" },
      { property: "og:description", content: "Your onboarding journey in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const docTypes = [
  { key: "pan", label: "PAN Card" },
  { key: "aadhaar", label: "Aadhaar Card (masked)" },
  { key: "address", label: "Address Proof" },
] as const;

function Dashboard() {
  const navigate = useNavigate();
  const user = useStore(() => store.currentUser());
  const app = useStore(() => {
    const u = store.currentUser();
    return u ? store.getApp(u.email) : null;
  });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (user === null) navigate({ to: "/login" });
  }, [user, navigate]);

  if (!user) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;

  const showForm = editing || !app || app.status === "draft";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.name}</span>
            <button className={btn.ghost} onClick={() => { store.logout(); navigate({ to: "/" }); }}><LogOut className="h-4 w-4" /> Log out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold">Hello, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Savings account application · Demo environment with synthetic data</p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            {showForm ? (
              <ApplicationForm user={user} existing={app ?? null} onDone={() => setEditing(false)} />
            ) : (
              <StatusPanel app={app!} onResubmit={() => setEditing(true)} />
            )}
          </div>
          <aside className="h-fit rounded-xl border bg-card p-6 shadow-soft">
            <h2 className="font-semibold">Application Status</h2>
            <p className="mb-5 mt-1 text-xs text-muted-foreground">{app ? statusLabel[app.status] : "Not started"}</p>
            <StatusTimeline status={app?.status ?? "draft"} />
          </aside>
        </div>
      </main>
    </div>
  );
}

function StatusPanel({ app, onResubmit }: { app: Application; onResubmit: () => void }) {
  const tone = {
    approved: { icon: CheckCircle2, cls: "bg-success-soft text-success", title: "Your application has been approved", msg: "Demo outcome — no real bank account has been opened." },
    rejected: { icon: XCircle, cls: "bg-destructive/10 text-destructive", title: "Your application was not approved", msg: app.reason ?? "" },
    docs_required: { icon: AlertTriangle, cls: "bg-warning-soft text-warning", title: "Additional documents required", msg: app.reason ?? "" },
  } as const;
  const t = (tone as Record<string, (typeof tone)[keyof typeof tone]>)[app.status] ?? {
    icon: FileCheck2, cls: "bg-secondary text-primary", title: "Your application is in progress", msg: app.reason ?? "We'll keep you updated at every step.",
  };
  return (
    <div className="space-y-6">
      <div className={cn("flex gap-4 rounded-xl p-5", t.cls)}>
        <t.icon className="h-6 w-6 shrink-0" />
        <div>
          <p className="font-semibold">{t.title}</p>
          {t.msg && <p className="mt-1 text-sm opacity-90">{t.msg}</p>}
          {app.status === "docs_required" && <button onClick={onResubmit} className={`${btn.primary} mt-4`}>Resubmit documents</button>}
        </div>
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-soft">
        <h2 className="font-semibold">Submitted details</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{app.fullName}</dd></div>
          <div><dt className="text-muted-foreground">Date of birth</dt><dd className="font-medium">{app.dob}</dd></div>
          <div><dt className="text-muted-foreground">PAN</dt><dd className="font-medium">{app.pan}</dd></div>
          <div><dt className="text-muted-foreground">Aadhaar</dt><dd className="font-medium">XXXX XXXX {app.aadhaarLast4}</dd></div>
          <div className="sm:col-span-2"><dt className="text-muted-foreground">Address</dt><dd className="font-medium">{app.address}</dd></div>
        </dl>
        <h3 className="mt-6 text-sm font-semibold">Activity</h3>
        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          {[...app.history].reverse().map((h, i) => <li key={i}><span className="font-medium text-foreground">{h.label}</span> · {h.at}</li>)}
        </ul>
      </div>
    </div>
  );
}

function ApplicationForm({ user, existing, onDone }: { user: { name: string; email: string }; existing: Application | null; onDone: () => void }) {
  const [docs, setDocs] = useState<Application["docs"]>(existing?.status === "docs_required" ? {} : existing?.docs ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const errs: Record<string, string> = {};
    if (!f.fullName?.trim() || f.fullName.trim().length < 2) errs.fullName = "Enter your name as on PAN";
    if (!f.dob) errs.dob = "Enter your date of birth";
    if (!/^[A-Za-z]{5}\d{4}[A-Za-z]$/.test(f.pan ?? "")) errs.pan = "PAN format: ABCDE1234F";
    if (!/^\d{4}$/.test(f.aadhaarLast4 ?? "")) errs.aadhaarLast4 = "Enter only the last 4 digits";
    if (!f.address?.trim() || f.address.trim().length < 10) errs.address = "Enter your full address";
    for (const d of docTypes) if (!docs[d.key]) errs[`doc_${d.key}`] = `Upload your ${d.label}`;
    if (!f.consent) errs.consent = "Consent is required to continue";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    setTimeout(() => {
      const base: Application = {
        email: user.email, fullName: f.fullName.trim(), dob: f.dob, pan: f.pan.toUpperCase(), aadhaarLast4: f.aadhaarLast4,
        address: f.address.trim(), docs, consent: true, status: "submitted", risk: "LOW",
        history: [...(existing?.history ?? []), { at: now(), label: existing ? "Application resubmitted" : "Application submitted" }],
      };
      const r = evaluate(base);
      const app = { ...base, ...r, history: [...base.history, { at: now(), label: statusLabel[r.status] }] };
      store.saveApp(app);
      setLoading(false);
      onDone();
    }, 900);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6 rounded-xl border bg-card p-6 shadow-soft">
      <div>
        <h2 className="text-lg font-semibold">{existing ? "Update your application" : "Start your application"}</h2>
        <p className="text-sm text-muted-foreground">All fields are required. Use synthetic test data only.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name (as on PAN)" name="fullName" defaultValue={existing?.fullName ?? user.name} error={errors.fullName} />
        <Field label="Date of birth" name="dob" type="date" defaultValue={existing?.dob} error={errors.dob} />
        <Field label="PAN number" name="pan" maxLength={10} placeholder="ABCDE1234F" defaultValue={existing?.pan} error={errors.pan} className="w-full rounded-lg border border-input bg-surface px-3.5 py-2.5 text-sm uppercase outline-none focus:border-primary" />
        <Field label="Aadhaar — last 4 digits only" name="aadhaarLast4" inputMode="numeric" maxLength={4} placeholder="1234" defaultValue={existing?.aadhaarLast4} error={errors.aadhaarLast4} />
        <div className="sm:col-span-2"><Field label="Residential address" name="address" defaultValue={existing?.address} error={errors.address} /></div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold">Documents</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {docTypes.map((d) => {
            const file = docs[d.key];
            return (
              <div key={d.key}>
                <label className={cn("flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-4 text-center text-sm transition hover:border-primary focus-within:border-primary",
                  file ? "border-success bg-success-soft" : errors[`doc_${d.key}`] ? "border-destructive" : "border-input")}>
                  {file ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Upload className="h-5 w-5 text-primary" />}
                  <span className="font-medium">{d.label}</span>
                  <span className="max-w-full truncate text-xs text-muted-foreground">{file ? `${file} · Uploaded` : "PDF, JPG or PNG"}</span>
                  <input type="file" accept=".pdf,image/*" className="sr-only" onChange={(e) => {
                    const n = e.target.files?.[0]?.name;
                    if (n) setDocs((p) => ({ ...p, [d.key]: n }));
                  }} />
                </label>
                {errors[`doc_${d.key}`] && <p className="mt-1 text-xs text-destructive">{errors[`doc_${d.key}`]}</p>}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Please mask the first 8 digits of your Aadhaar before uploading.</p>
      </div>
      <div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-primary" />
          <span>I consent to OnboardIQ processing my details for KYC verification (demo).</span>
        </label>
        {errors.consent && <p className="mt-1 text-xs text-destructive">{errors.consent}</p>}
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={btn.primary} disabled={loading}>{loading ? "Submitting & checking…" : "Submit application"}</button>
        <Link to="/" className={btn.outline}>Back to home</Link>
      </div>
      <p className="text-xs text-muted-foreground">Tip (demo): a name containing “test” triggers officer review; Aadhaar ending in 0 triggers a manual check.</p>
    </form>
  );
}
