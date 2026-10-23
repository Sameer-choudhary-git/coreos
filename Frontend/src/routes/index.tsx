import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, ChevronDown, CircleCheck, Clock, Cpu, Eye, FileUp, ScanSearch, ShieldCheck, TrendingUp, UserPlus, Activity } from "lucide-react";
import hero from "@/assets/hero.png";
import { PageShell, btn, scrollToId } from "@/components/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OnboardIQ — Open Your Account. Skip the Paperwork." },
      { name: "description", content: "Intelligent KYC onboarding for digital savings accounts: submit details, verify documents and track every step." },
      { property: "og:title", content: "OnboardIQ — Intelligent KYC Onboarding" },
      { property: "og:description", content: "Open a digital savings account online with smart verification and transparent progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const steps = [
  { n: "01", icon: UserPlus, title: "Create Your Application", body: "Sign up, enter your personal details and provide consent for KYC verification.", foot: "Takes ~2 minutes", fi: Clock },
  { n: "02", icon: FileUp, title: "Submit Your Documents", body: "Upload your PAN card, Aadhaar details using only the last four digits, and an accepted address proof.", foot: "Masked Aadhaar Compliant", fi: ShieldCheck },
  { n: "03", icon: ScanSearch, title: "Smart Verification", body: "OnboardIQ extracts document information and checks identity consistency, document validity and relevant watchlists.", note: "Applications requiring additional verification are routed for human review.", foot: "AI Extraction + Screening", fi: Cpu },
  { n: "04", icon: CircleCheck, title: "Track Your Outcome", body: "Follow your application status. Straightforward applications may be approved automatically; other cases can require a KYC Officer or an independent Compliance Officer review.", foot: "Live Status Dispatch", fi: Activity },
];

const benefits = [
  { icon: Cpu, title: "Intelligent Verification", body: "Automated extraction and consistency checks help reduce repetitive manual work, flagging data discrepancies before submission.", foot: "AI-Assisted Extraction" },
  { icon: BadgeCheck, title: "Human Oversight", body: "Applications requiring additional checks are routed to authorised officers, with independent approval where necessary.", foot: "Dual-Officer Protocol" },
  { icon: TrendingUp, title: "Transparent Tracking", body: "Applicants can follow their application status and understand the reasons for requests or decisions through self-service status tracking.", foot: "Audit Trail & Status Logs" },
];

function Index() {
  return (
    <PageShell>
      {/* Hero */}
      <section className="bg-background">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:grid-cols-[1.05fr_0.95fr] sm:gap-10 sm:px-6 sm:py-14 lg:gap-12 lg:px-8 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-[11px] font-semibold tracking-wider text-secondary-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" /> DIGITAL BANKING · INTELLIGENT KYC
            </span>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Open Your Account.<br /><span className="text-primary">Skip the Paperwork.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
              Start your savings account application online. Submit your details, verify your documents and track every step of the onboarding journey from one place.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/signup" className={btn.primary}>Get Started <ArrowRight className="h-4 w-4" /></Link>
              <button onClick={() => scrollToId("procedure")} className={btn.outline}>Explore the Procedure <ChevronDown className="h-4 w-4" /></button>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <CircleCheck className="h-4 w-4 text-success" /> Simple application. Smart verification. Transparent progress.
            </p>
          </div>
          <img src={hero} alt="Illustration of a customer on her phone with PAN, Aadhaar and address proof uploaded and an example application status timeline" className="mx-auto h-auto w-full max-w-[380px] object-contain sm:justify-self-end lg:max-w-[480px]" width={1333} height={851} />
        </div>
      </section>

      {/* Procedure */}
      <section id="procedure" className="scroll-mt-16 bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <span className="rounded-md bg-secondary px-2.5 py-1 text-[11px] font-semibold tracking-wider text-secondary-foreground">STEP-BY-STEP FLOW</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight">From Application to Account</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Four simple steps to complete your digital onboarding. Straightforward applications are automated instantly, while edge cases receive dedicated bank officer review.
          </p>
          <div className="relative mt-12">
            <div className="absolute left-0 right-0 top-1/2 hidden h-px bg-border lg:block" aria-hidden />
            <ol className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <li key={s.n} className="flex flex-col rounded-xl border bg-card p-5 shadow-soft transition hover:-translate-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-primary"><s.icon className="h-4 w-4" /></span>
                    <span className="text-lg font-semibold text-primary">{s.n}</span>
                  </div>
                  <h3 className="mt-5 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  {s.note && <p className="mt-3 rounded-md border border-primary/20 bg-secondary p-2.5 text-xs text-secondary-foreground">{s.note}</p>}
                  <div className="mt-auto pt-5">
                    <div className="flex items-center gap-1.5 border-t pt-3 text-xs font-medium text-primary">
                      {s.foot} <s.fi className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-12 text-center">
            <Link to="/signup" className={btn.primary}>Sign Up Now <ArrowRight className="h-4 w-4" /></Link>
            <p className="mt-3 text-xs text-muted-foreground">Already registered? <Link to="/login" className="font-semibold text-primary hover:underline">Login</Link></p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Engineered for Regulatory Confidence</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Balancing fast digital onboarding with strong KYC and compliance controls.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {benefits.map((b) => (
              <article key={b.title} className="flex flex-col rounded-xl border bg-card p-6 shadow-soft">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary"><b.icon className="h-5 w-5" /></span>
                <h3 className="mt-5 text-lg font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
                <div className="mt-auto pt-5"><p className="flex items-center gap-1.5 border-t pt-3 text-xs font-semibold text-primary">{b.foot} <Eye className="h-3.5 w-3.5" /></p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-background px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-cta px-6 py-16 text-center text-navy-foreground shadow-soft">
          <span className="inline-block rounded-full border border-navy-foreground/20 bg-navy-foreground/10 px-4 py-1 text-[11px] font-semibold tracking-wider">FAST DIGITAL ONBOARDING</span>
          <h2 className="mt-5 text-3xl font-bold sm:text-4xl">Ready to Get Started?</h2>
          <p className="mx-auto mt-4 max-w-lg text-navy-foreground/80">Begin your application and follow your onboarding journey from submission to final decision.</p>
          <Link to="/signup" className={`${btn.primary} mt-8`}>Create Your Account <ArrowRight className="h-4 w-4" /></Link>
          <p className="mt-4 text-sm text-navy-foreground/80">Already registered? <Link to="/login" className="font-semibold underline-offset-2 hover:underline">Log in</Link></p>
        </div>
      </section>
    </PageShell>
  );
}
