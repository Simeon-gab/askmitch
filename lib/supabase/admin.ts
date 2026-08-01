// Service-role Supabase client — bypasses RLS. API routes only.
// 'server-only' makes any import from client code a build error, so
// SUPABASE_SERVICE_ROLE_KEY can never reach the client bundle.
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
