import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { queueService } from "../services/queue.service.js";

const router = Router();

router.post("/", authenticate, async (_req, res, next) => {
  try {
    const result = await queueService.sendTestMessage();

    return res.status(201).json({
      success: true,
      message: "Test message queued successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;