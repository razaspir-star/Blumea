import type { SupabaseClient } from "@supabase/supabase-js";

// The event log (table app_events, readable only by the owner through the server). Short facts about what happened:
// a sign-in, an analysis, a failure. Never put secrets or a creator's own text in `props`.
export async function logEvent(admin: SupabaseClient, profileId: string | null, name: string, props: Record<string, unknown> = {}) {
  await admin
    .from("app_events")
    .insert({ profile_id: profileId, name: name.slice(0, 60), props })
    .then(
      () => undefined,
      () => undefined
    );
}
