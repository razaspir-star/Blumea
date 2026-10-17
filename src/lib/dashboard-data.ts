import { supabase } from "@/lib/supabase";
import { median } from "@/lib/insight-patterns";
import { PAYOFF_FORMATS } from "@/lib/format-library";
import { lengthVsWatchSharePattern, type LengthWatchPattern } from "@/lib/insight-patterns";
import {
  biggestDropRule,
  payoffAfterAvgWatchRule,
  stayedToWatchPct,
  type KeyMoment,
} from "@/lib/insight-rules";
import { platformHas } from "@/lib/platform-capabilities";
import {
  followerInsight,
  postingTimeInsight,
  rewatchInsight,
  ctaInsight,
  type CtaInsight,
  type FollowerInsight,
  type PostingTimeInsight,
  type RewatchInsight,
} from "@/lib/cross-video-insights";

// Everything the Dashboard shows as real comes from here: the connected
// accounts' latest snapshots and the creator's own analyzed videos (latest
// metrics + current AI profile each). RLS keeps every query to the signed-in
// user. No time series exists yet (doc/CLAUDE.md §13#7), so nothing here is a
// week-over-week change.

export type DashboardAccount = {
  id: string;
  platform: string;
  followers: number | null;
  totalViews: number | null;
  capturedAt: string | null;
  // The snapshot to compare with: one at least ~a day older than the latest,
  // preferring the one closest to a week before it. Null until history exists.
  previous: { followers: number | null; totalViews: number | null; daysAgo: number } | null;
};

export type DashboardVideo = {
  id: string;
  platform: string;
  platformVideoId: string;
  title: string;
  durationSec: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  avgWatchSec: number | null;
  retentionCurve: { elapsedRatio: number; watchRatio: number }[] | null;
  keyMoments: KeyMoment[] | null;
  publishedAt: string | null;
  formatId: string | null;
  // What the video itself asks viewers to do (prompt v7). `ctaRead` is false for
  // videos analyzed before v7 -- "no ask found" and "never looked" differ.
  ctaRead: boolean;
  cta: { type: string; text: string } | null;
  // True when Blumea has read the video with AI (an AI profile exists). A video
  // found by the First Scan has numbers only.
  analyzed: boolean;
  // How the opening works (hook library id) and the "stayed past the opening" estimate, for comparisons.
  hookTypeId: string | null;
  stayedPct: number | null;
  // A picture for the card: TikTok covers copied to our storage (YouTube builds its own from the id).
  thumbnailUrl: string | null;
  // From the YouTube Analytics breakdowns (null when not available yet).
  analyticsViews: number | null;
  subscribedViews: number | null;
  followersGained: number | null;
};

export type DashboardData = { accounts: DashboardAccount[]; videos: DashboardVideo[] };

