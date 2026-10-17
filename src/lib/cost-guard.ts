import type { SupabaseClient } from "@supabase/supabase-js";

// A safety net on the whole bill, on top of each creator's own monthly cap: if all creators together ask for more
// AI runs in one day than this, new runs wait until tomorrow. A runaway loop or a flood of sign-ups cannot empty the
// credit overnight. The owner is never blocked. Change it with the AI_DAILY_CAP environment variable.
export const DEFAULT_DAILY_AI_CAP = 150;

export async function aiRunsToday(admin: SupabaseClient): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const [analyses, ideas] = await Promise.all([
    admin.from("video_ai_profiles").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString()),
    admin.from("compare_events").select("id", { count: "exact", head: true }).in("kind", ["idea", "deep"]).gte("created_at", start.toISOString()),
  ]);
  return (analyses.count ?? 0) + (ideas.count ?? 0);
}

export async function overDailyCap(admin: SupabaseClient, plan: string | null | undefined): Promise<boolean> {
  if (plan === "owner") return false;
  const cap = Number(process.env.AI_DAILY_CAP) || DEFAULT_DAILY_AI_CAP;
  return (await aiRunsToday(admin)) >= cap;
}
