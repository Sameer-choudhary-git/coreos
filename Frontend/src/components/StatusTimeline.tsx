import { Check } from "lucide-react";
import type { AppStatus } from "@/lib/store";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Application submitted", desc: "We have received your details" },
  { label: "Checking documents", desc: "Automated document checks" },
  { label: "Under review", desc: "Additional verification where needed" },
  { label: "Final decision", desc: "We will notify you of the outcome" },
];

function activeIndex(s: AppStatus) {
  switch (s) {
    case "draft": return -1;
    case "submitted": return 1;
    case "docs_required": return 1;
    case "under_review":
    case "pending_checker": return 2;
    case "approved":
    case "rejected": return 4;
  }
}

export function StatusTimeline({ status }: { status: AppStatus }) {
  const a = activeIndex(status);
  return (
    <ol className="space-y-5">
      {steps.map((s, i) => {
        const state = i < a ? "done" : i === a ? "active" : "pending";
        return (
          <li key={s.label} className="flex gap-3">
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2",
                state === "done" && "border-primary bg-primary text-primary-foreground",
                state === "active" && "border-primary bg-secondary",
                state === "pending" && "border-input bg-surface",
              )}
              aria-label={state}
            >
              {state === "done" ? <Check className="h-4 w-4" /> : state === "active" ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
            </span>
            <div>
              <p className={cn("text-sm font-semibold", state === "pending" && "text-muted-foreground")}>{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
