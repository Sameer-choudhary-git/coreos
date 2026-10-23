import type { Request, Response, NextFunction } from "express";

import {
  applicationService,
  ApplicationSubmissionError,
} from "../services/application.service.js";

export const submitApplication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.authUser) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];

    const result = await applicationService.submit(
      req.authUser.id,
      req.body as Record<string, unknown>,
      files,
    );

    return res.status(201).json({
      success: true,
      message: "Application submitted, documents stored, OCR completed and processing queued",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApplicationSubmissionError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      });
    }

    next(error);
  }
};