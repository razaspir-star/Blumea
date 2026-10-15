import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { listVideosWithStats as listYoutubeVideos, getValidYoutubeAccessToken } from "@/lib/youtube-data";
import { listVideosWithStats as listTiktokVideos, getValidTiktokAccessToken } from "@/lib/tiktok-data";
import { syncVideos, type SyncResult } from "@/lib/sync";
import { scanLimitFor } from "@/lib/analysis-limit";
import { saveThumbnails } from "@/lib/video-thumbnails";

// First Scan (doc/CLAUDE.md §6): after a creator connects an account, bring in
// their most recent videos with their numbers -- no AI, so no cost -- so the
// Dashboard and Content have something real to show at once. YouTube: the most
// recent videos (20 on the free plan, 50 on Pro), with watch time and retention
// from YouTube Analytics. TikTok: up to 20 (the Display API's page size), numbers
// only.
//
// New videos are added in "lite" mode; a video that already exists (for example
// one the creator analyzed) is left exactly as it is.

export type ScanResult = { platform: string; listed: number; added: number; note?: string }[];

export async function scanProfile(profileId: string): Promise<{ scan: ScanResult; sync: SyncResult }> {
  const supabase = getSupabaseAdmin();
  const scan: ScanResult = [];
  const sync: SyncResult = { accounts: [], videos: { synced: 0, skipped: 0, failed: 0 } };

  const { data: accounts } = await supabase
    .from("connected_accounts")
    .select("id, platform")
    .eq("profile_id", profileId);

  // Free creators see their 20 most recent videos per platform; Pro and the owner, 50.
  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", profileId).maybeSingle();
  const limit = scanLimitFor((profile?.plan as string | undefined) ?? "free");

  for (const account of accounts ?? []) {
    try {
      let rows: { platform_video_id: string; title: string; published_at: string; duration_sec: number }[] = [];
      let covers: { platformVideoId: string; url: string }[] = [];
      let token: string;

      if (account.platform === "youtube") {
        token = await getValidYoutubeAccessToken(profileId);
        rows = (await listYoutubeVideos(token, limit)).map((video) => ({
          platform_video_id: video.platformVideoId,
          title: video.title,
          published_at: video.publishedAt,
          duration_sec: video.durationSec,
        }));
      } else if (account.platform === "tiktok") {
        token = await getValidTiktokAccessToken(profileId);
        const listed = await listTiktokVideos(token, Math.min(limit, 20));
        covers = listed.map((video) => ({ platformVideoId: video.platformVideoId, url: video.thumbnail }));
        rows = listed.map((video) => ({
          platform_video_id: video.platformVideoId,
          title: video.title,
          published_at: video.createTime,
          duration_sec: video.durationSec,
        }));
      } else {
        continue;
      }

      const { data: existing } = await supabase
        .from("videos")
        .select("platform_video_id, thumbnail_path")
        .eq("profile_id", profileId)
        .eq("platform", account.platform);
      const known = new Set((existing ?? []).map((row) => row.platform_video_id as string));
      const hasCover = new Set((existing ?? []).filter((row) => row.thumbnail_path).map((row) => row.platform_video_id as string));
      const fresh = rows.filter((row) => !known.has(row.platform_video_id));

      if (fresh.length > 0) {
        await supabase.from("videos").insert(
          fresh.map((row) => ({
            profile_id: profileId,
            connected_account_id: account.id,
            platform: account.platform,
            analysis_mode: "lite",
            ...row,
          }))
        );
      }

      // TikTok covers are copied to our storage (the link TikTok gives expires within hours).
      await saveThumbnails(supabase, profileId, account.platform, covers.filter((cover) => !hasCover.has(cover.platformVideoId)));

      scan.push({ platform: account.platform, listed: rows.length, added: fresh.length });

      // Numbers for every video that has none yet (and a fresh snapshot for the rest).
      await syncVideos(profileId, account.platform, token, sync);
    } catch (error) {
      scan.push({
        platform: account.platform,
        listed: 0,
        added: 0,
        note: String(error instanceof Error ? error.message : error).slice(0, 200),
      });
    }
  }

  return { scan, sync };
}
