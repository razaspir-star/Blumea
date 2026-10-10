import { supabase } from "@/lib/supabase";
import { median } from "@/lib/insight-patterns";
import { stayedToWatchPct, type CommentBaseline, type OpeningBaseline } from "@/lib/insight-rules";

// A format cohort needs at least this many OTHER videos of the same format
// before it replaces the whole-channel baseline (Insight_Engine_Spec.md §4,
// "niche baseline", same minimum as the niche cohort).
export const FORMAT_COHORT_MIN = 8;

// The creator's "usual" opening (Insight_Engine_Spec.md §4): median of
// "stayed to watch" over their OTHER analyzed YouTube videos (the video being
// judged is left out so it can't pull its own baseline toward itself). Capped
// at the 50 most recent videos, per the spec. When the video's format has at
// least FORMAT_COHORT_MIN other videos, the baseline is that cohort's median
// (a talking video is judged against talking videos, not against dances);
// otherwise it falls back to the whole channel. Runs under the signed-in user's
// session, so RLS keeps it to their own rows.
// The creator's usual comments per 100 views (median over their OTHER YouTube
// videos with at least 500 views, latest snapshot each).
export async function loadCommentBaseline(excludeVideoId: string): Promise<CommentBaseline | null> {
  const { data: videos } = await supabase
    .from("videos")
    .select("id")
    .eq("platform", "youtube")
    .neq("id", excludeVideoId)
    .order("published_at", { ascending: false })
    .limit(50);
  if (!videos || videos.length === 0) return null;

  const { data: snapshots } = await supabase
    .from("video_metric_snapshots")
    .select("video_id, views, comments, captured_at")
    .in("video_id", videos.map((video) => video.id))
    .order("captured_at", { ascending: false });
  if (!snapshots) return null;

  const seen = new Set<string>();
  const rates: number[] = [];
  for (const snapshot of snapshots) {
    if (seen.has(snapshot.video_id)) continue;
    seen.add(snapshot.video_id);
    if ((snapshot.views ?? 0) >= 500 && snapshot.comments !== null) rates.push((snapshot.comments / snapshot.views) * 100);
  }
  return rates.length ? { medianPer100Views: median(rates), count: rates.length } : null;
}

export async function loadOpeningBaseline(
  excludeVideoId: string,
  formatId?: string | null
): Promise<OpeningBaseline | null> {
  const { data: videos } = await supabase
    .from("videos")
    .select("id")
    .eq("platform", "youtube")
    .neq("id", excludeVideoId)
    .order("published_at", { ascending: false })
    .limit(50);
  if (!videos || videos.length === 0) return null;
  const ids = videos.map((video) => video.id);

  const [{ data: snapshots }, { data: profiles }] = await Promise.all([
    supabase
      .from("video_metric_snapshots")
      .select("video_id, breakdowns, captured_at")
      .in("video_id", ids)
      .order("captured_at", { ascending: false }),
    formatId
      ? supabase.from("video_ai_profiles").select("video_id, fields").in("video_id", ids).eq("is_current", true)
      : Promise.resolve({ data: null }),
  ]);
  if (!snapshots) return null;

  const latest = new Map<string, number>();
  const seen = new Set<string>();
  for (const snapshot of snapshots) {
    if (seen.has(snapshot.video_id)) continue;
    seen.add(snapshot.video_id);
    const pct = stayedToWatchPct((snapshot.breakdowns as { engagement?: { views: number; engagedViews: number } } | null)?.engagement);
    if (pct !== null) latest.set(snapshot.video_id, pct);
  }
  if (latest.size === 0) return null;

  if (formatId && profiles) {
    const sameFormat = [...latest.entries()].filter(([videoId]) => {
      const fields = profiles.find((profile) => profile.video_id === videoId)?.fields as
        | Record<string, { value?: unknown }>
        | undefined;
      return fields?.format?.value === formatId;
    });
    if (sameFormat.length >= FORMAT_COHORT_MIN) {
      return {
        medianStayedPct: median(sameFormat.map(([, pct]) => pct)),
        count: sameFormat.length,
        scopeFormatId: formatId,
      };
    }
  }

  return { medianStayedPct: median([...latest.values()]), count: latest.size };
}
