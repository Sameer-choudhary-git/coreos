import { generateOpenApi } from "../config/swaggerGenerator.js";

generateOpenApi().catch((error: unknown) => {
  console.error("OpenAPI generation failed:", error);
  process.exitCode = 1;
});