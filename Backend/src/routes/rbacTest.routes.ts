import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

// Any authenticated role
router.get("/authenticated", authenticate, (_req, res) => {
  res.json({ success: true, access: "AUTHENTICATED" });
});

// Applicant only
router.get(
  "/applicant",
  authenticate,
  requireRole("APPLICANT"),
  (_req, res) => {
    res.json({ success: true, access: "APPLICANT" });
  },
);

// KYC Officer only
router.get(
  "/kyc",
  authenticate,
  requireRole("KYC_OFFICER"),
  (_req, res) => {
    res.json({ success: true, access: "KYC_OFFICER" });
  },
);

// Compliance Officer only
router.get(
  "/compliance",
  authenticate,
  requireRole("COMPLIANCE_OFFICER"),
  (_req, res) => {
    res.json({ success: true, access: "COMPLIANCE_OFFICER" });
  },
);

export default router;