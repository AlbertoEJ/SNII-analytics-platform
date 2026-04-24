import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const schema = process.env.SNII_DB_SCHEMA ?? "snii";

export type SnSupabaseClient = SupabaseClient<any, any, any, any, any>;

/** Server-side read client. Uses the anon key so RLS still applies. */
export function getReadClient(): SnSupabaseClient {
  return createClient(url, anonKey, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as SnSupabaseClient;
}

/**
 * Service-role client. Bypasses RLS — use only for trusted admin paths
 * (the Excel importer). Throws if the service-role key is not configured.
 */
export function getAdminClient(): SnSupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for the admin client");
  }
  return createClient(url, serviceKey, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as SnSupabaseClient;
}
