import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { AuthCard, DemoNote, Field, Navbar, btn } from "@/components/site";
import { store } from "@/lib/store";
import { api } from "@/lib/api";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign Up — OnboardIQ" },
      { name: "description", content: "Create your OnboardIQ applicant account to start your digital savings account application." },
      { property: "og:title", content: "Sign Up — OnboardIQ" },
      { property: "og:description", content: "Start your digital KYC onboarding." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Signup,
});

const schema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80),
    email: z.string().trim().email("Enter a valid email address").max(120),
    mobile: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
    pan: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid PAN (e.g. ABCDE1234F)"),
    aadhaar: z.string().trim().regex(/^\d{12}$/, "Enter a valid 12-digit Aadhaar number"),
    addressProof: z.enum(["electricity", "aadhaar"], {
      message: "Select an address proof document",
    }),
    password: z.string().min(8, "Password must be at least 8 characters").max(64),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

function Signup() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const r = schema.safeParse(data);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const result = await api.register({ name: r.data.name, email: r.data.email, password: r.data.password });
      store.setAuthenticatedUser(result.user);
      if (result.session) navigate({ to: "/dashboard" });
      else navigate({ to: "/login" });
    } catch (err) {
      setErrors({ email: (err as Error).message });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AuthCard title="Create your account" subtitle="Start your savings account application in minutes.">
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Full name" name="name" autoComplete="name" error={errors.name} />
          <Field label="Email" name="email" type="email" autoComplete="email" error={errors.email} />
          <Field label="Mobile number" name="mobile" inputMode="numeric" maxLength={10} placeholder="10-digit number" error={errors.mobile} />
          <Field label="PAN" name="pan" maxLength={10} placeholder="ABCDE1234F" autoComplete="off" error={errors.pan} />
          <Field label="Aadhaar number" name="aadhaar" inputMode="numeric" maxLength={12} placeholder="12-digit Aadhaar number" error={errors.aadhaar} />
          <div>
            <label htmlFor="addressProof" className="mb-1.5 block text-sm font-medium text-foreground">Address proof</label>
            <select
              id="addressProof"
              name="addressProof"
              defaultValue=""
              aria-invalid={!!errors.addressProof}
              className={`w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.addressProof ? "border-destructive" : "border-input"}`}
            >
              <option value="" disabled>Select a document</option>
              <option value="electricity">Electricity bill</option>
              <option value="aadhaar">Aadhaar card</option>
            </select>
            {errors.addressProof && <p className="mt-1.5 text-xs text-destructive">{errors.addressProof}</p>}
          </div>
          <Field label="Password" name="password" type="password" autoComplete="new-password" error={errors.password} />
          <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" error={errors.confirm} />
          <button type="submit" className={`${btn.primary} w-full`} disabled={loading}>{loading ? "Creating account…" : "Sign Up"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">Already registered? <Link to="/login" className="font-semibold text-primary hover:underline">Login</Link></p>
        <DemoNote>Your account is created in the backend. Keep your credentials safe.</DemoNote>
      </AuthCard>
    </div>
  );
}
