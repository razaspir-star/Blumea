import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  getChannelStatistics,
  getValidYoutubeAccessToken,
  getVideoAnalytics,
  getVideoById as getYoutubeVideoById,
} from "@/lib/youtube-data";
import {
  getAccountStats,
  getValidTiktokAccessToken,
  getVideoById as getTiktokVideoById,
} from "@/lib/tiktok-data";

// Daily sync (doc/CLAUDE.md §13#7): takes a fresh snapshot of every connected
// account and of every video already analyzed, so the Dashboard can show real
// change over time. It never calls Gemini -- numbers only, no AI cost.
//
// One snapshot per account/video per day at most (MIN_GAP_HOURS), so running it
// often is harmless. A video's snapshot is skipped, and retried next time, when
// the platform returns nothing for it -- a null row would silently replace good
// numbers as the "latest" one.

const MIN_GAP_HOURS = 20;

export type SyncResult = {
  accounts: { platform: string; ok: boolean; snapshot: boolean; note?: string }[];
  videos: { synced: number; skipped: number; failed: number };
};

const hoursSince = (iso: string | null | undefined) =>
  iso ? (Date.now() - new Date(iso).getTime()) / 3_600_000 : Infinity;

export async function syncProfile(profileId: string): Promise<SyncResult> {
  const supabase = getSupabaseAdmin();
  const result: SyncResult = { accounts: [], videos: { synced: 0, skipped: 0, failed: 0 } };

  const { data: accounts } = await supabase
    .from("connected_accounts")
    .select("id, platform")
    .eq("profile_id", profileId);

  for (const account of accounts ?? []) {
    try {
      const token =
        account.platform === "youtube"
          ? await getValidYoutubeAccessToken(profileId)
          : account.platform === "tiktok"
            ? await getValidTiktokAccessToken(profileId)
            : null;
      if (!token) {
        result.accounts.push({ platform: account.platform, ok: false, snapshot: false, note: "platform not supported yet" });
        continue;
      }

      const { data: last } = await supabase
        .from("account_snapshots")
        .select("captured_at")
        .eq("connected_account_id", account.id)
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let snapshot = false;
      if (hoursSince(last?.captured_at) >= MIN_GAP_HOURS) {
        if (account.platform === "youtube") {
          const stats = await getChannelStatistics(token);
          await supabase.from("account_snapshots").insert({
            connected_account_id: account.id,
            followers_count: stats.subscriberCount,
            total_views: stats.totalViews,
          });
        } else {
          const stats = await getAccountStats(token);
          await supabase.from("account_snapshots").insert({
            connected_account_id: account.id,
            followers_count: stats.followerCount,
          });
        }
        snapshot = true;
      }
      result.accounts.push({ platform: account.platform, ok: true, snapshot });

      await syncVideos(profileId, account.platform, token, result);
    } catch (error) {
      result.accounts.push({
        platform: account.platform,
        ok: false,
        snapshot: false,
        note: String(error instanceof Error ? error.message : error).slice(0, 200),
      });
    }
  }

  return result;
}

// A few videos at a time: a First Scan covers up to 50 videos and each YouTube
// video needs several Analytics calls.
const CONCURRENCY = 4;

export async function syncVideos(profileId: string, platform: string, token: string, result: SyncResult) {
  const supabase = getSupabaseAdmin();
  const { data: videos } = await supabase
    .from("videos")
    .select("id, platform_video_id, published_at")
    .eq("profile_id", profileId)
    .eq("platform", platform);

  async function syncOne(video: { id: string; platform_video_id: string; published_at: string | null }) {
    const { data: last } = await supabase
      .from("video_metric_snapshots")
      .select("captured_at, avg_watch_sec")
      .eq("video_id", video.id)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (hoursSince(last?.captured_at) < MIN_GAP_HOURS) {
      result.videos.skipped += 1;
      return;
    }

    try {
      if (platform === "youtube") {
        const meta = await getYoutubeVideoById(token, video.platform_video_id);
        const analytics = await getVideoAnalytics(token, video.platform_video_id, video.published_at ?? meta.publishedAt).catch(() => null);
        // Had watch data before, none now: the Analytics call failed quietly. Retry later.
        if (last?.avg_watch_sec !== null && last?.avg_watch_sec !== undefined && analytics?.avgWatchSec == null) {
          result.videos.failed += 1;
          return;
        }
        const breakdowns =
          analytics?.trafficSource || analytics?.subscribedStatus || analytics?.engagement || analytics?.growth
            ? {
                ...(analytics.trafficSource ? { trafficSource: analytics.trafficSource } : {}),
                ...(analytics.subscribedStatus ? { subscribedStatus: analytics.subscribedStatus } : {}),
                ...(analytics.engagement ? { engagement: analytics.engagement } : {}),
                ...(analytics.growth ? { growth: analytics.growth } : {}),
              }
            : null;
        await supabase.from("video_metric_snapshots").insert({
          video_id: video.id,
          views: meta.views,
          likes: meta.likes,
          comments: meta.comments,
          avg_watch_sec: analytics?.avgWatchSec ?? null,
          retention_curve: analytics?.retentionCurve ?? null,
          breakdowns,
        });
      } else if (platform === "tiktok") {
        const meta = await getTiktokVideoById(token, video.platform_video_id);
        await supabase.from("video_metric_snapshots").insert({
          video_id: video.id,
          views: meta.views,
          likes: meta.likes,
          comments: meta.comments,
          shares: meta.shares,
        });
      }
      result.videos.synced += 1;
    } catch {
      result.videos.failed += 1;
    }
  }

  const queue = [...(videos ?? [])];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let video = queue.shift(); video; video = queue.shift()) await syncOne(video);
    })
  );
}