import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only. This key bypasses Row Level Security entirely — never import
// this file from a client component, and never expose the key with a
// NEXT_PUBLIC_ prefix.
//
// Built lazily (not at module load): Next.js evaluates this module while
// collecting page data for every route at build time, even ones that never
// call it. Creating the client eagerly meant a missing env var (e.g. on a
// fresh deploy before secrets are configured) failed the entire build, not
// just the routes that actually need it.
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  cached = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
