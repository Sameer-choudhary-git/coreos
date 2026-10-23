import type {
  ErrorRequestHandler,
  RequestHandler,
} from "express";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler: ErrorRequestHandler = (
  err,
  _req,
  res,
  next,
) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err);

  // Handle malformed JSON requests
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};