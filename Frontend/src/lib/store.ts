import type { ApiUser } from "./api";
import { useEffect, useState } from "react";

export type User = {
  id?: string;
  name: string;
  email: string;
  mobile: string;
  password: string;
  pan: string;
  aadhaar: string;
  addressProof: "electricity" | "aadhaar";
};
export type OfficerRole = "maker" | "checker";
export type AppStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "docs_required"
  | "pending_checker"
  | "approved"
  | "rejected";

export type Application = {
  email: string;
  fullName: string;
  dob: string;
  pan: string;
  aadhaarLast4: string;
  address: string;
  docs: { pan?: string; aadhaar?: string; address?: string };
  consent: boolean;
  status: AppStatus;
  risk: "LOW" | "MEDIUM" | "HIGH";
  reason?: string;
  makerNote?: string;
  history: { at: string; label: string }[];
};

const K = { users: "oiq_users", session: "oiq_session", apps: "oiq_apps", officer: "oiq_officer" };

function read<T>(k: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fb;
  } catch {
    return fb;
  }
}
function write(k: string, v: unknown) {
  localStorage.setItem(k, JSON.stringify(v));
  window.dispatchEvent(new Event("oiq-store"));
}

export const store = {
  users: () => read<User[]>(K.users, []),
  signup(u: User) {
    const users = store.users();
    if (users.some((x) => x.email.toLowerCase() === u.email.toLowerCase()))
      throw new Error("An account with this email already exists.");
    write(K.users, [...users, u]);
    write(K.session, u.email);
  },
  setAuthenticatedUser(user: ApiUser) {
    const users = store.users().filter((x) => x.email.toLowerCase() !== user.email.toLowerCase());
    write(K.users, [...users, { id: user.id, name: user.name, email: user.email, mobile: "", password: "", pan: "", aadhaar: "", addressProof: "aadhaar" }]);
    write(K.session, user.email);
  },
  login(email: string, password: string) {
    const u = store.users().find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (!u || u.password !== password) throw new Error("Incorrect email or password.");
    write(K.session, u.email);
  },
  logout: () => write(K.session, null),
  session: () => read<string | null>(K.session, null),
  currentUser: () => store.users().find((u) => u.email === store.session()) ?? null,
  apps: () => read<Application[]>(K.apps, []),
  getApp: (email: string) => store.apps().find((a) => a.email === email) ?? null,
  saveApp(app: Application) {
    const apps = store.apps().filter((a) => a.email !== app.email);
    write(K.apps, [...apps, app]);
  },
  officer: () => read<{ id: string; role: OfficerRole } | null>(K.officer, null),
  officerLogin: (id: string, role: OfficerRole) => write(K.officer, { id, role }),
  officerLogout: () => write(K.officer, null),
};

export const now = () =>
  new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

/** Deterministic rule engine (demo): decides outcome after submission. */
export function evaluate(app: Application): Pick<Application, "status" | "risk" | "reason"> {
  const nameMatch = app.fullName.trim().length >= 3;
  const panValid = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(app.pan);
  if (!panValid) return { status: "docs_required", risk: "MEDIUM", reason: "PAN number format could not be verified. Please re-upload a clear PAN card." };
  if (/test|watch/i.test(app.fullName)) return { status: "under_review", risk: "HIGH", reason: "Your application needs additional verification by our team." };
  if (app.aadhaarLast4.endsWith("0")) return { status: "under_review", risk: "MEDIUM", reason: "Some details need a manual consistency check." };
  if (nameMatch) return { status: "approved", risk: "LOW" };
  return { status: "under_review", risk: "MEDIUM", reason: "Manual review required." };
}

export function useStore<T>(sel: () => T): T | undefined {
  const [v, setV] = useState<T | undefined>(undefined);
  useEffect(() => {
    const up = () => setV(sel());
    up();
    window.addEventListener("oiq-store", up);
    window.addEventListener("storage", up);
    return () => {
      window.removeEventListener("oiq-store", up);
      window.removeEventListener("storage", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return v;
}

export const statusLabel: Record<AppStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  docs_required: "Additional documents required",
  pending_checker: "Under review",
  approved: "Approved (demo)",
  rejected: "Not approved",
};
