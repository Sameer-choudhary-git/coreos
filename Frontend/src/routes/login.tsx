import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthCard, DemoNote, Field, Navbar, btn } from "@/components/site";
import { store } from "@/lib/store";
import { api } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — OnboardIQ" },
      { name: "description", content: "Log in to track your OnboardIQ application status." },
      { property: "og:title", content: "Login — OnboardIQ" },
      { property: "og:description", content: "Access your applicant dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { email, password } = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const errs: Record<string, string> = {};
    if (!email?.trim()) errs.email = "Please enter your email";
    if (!password) errs.password = "Please enter your password";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const result = await api.login({ email: email.trim(), password });
      store.setAuthenticatedUser(result.user);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setErrors({ form: (err as Error).message });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AuthCard title="Welcome back" subtitle="Log in to continue your application.">
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {errors.form && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.form}</p>}
          <Field label="Email" name="email" type="email" autoComplete="email" error={errors.email} />
          <Field label="Password" name="password" type="password" autoComplete="current-password" error={errors.password} />
          <button type="submit" className={`${btn.primary} w-full`} disabled={loading}>{loading ? "Logging in…" : "Login"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">New here? <Link to="/signup" className="font-semibold text-primary hover:underline">Sign Up</Link></p>
        <DemoNote>Use the account registered with the backend.</DemoNote>
      </AuthCard>
    </div>
  );
}
