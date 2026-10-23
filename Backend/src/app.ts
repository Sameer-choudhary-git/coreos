import express from "express";
import cors from "cors";
import helmet from "helmet";

import demoItemRouter from "./routes/demoItem.routes.js";
import userRouter from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";

import rbacTestRoutes from "./routes/rbacTest.routes.js";
import queueTestRoutes from "./routes/queueTest.routes.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/errorHandler.js";
import { requireAuth } from "./middleware/auth.js";
import applicationRoutes from "./routes/application.routes.js";


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
app.use("/api/v1/applications", applicationRoutes);
// Existing application routes
app.use("/api/demo-items", demoItemRouter);
app.use("/api/users", userRouter);
app.use("/api/v1/applications", applicationRoutes);

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
// Temporary RBAC test endpoints. Never expose in production.
if (process.env.NODE_ENV !== "production") {
  app.use("/api/v1/rbac-test", rbacTestRoutes);
    app.use("/api/v1/queue-test", queueTestRoutes);

}
// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;