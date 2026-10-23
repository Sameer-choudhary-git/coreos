import swaggerAutogen from "swagger-autogen";

const generate = swaggerAutogen({
  openapi: "3.0.0",
});

const document = {
  info: {
    title: "HCL Backend API",
    version: "1.0.0",
    description: "API documentation for the hackathon backend",
  },

  // Relative URL: works on localhost and through ngrok.
  servers: [{ url: "/" }],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
};

export async function generateOpenApi() {
  await generate(
    "./swagger-output.json",
    ["./src/app.ts"],
    document,
  );

  console.log("OpenAPI documentation generated");
}