export async function loadDashboardData(): Promise<DashboardData> {
  const { data: accountRows } = await supabase.from("connected_accounts").select("id, platform");

  const accounts: DashboardAccount[] = await Promise.all(
    (accountRows ?? []).map(async (account) => {
      const { data: history } = await supabase
        .from("account_snapshots")
        .select("followers_count, total_views, captured_at")
        .eq("connected_account_id", account.id)
        .order("captured_at", { ascending: false })
        .limit(200);
      const latest = history?.[0];
      const latestTime = latest ? new Date(latest.captured_at).getTime() : 0;
      const dayMs = 86_400_000;

      // Older snapshots only (>= 20 h before the latest); closest to 7 days back wins.
      const older = (history ?? []).filter((s) => latestTime - new Date(s.captured_at).getTime() >= 20 * 3_600_000);
      const reference = older.sort(
        (a, b) =>
          Math.abs(latestTime - new Date(a.captured_at).getTime() - 7 * dayMs) -
          Math.abs(latestTime - new Date(b.captured_at).getTime() - 7 * dayMs)
      )[0];

      return {
        id: account.id as string,
        platform: account.platform as string,
        followers: latest?.followers_count ?? null,
        totalViews: latest?.total_views ?? null,
        capturedAt: latest?.captured_at ?? null,
        previous: reference
          ? {
              followers: reference.followers_count ?? null,
              totalViews: reference.total_views ?? null,
              daysAgo: Math.max(1, Math.round((latestTime - new Date(reference.captured_at).getTime()) / dayMs)),
            }
          : null,
      };
    })
  );

  const { data: videoRows } = await supabase
    .from("videos")
    .select("id, platform, platform_video_id, title, duration_sec, published_at, thumbnail_path");
  if (!videoRows || videoRows.length === 0) return { accounts, videos: [] };
  const ids = videoRows.map((video) => video.id);

  const [{ data: snapshots }, { data: profiles }] = await Promise.all([
    supabase
      .from("video_metric_snapshots")
      .select("video_id, views, likes, comments, avg_watch_sec, retention_curve, breakdowns, captured_at")
      .in("video_id", ids)
      .order("captured_at", { ascending: false }),
    supabase.from("video_ai_profiles").select("video_id, fields").in("video_id", ids).eq("is_current", true),
  ]);

  const latest = new Map<string, NonNullable<typeof snapshots>[number]>();
  for (const snapshot of snapshots ?? []) if (!latest.has(snapshot.video_id)) latest.set(snapshot.video_id, snapshot);

  const videos: DashboardVideo[] = [];
  for (const video of videoRows) {
    const snapshot = latest.get(video.id);
    if (!snapshot) continue; // never analyzed with metrics: nothing to show
    const fields = profiles?.find((profile) => profile.video_id === video.id)?.fields as
      | Record<string, { value?: unknown }>
      | undefined;
    videos.push({
      id: video.id,
      platform: video.platform,
      platformVideoId: video.platform_video_id,
      title: video.title,
      durationSec: video.duration_sec ?? null,
      views: snapshot.views ?? null,
      likes: snapshot.likes ?? null,
      comments: snapshot.comments ?? null,
      avgWatchSec: snapshot.avg_watch_sec !== null ? Number(snapshot.avg_watch_sec) : null,
      retentionCurve: (snapshot.retention_curve as DashboardVideo["retentionCurve"]) ?? null,
      keyMoments: (fields?.key_moments?.value as KeyMoment[] | undefined) ?? null,
      publishedAt: video.published_at ?? null,
      formatId: typeof fields?.format?.value === "string" ? (fields.format.value as string) : null,
      analyzed: fields !== undefined,
      hookTypeId: typeof fields?.hook_type?.value === "string" ? (fields.hook_type.value as string) : null,
      stayedPct: stayedToWatchPct((snapshot.breakdowns as { engagement?: { views: number; engagedViews: number } } | null)?.engagement),
      thumbnailUrl: video.thumbnail_path ? supabase.storage.from("video-thumbs").getPublicUrl(video.thumbnail_path).data.publicUrl : null,
      ctaRead: fields !== undefined && "call_to_action" in fields,
      cta: ctaOf(fields?.call_to_action?.value),
      ...followerFields(snapshot.breakdowns as Record<string, unknown> | null),
    });
  }
  return { accounts, videos };
}

function ctaOf(value: unknown): DashboardVideo["cta"] {
  if (!value || typeof value !== "object") return null;
  const { type, text } = value as { type?: unknown; text?: unknown };
  return typeof type === "string" ? { type, text: typeof text === "string" ? text : "" } : null;
}

function followerFields(breakdowns: Record<string, unknown> | null) {
  const status = (breakdowns?.subscribedStatus as { subscribed: boolean; views: number }[] | undefined) ?? null;
  const growth = (breakdowns?.growth as { gained: number } | undefined) ?? null;
  return {
    analyticsViews: status ? status.reduce((sum, row) => sum + row.views, 0) : null,
    subscribedViews: status ? (status.find((row) => row.subscribed)?.views ?? 0) : null,
    followersGained: growth ? growth.gained : null,
  };
}

export type Change = { amount: number; percent: number | null; daysAgo: number };

export type DashboardTotals = {
  followers: number;
  followersChange: Change | null;
  perPlatformFollowers: { platform: string; followers: number }[];
  views: { total: number; platforms: string[]; allConnectedReport: boolean; change: Change | null } | null;
};

// Change since the comparison snapshot, summed over the accounts that have one.
function changeOf(accounts: DashboardAccount[], pick: (a: { followers: number | null; totalViews: number | null }) => number | null): Change | null {
  const withPrev = accounts.filter((a) => a.previous && pick(a) !== null && pick(a.previous) !== null);
  // A change is only honest for the whole total: if one account has no earlier
  // snapshot yet (e.g. just connected), showing the others' change next to the
  // combined number would misstate it.
  if (withPrev.length === 0 || withPrev.length !== accounts.length) return null;
  const now = withPrev.reduce((s, a) => s + (pick(a) ?? 0), 0);
  const before = withPrev.reduce((s, a) => s + (pick(a.previous!) ?? 0), 0);
  const days = withPrev.map((a) => a.previous!.daysAgo).sort((x, y) => x - y);
  return {
    amount: now - before,
    percent: before > 0 ? ((now - before) / before) * 100 : null,
    daysAgo: days[Math.floor(days.length / 2)],
  };
}

// Followers exist everywhere, so they always blend; account views only from
// platforms that report them (platform-capabilities.ts).
export function accountTotals(accounts: DashboardAccount[], platforms: Set<string>): DashboardTotals | null {
  const real = accounts.filter((a) => platforms.has(a.platform) && a.followers !== null);
  if (real.length === 0) return null;
  const viewsCapable = real.filter((a) => platformHas(a.platform, "accountViews"));
  return {
    followers: real.reduce((sum, a) => sum + (a.followers ?? 0), 0),
    followersChange: changeOf(real, (a) => a.followers),
    perPlatformFollowers: real.map((a) => ({ platform: a.platform, followers: a.followers ?? 0 })),
    views:
      viewsCapable.length > 0
        ? {
            total: viewsCapable.reduce((sum, a) => sum + (a.totalViews ?? 0), 0),
            platforms: viewsCapable.map((a) => a.platform),
            allConnectedReport: viewsCapable.length === real.length,
            change: changeOf(viewsCapable, (a) => a.totalViews),
          }
        : null,
  };
}

export const CROSS_VIDEO_MIN = 3; // videos that must show an observation before the Dashboard calls it out

export type DashboardDerived = {
  analyzedCount: number;
  // Likes + comments exist on every platform; shares/saves don't, so they stay out.
  engagement: { ratePct: number } | null;
  interactions: number | null;
  interactionsByPlatform: { platform: string; interactions: number }[];
  // Views mean different things on different platforms (spec §4), so videos
  // are never ranked against each other across platforms: with more than one
  // platform, `top` is the single best video of each.
  top: DashboardVideo[];
  topPerPlatform: boolean;
  lengthPattern: LengthWatchPattern | null;
  followers: FollowerInsight | null;
  posting: PostingTimeInsight | null;
  rewatch: RewatchInsight | null;
  cta: CtaInsight | null;
  // Plain facts about the creator's usual video, shown when no pattern
  // qualifies (a consistent style is not a problem to fix).
  typical: {
    count: number;
    medianDurationSec: number;
    medianWatchSharePct: number;
    best: { id: string; title: string; sharePct: number };
    worst: { id: string; title: string; sharePct: number };
  } | null;
  payoff: { fires: number; of: number } | null;
  drops: { count: number; of: number; medianAtSec: number } | null;
};

function typicalVideo(videos: DashboardVideo[]): DashboardDerived["typical"] {
  const withWatch = videos
    .filter((v) => v.platform === "youtube" && v.durationSec && v.avgWatchSec !== null)
    .map((v) => ({ id: v.id, title: v.title, durationSec: v.durationSec as number, sharePct: ((v.avgWatchSec as number) / (v.durationSec as number)) * 100 }));
  if (withWatch.length === 0) return null;
  const bySharePct = [...withWatch].sort((a, b) => b.sharePct - a.sharePct);
  return {
    count: withWatch.length,
    medianDurationSec: median(withWatch.map((v) => v.durationSec)),
    medianWatchSharePct: median(withWatch.map((v) => v.sharePct)),
    best: { id: bySharePct[0].id, title: bySharePct[0].title, sharePct: bySharePct[0].sharePct },
    worst: { id: bySharePct[bySharePct.length - 1].id, title: bySharePct[bySharePct.length - 1].title, sharePct: bySharePct[bySharePct.length - 1].sharePct },
  };
}

function topVideos(withViews: DashboardVideo[]): { top: DashboardVideo[]; topPerPlatform: boolean } {
  const byViews = (a: DashboardVideo, b: DashboardVideo) => (b.views ?? 0) - (a.views ?? 0);
  const platforms = [...new Set(withViews.map((v) => v.platform))];
  if (platforms.length > 1) {
    const best = platforms.map((p) => withViews.filter((v) => v.platform === p).sort(byViews)[0]);
    return { top: best.slice(0, 3), topPerPlatform: true };
  }
  return { top: [...withViews].sort(byViews).slice(0, 3), topPerPlatform: false };
}

export function deriveDashboard(videos: DashboardVideo[], accounts: DashboardAccount[] = []): DashboardDerived {
  const youtubeFollowers = accounts.find((a) => a.platform === "youtube")?.followers ?? null;
  const youtubeVideos = videos.filter((v) => v.platform === "youtube");
  const withViews = videos.filter((v) => v.views !== null && v.views > 0);
  const totalViews = withViews.reduce((sum, v) => sum + (v.views ?? 0), 0);
  const interactions = videos.reduce((sum, v) => sum + (v.likes ?? 0) + (v.comments ?? 0), 0);

  const lengthPoints = videos
    .filter((v) => v.platform === "youtube" && v.durationSec && v.avgWatchSec !== null)
    .map((v) => ({ durationSec: v.durationSec as number, avgWatchSec: v.avgWatchSec as number, formatId: v.formatId }));

  // Payoff: only videos where a reveal/peak moment was read AND watch time exists.
  const payoffCandidates = videos.filter(
    (v) =>
      v.durationSec &&
      v.avgWatchSec !== null &&
      v.formatId !== null &&
      PAYOFF_FORMATS.includes(v.formatId) &&
      v.keyMoments?.some((m) => m.type === "reveal" || m.type === "peak")
  );
  const payoffFires = payoffCandidates.filter(
    (v) => payoffAfterAvgWatchRule({ durationSec: v.durationSec, avgWatchSec: v.avgWatchSec, keyMoments: v.keyMoments }) !== null
  ).length;

  const dropCandidates = videos.filter((v) => v.durationSec && v.retentionCurve && v.retentionCurve.length > 1);
  const dropTimes = dropCandidates
    .map((v) => biggestDropRule({ durationSec: v.durationSec, retentionCurve: v.retentionCurve, keyMoments: v.keyMoments }))
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .map((d) => d.atSec);

  return {
    analyzedCount: videos.length,
    engagement: totalViews > 0 ? { ratePct: ((withViews.reduce((s, v) => s + (v.likes ?? 0) + (v.comments ?? 0), 0)) / totalViews) * 100 } : null,
    interactions: videos.length > 0 ? interactions : null,
    interactionsByPlatform: [...new Set(videos.map((v) => v.platform))].map((platform) => ({
      platform,
      interactions: videos.filter((v) => v.platform === platform).reduce((s, v) => s + (v.likes ?? 0) + (v.comments ?? 0), 0),
    })),
    ...topVideos(withViews),
    lengthPattern: lengthVsWatchSharePattern(lengthPoints),
    followers: followerInsight(
      youtubeVideos.map((v) => ({
        id: v.id,
        title: v.title,
        views: v.analyticsViews,
        subscribedViews: v.subscribedViews,
        gained: v.followersGained,
        durationSec: v.durationSec,
      })),
      youtubeFollowers
    ),
    // One platform only: views are never compared across platforms.
    posting: postingTimeInsight(youtubeVideos.map((v) => ({ publishedAt: v.publishedAt, views: v.views }))),
    cta: ctaInsight(
      youtubeVideos.map((v) => ({
        id: v.id,
        title: v.title,
        views: v.analyticsViews ?? v.views,
        comments: v.comments,
        ctaRead: v.ctaRead,
        cta: v.cta,
      }))
    ),
    rewatch: rewatchInsight(
      youtubeVideos.map((v) => ({
        id: v.id,
        title: v.title,
        views: v.analyticsViews ?? v.views,
        durationSec: v.durationSec,
        startRatio: v.retentionCurve?.[0]?.watchRatio ?? null,
      }))
    ),
    typical: typicalVideo(videos),
    payoff: payoffCandidates.length > 0 ? { fires: payoffFires, of: payoffCandidates.length } : null,
    drops: dropCandidates.length > 0 && dropTimes.length > 0 ? { count: dropTimes.length, of: dropCandidates.length, medianAtSec: median(dropTimes) } : null,
  };
}
