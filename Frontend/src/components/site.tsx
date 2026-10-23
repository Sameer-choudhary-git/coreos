import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, Menu, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2 rounded-md" aria-label="OnboardIQ home">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <ShieldCheck className="h-4 w-4" />
      </span>
      <span className={cn("text-lg font-bold tracking-tight", light ? "text-navy-foreground" : "text-foreground")}>
        OnboardIQ
      </span>
    </Link>
  );
}

const btnBase =
  "inline-flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none";
export const btn = {
  primary: cn(btnBase, "rounded-lg bg-primary px-5 py-2.5 text-primary-foreground shadow-soft hover:brightness-110"),
  outline: cn(btnBase, "rounded-lg border border-input bg-surface px-5 py-2.5 text-foreground hover:border-primary hover:text-primary"),
  navy: cn(btnBase, "rounded-full bg-navy px-5 py-2.5 text-navy-foreground hover:brightness-125"),
  ghost: cn(btnBase, "rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted"),
  danger: cn(btnBase, "rounded-lg bg-destructive px-5 py-2.5 text-destructive-foreground hover:brightness-110"),
  success: cn(btnBase, "rounded-lg bg-success px-5 py-2.5 text-primary-foreground hover:brightness-110"),
};

export function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const go = (id: string) => {
    setOpen(false);
    if (window.location.pathname !== "/") {
      navigate({ to: "/" }).then(() => setTimeout(() => (id === "top" ? window.scrollTo({ top: 0, behavior: "smooth" }) : scrollToId(id)), 50));
    } else if (id === "top") window.scrollTo({ top: 0, behavior: "smooth" });
    else scrollToId(id);
  };
  return (
    <header className="sticky top-0 z-50 border-b bg-surface/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Main">
        <Logo />
        <div className="hidden items-center gap-8 md:flex">
          <button onClick={() => go("top")} className="text-sm font-medium text-primary">Home</button>
          <button onClick={() => go("procedure")} className="text-sm font-medium text-muted-foreground hover:text-foreground">Procedure</button>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login" className={btn.outline}>Login</Link>
          <Link to="/signup" className={btn.primary}>Sign Up</Link>
          <Link to="/admin-login" className={btn.navy}>Admin Login</Link>
        </div>
        <button className="rounded-md p-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>
      {open && (
        <div className="border-t bg-surface px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 py-3">
            <button onClick={() => go("top")} className="rounded-md px-2 py-2 text-left text-sm font-medium">Home</button>
            <button onClick={() => go("procedure")} className="rounded-md px-2 py-2 text-left text-sm font-medium">Procedure</button>
          </div>
          <div className="grid gap-2">
            <Link to="/login" className={btn.outline} onClick={() => setOpen(false)}>Login</Link>
            <Link to="/signup" className={btn.primary} onClick={() => setOpen(false)}>Sign Up</Link>
            <Link to="/admin-login" className={btn.navy} onClick={() => setOpen(false)}>Admin Login</Link>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const navigate = useNavigate();
  const go = (id: string) =>
    navigate({ to: "/" }).then(() => setTimeout(() => (id === "top" ? window.scrollTo({ top: 0, behavior: "smooth" }) : scrollToId(id)), 50));
  return (
    <footer className="border-t bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr] lg:px-8">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Intelligent KYC onboarding platform for opening digital savings accounts with automated checks and verified human oversight.
          </p>
        </div>
        <div>
          <h3 className="text-xs font-semibold tracking-widest text-foreground">QUICK LINKS</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><button onClick={() => go("top")} className="hover:text-primary">Home</button></li>
            <li><button onClick={() => go("procedure")} className="hover:text-primary">Procedure</button></li>
            <li><Link to="/login" className="hover:text-primary">Login</Link></li>
            <li><Link to="/signup" className="hover:text-primary">Sign Up</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold tracking-widest text-foreground">LEGAL &amp; COMPLIANCE</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-primary">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:px-6 md:flex-row md:justify-between lg:px-8">
          <p>© 2026 OnboardIQ Technologies. All rights reserved.</p>
          <p>Hackathon prototype. Uses synthetic test data and does not perform real identity verification or open real bank accounts.</p>
        </div>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function Field({ label, error, type = "text", ...rest }: { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  const id = rest.id ?? rest.name;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={isPw && show ? "text" : type}
          aria-invalid={!!error}
          className={cn(
            "w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
            error ? "border-destructive" : "border-input",
            isPw && "pr-10",
          )}
          {...rest}
        />
        {isPw && (
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function AuthCard({ title, subtitle, children, badge }: { title: string; subtitle: string; children: ReactNode; badge?: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-soft">
        {badge}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function DemoNote({ children }: { children: ReactNode }) {
  return <p className="mt-4 rounded-lg bg-secondary px-3 py-2 text-xs text-secondary-foreground">{children}</p>;
}
