import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../db/prisma.js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

// Admin client is used only by this seed script.
const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const staff = [
  {
    name: process.env.KYC_OFFICER_NAME ?? "KYC Officer",
    email: process.env.KYC_OFFICER_EMAIL,
    password: process.env.KYC_OFFICER_PASSWORD,
    role: "KYC_OFFICER" as const,
  },
  {
    name: process.env.COMPLIANCE_OFFICER_NAME ?? "Compliance Officer",
    email: process.env.COMPLIANCE_OFFICER_EMAIL,
    password: process.env.COMPLIANCE_OFFICER_PASSWORD,
    role: "COMPLIANCE_OFFICER" as const,
  },
];

async function findAuthUser(email: string) {
  // Paginate so existing accounts aren't missed.
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) throw error;

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
    );

    if (user) return user;
    if (data.users.length < 100) return null;

    page++;
  }
}

async function main() {
  for (const person of staff) {
    if (!person.email || !person.password) {
      throw new Error(`Missing credentials for ${person.role} in .env`);
    }

    let authUser = await findAuthUser(person.email);

    if (!authUser) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: person.email,
        password: person.password,
        email_confirm: true,
        user_metadata: { name: person.name },
      });

      if (error) throw error;
      if (!data.user) throw new Error(`Failed to create ${person.email}`);

      authUser = data.user;
    }

    // Never silently change a profile's primary key.
    const existingProfile = await prisma.user.findUnique({
      where: { email: person.email },
    });

    if (existingProfile && existingProfile.id !== authUser.id) {
      throw new Error(
        `Auth/profile UUID mismatch for ${person.email}. Reconcile the records before seeding.`,
      );
    }

    await prisma.user.upsert({
      where: { id: authUser.id },
      update: {
        name: person.name,
        email: person.email,
        role: person.role,
      },
      create: {
        id: authUser.id,
        name: person.name,
        email: person.email,
        role: person.role,
      },
    });

    console.log(`Seeded ${person.role}: ${person.email}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error("Staff seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });