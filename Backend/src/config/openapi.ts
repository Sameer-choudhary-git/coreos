import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const filePath = resolve(process.cwd(), "src/swagger-output.json");

const openApiSpec = JSON.parse(
  readFileSync(filePath, "utf8"),
);

export default openApiSpec;