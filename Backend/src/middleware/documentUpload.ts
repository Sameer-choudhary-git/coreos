import multer from "multer";
import type { Request, Response, NextFunction } from "express";

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 10,
    fields: 30,
    fieldSize: 16_384,
  },
});

export const uploadDocuments = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  uploader.array("documents", 10)(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      return res.status(
        error.code === "LIMIT_FILE_SIZE" ? 413 : 400,
      ).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Each document must be no larger than 2 MB"
            : error.message,
      });
    }

    next(error);
  });
};