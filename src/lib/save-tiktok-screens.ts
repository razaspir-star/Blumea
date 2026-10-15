import type { SupabaseClient } from "@supabase/supabase-js";
import { UPLOAD_BUCKET } from "@/lib/upload-limits";
import { hasUsefulNumbers, readTiktokScreenshots, type TiktokScreenStats } from "@/lib/tiktok-screens";
import type { Translator } from "@/lib/i18n/translate";

// Reads the creator's shared screenshots of a TikTok video's analytics and saves
// the numbers as a new snapshot of that video, marked as coming from the
// creator's own screenshots (never as platform data). The images are deleted
// whatever happens. Returns the numbers, or why nothing was saved.
export async function saveTiktokScreens(
  admin: SupabaseClient,
  profileId: string,
  videoRowId: string,
  paths: string[],
  t: Translator
): Promise<{ ok: true; stats: TiktokScreenStats } | { ok: false; error: string }> {
  const bucket = admin.storage.from(UPLOAD_BUCKET);
  try {
    const images: { data: Buffer; mimeType: string }[] = [];
    for (const path of paths.slice(0, 8)) {
      if (!path.startsWith(`${profileId}/`) || path.includes("..")) continue;
      const { data } = await bucket.download(path);
      if (data) images.push({ data: Buffer.from(await data.arrayBuffer()), mimeType: data.type || "image/png" });
    }
    if (images.length === 0) return { ok: false, error: t("errors.screensMissing") };

    const stats = await readTiktokScreenshots(images);
    if (!hasUsefulNumbers(stats)) {
      return { ok: false, error: t("errors.screensNoNumbers") };
    }

    // Latest known counts for the same video, so a snapshot made from screenshots
    // does not blank the likes/comments the platform gave us.
    const { data: last } = await admin
      .from("video_metric_snapshots")
      .select("views, likes, comments, shares")
      .eq("video_id", videoRowId)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    await admin.from("video_metric_snapshots").insert({
      video_id: videoRowId,
      views: last?.views ?? stats.views,
      likes: last?.likes ?? stats.likes,
      comments: last?.comments ?? stats.comments,
      shares: last?.shares ?? stats.shares,
      avg_watch_sec: stats.avgWatchSec,
      breakdowns: { tiktokScreens: { readAt: new Date().toISOString(), ...stats } },
    });

    return { ok: true, stats };
  } catch {
    return { ok: false, error: t("errors.screensFailed") };
  } finally {
    await bucket.remove(paths).catch(() => null);
  }
}
