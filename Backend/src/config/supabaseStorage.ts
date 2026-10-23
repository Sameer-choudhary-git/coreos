import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecret =
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseSecret) {
  throw new Error(
    "SUPABASE_URL and a server-side Supabase secret are required",
  );
}

export const supabaseStorage = createClient(
  supabaseUrl,
  supabaseSecret,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);

export const KYC_BUCKET = "kyc-documents";