import express from "express";
import cors from "cors";
import helmet from "helmet";
import { prisma } from "./db/prisma.js";
import demoItemRouter from "./routes/demoItem.routes.js";
import { errorHandler, notFoundHandler,} from "./middleware/errorHandler.js";
import { requireAuth } from "./middleware/auth.js";
import userRouter from "./routes/user.routes.js";
import swaggerUi from "swagger-ui-express";
import openApiSpec from "./config/openapi.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Backend is running",
  });
});

app.use("/api/demo-items", demoItemRouter);
app.use("/api/users", userRouter);


app.get("/api/me", requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user!.id,
      email: req.user!.email,
    },
  });
});

// Interactive API documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec),
);

// Machine-readable OpenAPI document for Postman and other tools
app.get("/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});

app.use(notFoundHandler);
app.use(errorHandler);
export default app;