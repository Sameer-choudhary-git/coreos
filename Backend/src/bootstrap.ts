import { generateOpenApi } from "./config/swaggerGenerator.js";

try {
  await generateOpenApi();
  await import("./server.js");
} catch (error) {
  console.error("Failed to start backend:", error);
  process.exitCode = 1;
}