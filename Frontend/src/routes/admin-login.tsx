import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { AuthCard, DemoNote, Field, Navbar, btn } from "@/components/site";
import { store, type OfficerRole } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Officer Access — OnboardIQ" },
      { name: "description", content: "Secure login for authorised OnboardIQ bank personnel." },
      { property: "og:title", content: "Officer Access — OnboardIQ" },
      { property: "og:description", content: "Authorised bank personnel only." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLogin,
});

const DEMO_PW = "officer123";

function AdminLogin() {
  const navigate = useNavigate();
  const [role, setRole] = useState<OfficerRole>("maker");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { id, password } = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const errs: Record<string, string> = {};
    if (!id?.trim()) errs.id = "Enter your officer ID";
    if (!password) errs.password = "Enter your password";
    else if (password !== DEMO_PW) errs.password = "Invalid credentials";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    store.officerLogin(id.trim(), role);
    navigate({ to: "/officer" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AuthCard
        title="Officer Access"
        subtitle="This portal is restricted to authorised bank personnel."
        badge={<span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-navy px-3 py-1 text-xs font-semibold text-navy-foreground"><Lock className="h-3 w-3" /> Secure portal</span>}
      >
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Role</legend>
            <div className="grid grid-cols-2 gap-2">
              {([["maker", "KYC Officer", "Maker"], ["checker", "Compliance Officer", "Checker"]] as const).map(([v, l, s]) => (
                <button type="button" key={v} onClick={() => setRole(v)} aria-pressed={role === v}
                  className={cn("rounded-lg border p-3 text-left text-sm transition", role === v ? "border-primary bg-secondary" : "border-input hover:border-primary")}>
                  <span className="block font-semibold">{l}</span>
                  <span className="text-xs text-muted-foreground">{s}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <Field label="Officer ID" name="id" placeholder="e.g. KYC-001" error={errors.id} />
          <Field label="Password" name="password" type="password" error={errors.password} />
          <button type="submit" className={`${btn.navy} w-full`}>Login</button>
        </form>
        <DemoNote>Demo access: any officer ID with password <strong>officer123</strong>.</DemoNote>
      </AuthCard>
    </div>
  );
}
