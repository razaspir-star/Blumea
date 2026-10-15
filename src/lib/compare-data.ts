import { supabase } from "@/lib/supabase";
import type { TiktokScreenStats } from "@/lib/tiktok-screens";

// One of the creator's videos with everything Compare may use: the platform's
// numbers, the watch data, and what the AI read. Loaded under the signed-in user's
// session, so row-level security keeps it to their own videos.
export type CompareVideo = {
  id: string;
  platform: string;
  platformVideoId: string;
  title: string;
  publishedAt: string | null;
  durationSec: number | null;
  thumbnailUrl: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  avgWatchSec: number | null;
  retentionCurve: { elapsedRatio: number; watchRatio: number }[] | null;
  breakdowns: {
    trafficSource?: { source: string; label: string; views: number }[];
    subscribedStatus?: { subscribed: boolean; views: number; avgViewDurationSec: number }[];
    engagement?: { views: number; engagedViews: number };
  } | null;
  tiktokScreens: TiktokScreenStats | null;
  fields: Record<string, { value?: unknown }> | null;
};

export async function loadCompareVideo(id: string): Promise<CompareVideo | null> {
  const { data: video } = await supabase
    .from("videos")
    .select("id, platform, platform_video_id, title, published_at, duration_sec, thumbnail_path")
    .eq("id", id)
    .maybeSingle();
  if (!video) return null;

  const [{ data: metric }, { data: profile }, { data: screensRow }] = await Promise.all([
    supabase
      .from("video_metric_snapshots")
      .select("views, likes, comments, shares, avg_watch_sec, retention_curve, breakdowns")
      .eq("video_id", id)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("video_ai_profiles").select("fields").eq("video_id", id).eq("is_current", true).maybeSingle(),
    // TikTok numbers read from the creator's screenshots live in an older snapshot.
    video.platform === "tiktok"
      ? supabase
          .from("video_metric_snapshots")
          .select("breakdowns")
          .eq("video_id", id)
          .not("breakdowns->tiktokScreens", "is", null)
          .order("captured_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const youtube = video.platform === "youtube";
  const thumbnailUrl = youtube
    ? `https://i.ytimg.com/vi/${video.platform_video_id}/mqdefault.jpg`
    : video.thumbnail_path
      ? supabase.storage.from("video-thumbs").getPublicUrl(video.thumbnail_path).data.publicUrl
      : null;

  return {
    id: video.id,
    platform: video.platform,
    platformVideoId: video.platform_video_id,
    title: video.title,
    publishedAt: video.published_at ?? null,
    durationSec: video.duration_sec ?? null,
    thumbnailUrl,
    views: metric?.views ?? null,
    likes: metric?.likes ?? null,
    comments: metric?.comments ?? null,
    shares: metric?.shares ?? null,
    // TikTok gives no watch data of its own: only the creator's screenshots, shown separately.
    avgWatchSec: youtube && metric?.avg_watch_sec != null ? Number(metric.avg_watch_sec) : null,
    retentionCurve: youtube ? ((metric?.retention_curve as CompareVideo["retentionCurve"]) ?? null) : null,
    breakdowns: youtube ? ((metric?.breakdowns as CompareVideo["breakdowns"]) ?? null) : null,
    tiktokScreens:
      ((screensRow?.breakdowns as { tiktokScreens?: TiktokScreenStats } | null)?.tiktokScreens as TiktokScreenStats | undefined) ?? null,
    fields: (profile?.fields as CompareVideo["fields"]) ?? null,
  };
}

// The second with the largest single fall of the retention curve, or null.
export function biggestDropAt(curve: CompareVideo["retentionCurve"], durationSec: number | null): number | null {
  if (!curve || curve.length < 2 || !durationSec) return null;
  let worst = { at: -1, fall: 0 };
  for (let i = 1; i < curve.length; i += 1) {
    const fall = curve[i - 1].watchRatio - curve[i].watchRatio;
    if (fall > worst.fall) worst = { at: curve[i].elapsedRatio, fall };
  }
  return worst.at >= 0 ? Math.round(worst.at * durationSec) : null;
}
