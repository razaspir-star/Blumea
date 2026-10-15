import type { SupabaseClient } from "@supabase/supabase-js";
import type { Translator } from "@/lib/i18n/translate";

// Free creators get a taste, not the whole meal: a monthly cap on AI analyses
// (each one costs real money, owner decision 2026-10-11). The First Look (3
// videos) counts toward it, so 8 leaves 5 for the creator to choose. A creator on
// the 'pro' plan has a much higher cap; 'owner' (the founder) is unlimited. The
// numbers are proposals to revisit once real usage is known (doc/CLAUDE.md §10).
export const FREE_MONTHLY_ANALYSES = 8;
export const PRO_MONTHLY_ANALYSES = 200;

// How many of a creator's most recent videos the First Scan brings in per
// platform. The scan itself costs nothing (platform APIs, no AI); the cap is about
// what is worth paying for: free creators see their 20 most recent videos, Pro
// sees more (owner decision 2026-10-11). TikTok's API returns at most 20 anyway.
export const FREE_SCAN_VIDEOS = 20;
export const PRO_SCAN_VIDEOS = 50;

export function scanLimitFor(plan: string): number {
  return plan === "free" ? FREE_SCAN_VIDEOS : PRO_SCAN_VIDEOS;
}

export type AnalysisUsage = {
  plan: string;
  used: number;
  // null = unlimited
  cap: number | null;
  // First day of next month (UTC), when the count starts over.
  resetsOn: string;
};

function monthBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, next };
}

export async function getAnalysisUsage(admin: SupabaseClient, profileId: string): Promise<AnalysisUsage> {
  const { start, next } = monthBounds();

  const [{ data: profile }, { count }] = await Promise.all([
    admin.from("profiles").select("plan").eq("id", profileId).maybeSingle(),
    // Every AI run stores a row in video_ai_profiles; count this month's runs on
    // this creator's videos (re-analysis costs money too, so it counts).
    admin
      .from("video_ai_profiles")
      .select("id, videos!inner(profile_id)", { count: "exact", head: true })
      .eq("videos.profile_id", profileId)
      .gte("created_at", start.toISOString()),
  ]);

  const plan = (profile?.plan as string | undefined) ?? "free";
  const cap = plan === "owner" ? null : plan === "pro" ? PRO_MONTHLY_ANALYSES : FREE_MONTHLY_ANALYSES;

  return { plan, used: count ?? 0, cap, resetsOn: next.toISOString() };
}

// Words for the creator, in the product's voice: what happened, when it resets.
export function limitMessage(usage: AnalysisUsage, t: Translator): string {
  const date = new Date(usage.resetsOn).toLocaleDateString(t.locale === "he" ? "he-IL" : "en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  return t("errors.limit", { cap: usage.cap ?? 0, date });
}
