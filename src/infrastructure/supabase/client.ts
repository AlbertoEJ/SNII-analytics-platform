import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const schema = process.env.SNII_DB_SCHEMA ?? "snii";

// We use untyped clients because the generated DB types live in a non-public
// schema; a generic `SupabaseClient` is sufficient for our hand-written mappers.
export type SnSupabaseClient = SupabaseClient<any, any, any, any, any>;

let browserClient: SnSupabaseClient | null = null;

export function getBrowserClient(): SnSupabaseClient {
  if (!browserClient) {
    browserClient = createClient(url, anonKey, { db: { schema } }) as SnSupabaseClient;
  }
  return browserClient;
}

export function getServerClient(): SnSupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = serviceKey ?? anonKey;
  return createClient(url, key, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as SnSupabaseClient;
}
