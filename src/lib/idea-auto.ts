import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeYoutubeForProfile } from "@/lib/analyze-youtube";
import { getAnalysisUsage } from "@/lib/analysis-limit";
import en from "@/lib/i18n/dictionaries/en";
import he from "@/lib/i18n/dictionaries/he";
import { makeTranslator } from "@/lib/i18n/translate";

// The scheduled analysis of a video the creator posted for an idea (YouTube only: a TikTok video needs the
// creator to upload it, so TikTok gets a reminder on the Dashboard instead). Run by the daily job
// (/api/sync/all): every trial that is posted, scheduled and due is read by the AI, within the creator's monthly
// cap and a time budget; what is left waits for the next run.
export async function runDueIdeaAnalyses(admin: SupabaseClient, budgetMs = 100_000): Promise<{ done: number; failed: number; waiting: number }> {
  const started = Date.now();
  const { data: due } = await admin
    .from("idea_trials")
    .select("id, profile_id, video_id, details")
    .eq("status", "posted")
    .eq("auto", "scheduled")
    .eq("platform", "youtube")
    .lte("analyze_at", new Date().toISOString())
    .order("analyze_at", { ascending: true });

  let done = 0;
  let failed = 0;
  const list = due ?? [];
  for (const trial of list) {
    if (Date.now() - started > budgetMs) break;
    const mark = (auto: "done" | "failed", note: string | null) => admin.from("idea_trials").update({ auto, auto_note: note }).eq("id", trial.id);

    const { data: video } = trial.video_id ? await admin.from("videos").select("platform_video_id").eq("id", trial.video_id).maybeSingle() : { data: null };
    if (!video) {
      await mark("failed", "video");
      failed += 1;
      continue;
    }
    const usage = await getAnalysisUsage(admin, trial.profile_id as string);
    if (usage.cap !== null && usage.used >= usage.cap) {
      await mark("failed", "limit");
      failed += 1;
      continue;
    }
    const locale = (trial.details as { locale?: string } | null)?.locale === "he" ? "he" : "en";
    const result = await analyzeYoutubeForProfile(admin, trial.profile_id as string, video.platform_video_id as string, makeTranslator(locale, locale === "he" ? he : en)).catch(() => null);
    if (result?.ok) {
      await mark("done", null);
      done += 1;
    } else {
      await mark("failed", "analysis");
      failed += 1;
    }
  }
  return { done, failed, waiting: Math.max(0, list.length - done - failed) };
}
