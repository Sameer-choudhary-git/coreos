import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getMyProfile,
  saveMyProfile,
} from "../controllers/user.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/me", getMyProfile);
router.put("/me", saveMyProfile);

export default router;
