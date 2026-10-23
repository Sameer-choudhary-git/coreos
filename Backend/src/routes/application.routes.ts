import { Router } from "express";

import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { uploadDocuments } from "../middleware/documentUpload.js";
import { submitApplication } from "../controllers/application.controller.js";

const router = Router();

router.post(
  "/",
  authenticate,
  requireRole("APPLICANT"),
  uploadDocuments,
  submitApplication,
);

export default router;