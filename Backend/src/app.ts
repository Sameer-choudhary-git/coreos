import express from "express";
import cors from "cors";
import helmet from "helmet";

import demoItemRouter from "./routes/demoItem.routes.js";
import userRouter from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";

import {
  errorHandler,
  notFoundHandler,
} from "./middleware/errorHandler.js";
import { requireAuth } from "./middleware/auth.js";

import swaggerUi from "swagger-ui-express";
import openApiSpec from "./config/openapi.js";

const app = express();

// Global middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Backend is running",
  });
});

// Authentication routes
app.use("/api/v1/auth", authRoutes);

// Existing application routes
app.use("/api/demo-items", demoItemRouter);
app.use("/api/users", userRouter);

// Get the currently authenticated user
app.get("/api/me", requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.authUser!.id,
      name: req.authUser!.name,
      email: req.authUser!.email,
      role: req.authUser!.role,
    },
  });
});

// Interactive API documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec),
);

// Machine-readable OpenAPI document
app.get("/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;