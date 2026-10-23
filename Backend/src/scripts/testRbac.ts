import "dotenv/config";

type Role = "APPLICANT" | "KYC_OFFICER" | "COMPLIANCE_OFFICER";

type TestUser = {
  role: Role;
  email: string;
  password: string;
};

type RoleEndpoint = {
  path: string;
  allowedRole: Role;
};

const baseUrl = (
  process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? "4000"}`
).replace(/\/$/, "");

const users: TestUser[] = [
  {
    role: "APPLICANT",
    email:
      process.env.APPLICANT_EMAIL ??
      process.env.TEST_USER_EMAIL ??
      "",
    password:
      process.env.APPLICANT_PASSWORD ??
      process.env.TEST_USER_PASSWORD ??
      "",
  },
  {
    role: "KYC_OFFICER",
    email: process.env.KYC_OFFICER_EMAIL ?? "",
    password: process.env.KYC_OFFICER_PASSWORD ?? "",
  },
  {
    role: "COMPLIANCE_OFFICER",
    email: process.env.COMPLIANCE_OFFICER_EMAIL ?? "",
    password: process.env.COMPLIANCE_OFFICER_PASSWORD ?? "",
  },
];

const roleEndpoints: RoleEndpoint[] = [
  {
    path: "/api/v1/rbac-test/applicant",
    allowedRole: "APPLICANT",
  },
  {
    path: "/api/v1/rbac-test/kyc",
    allowedRole: "KYC_OFFICER",
  },
  {
    path: "/api/v1/rbac-test/compliance",
    allowedRole: "COMPLIANCE_OFFICER",
  },
];

let passed = 0;
let failed = 0;

function check(
  description: string,
  actual: number,
  expected: number,
): void {
  if (actual === expected) {
    passed++;
    console.log(`✅ PASS | ${description} | HTTP ${actual}`);
  } else {
    failed++;
    console.error(
      `❌ FAIL | ${description} | Expected HTTP ${expected}, got ${actual}`,
    );
  }
}

function checkRole(
  description: string,
  actualRole: unknown,
  expectedRole: Role,
): void {
  if (actualRole === expectedRole) {
    passed++;
    console.log(`✅ PASS | ${description} | ${String(actualRole)}`);
  } else {
    failed++;
    console.error(
      `❌ FAIL | ${description} | Expected ${expectedRole}, got ${String(actualRole)}`,
    );
  }
}

async function request(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
    },
  });
}

async function get(
  endpoint: string,
  token?: string,
): Promise<Response> {
  return request(endpoint, {
    method: "GET",
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : {},
  });
}

async function login(user: TestUser): Promise<string> {
  const response = await request("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Login failed for ${user.role}: HTTP ${response.status}. ${
        body.message ?? JSON.stringify(body)
      }`,
    );
  }

  const token = body?.data?.session?.access_token;

  if (typeof token !== "string" || token.length === 0) {
    throw new Error(
      `Login for ${user.role} succeeded, but no access token was returned. Check auth.service.ts and auth.controller.ts.`,
    );
  }

  return token;
}

async function testUnauthenticatedAccess(): Promise<void> {
  console.log("\n--- Testing unauthenticated access ---");

  const protectedEndpoints = [
    "/api/v1/rbac-test/authenticated",
    "/api/v1/rbac-test/applicant",
    "/api/v1/rbac-test/kyc",
    "/api/v1/rbac-test/compliance",
  ];

  for (const endpoint of protectedEndpoints) {
    try {
      const response = await get(endpoint);

      check(
        `No token → ${endpoint}`,
        response.status,
        401,
      );
    } catch (error) {
      failed++;
      console.error(
        `❌ FAIL | ${endpoint} | ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

async function testUser(user: TestUser): Promise<void> {
  console.log(`\n--- Testing ${user.role} ---`);

  let token: string;

  try {
    token = await login(user);
    console.log(`Logged in successfully: ${user.role}`);
  } catch (error) {
    failed++;
    console.error(
      `❌ FAIL | ${user.role} login | ${
        error instanceof Error ? error.message : String(error)
      }`,
    );

    // Continue testing the other accounts.
    return;
  }

  // 1. Verify that the authenticated profile is accessible.
  try {
    const profileResponse = await get(
      "/api/v1/auth/me",
      token,
    );

    check(
      `${user.role} can access /api/v1/auth/me`,
      profileResponse.status,
      200,
    );

    if (profileResponse.ok) {
      const profileBody = await profileResponse.json();

      checkRole(
        `${user.role} receives the correct database role`,
        profileBody?.data?.role,
        user.role,
      );
    }
  } catch (error) {
    failed++;
    console.error(
      `❌ FAIL | ${user.role} profile test | ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  // 2. Every authenticated role should pass this endpoint.
  try {
    const response = await get(
      "/api/v1/rbac-test/authenticated",
      token,
    );

    check(
      `${user.role} can access authenticated endpoint`,
      response.status,
      200,
    );
  } catch (error) {
    failed++;
    console.error(
      `❌ FAIL | Authenticated endpoint | ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  // 3. Verify the authorization matrix.
  for (const endpoint of roleEndpoints) {
    try {
      const expectedStatus =
        user.role === endpoint.allowedRole ? 200 : 403;

      const response = await get(endpoint.path, token);

      check(
        `${user.role} → ${endpoint.path}`,
        response.status,
        expectedStatus,
      );
    } catch (error) {
      failed++;
      console.error(
        `❌ FAIL | ${user.role} → ${endpoint.path} | ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

async function main(): Promise<void> {
  console.log("\n========================================");
  console.log(" OnboardIQ Authentication & RBAC Tests");
  console.log("========================================");
  console.log(`API: ${baseUrl}`);

  // Validate credentials before running requests.
  const missingUsers = users.filter(
    (user) => !user.email || !user.password,
  );

  if (missingUsers.length > 0) {
    throw new Error(
      `Missing credentials for: ${missingUsers
        .map((user) => user.role)
        .join(", ")}. Check your Backend/.env file.`,
    );
  }

  await testUnauthenticatedAccess();

  for (const user of users) {
    await testUser(user);
  }

  console.log("\n========================================");
  console.log(" Test Summary");
  console.log("========================================");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}`);

  if (failed > 0) {
    console.error("\nSome tests failed. Review the errors above.");
    process.exitCode = 1;
  } else {
    console.log("\nAll authentication and RBAC tests passed.");
  }
}

main().catch((error: unknown) => {
  console.error(
    "\nTest execution failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});