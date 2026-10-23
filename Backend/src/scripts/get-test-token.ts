import "dotenv/config";
import { supabase } from "../config/supabase.js";

async function main() {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error("Test credentials are missing from .env");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Login failed: ${error.message}`);
  }

  if (!data.session) {
    throw new Error("No session returned. Check the account confirmation.");
  }

  console.log("User ID:", data.user.id);
  console.log("Access token:", data.session.access_token);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});