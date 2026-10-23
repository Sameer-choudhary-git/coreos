import { describe, expect, it } from "vitest";
import { evaluate, type Application } from "@/lib/store";

const base: Application = {
  email: "a@b.c", fullName: "Priya Sharma", dob: "1995-01-01", pan: "ABCDE1234F", aadhaarLast4: "1234",
  address: "12 MG Road, Bengaluru", docs: {}, consent: true, status: "submitted", risk: "LOW", history: [],
};

describe("rule engine", () => {
  it("auto-approves clean low-risk applications", () => expect(evaluate(base).status).toBe("approved"));
  it("requests documents for invalid PAN", () => expect(evaluate({ ...base, pan: "BAD" }).status).toBe("docs_required"));
  it("routes high-risk names to review", () => expect(evaluate({ ...base, fullName: "Test User" })).toMatchObject({ status: "under_review", risk: "HIGH" }));
});
