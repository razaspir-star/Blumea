import { getSupabaseAdmin } from "@/lib/supabase-admin";

type ConnectedAccountRow = {
  id: string;
  access_token_secret_id: string;
  refresh_token_secret_id: string;
  token_expires_at: string;
};

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token refresh failed: ${await response.text()}`);
  }

  return response.json() as Promise<{ access_token: string; expires_in: number }>;
}

// Reuses the stored access token until it's about to expire, then refreshes it
// via the stored refresh token and writes the new one back to Vault.
export async function getValidYoutubeAccessToken(profileId: string): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: account, error } = await supabaseAdmin
    .from("connected_accounts")
    .select("id, access_token_secret_id, refresh_token_secret_id, token_expires_at")
    .eq("profile_id", profileId)
    .eq("platform", "youtube")
    .single<ConnectedAccountRow>();

  if (error || !account) {
    throw new Error("No connected YouTube account for this profile.");
  }

  const expiresAt = new Date(account.token_expires_at).getTime();
  const stillValid = expiresAt - Date.now() > 2 * 60 * 1000;

  if (stillValid) {
    const { data: accessToken } = await supabaseAdmin.rpc("read_oauth_secret", {
      secret_id: account.access_token_secret_id,
    });
    if (accessToken) return accessToken;
  }

  const { data: refreshToken } = await supabaseAdmin.rpc("read_oauth_secret", {
    secret_id: account.refresh_token_secret_id,
  });
  if (!refreshToken) throw new Error("No refresh token stored for this account.");

  const refreshed = await refreshAccessToken(refreshToken);

  await supabaseAdmin.rpc("update_oauth_secret", {
    secret_id: account.access_token_secret_id,
    new_secret: refreshed.access_token,
  });
  await supabaseAdmin
    .from("connected_accounts")
    .update({
      token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    })
    .eq("id", account.id);

  return refreshed.access_token;
}

export type YoutubeVideoSummary = {
  platformVideoId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
};

export type YoutubeVideoMeta = YoutubeVideoSummary & {
  durationSec: number;
  views: number;
  likes: number;
  comments: number;
};

export type YoutubeChannelStats = {
  subscriberCount: number;
  totalViews: number;
};

function parseIso8601Duration(iso: string): number {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
}

async function getUploadsPlaylistId(accessToken: string): Promise<string> {
  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await response.json();
  const uploadsPlaylistId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) throw new Error("Could not find this channel's uploads playlist.");
  return uploadsPlaylistId;
}

type YoutubeSnippet = {
  title: string;
  publishedAt: string;
  thumbnails?: Record<string, { url: string }>;
};

function toSummary(videoId: string, snippet: YoutubeSnippet): YoutubeVideoSummary {
  const thumbnails = snippet.thumbnails ?? {};
  // Highest resolution available first -- these get stretched into a tall 9:16
  // card in the picker (most of this creator base's content is vertical), so
  // "medium" (320x180) looked visibly blurry.
  const thumbnail =
    thumbnails.maxres?.url ??
    thumbnails.standard?.url ??
    thumbnails.high?.url ??
    thumbnails.medium?.url ??
    thumbnails.default?.url ??
    "";

  return {
    platformVideoId: videoId,
    title: snippet.title,
    thumbnail,
    publishedAt: snippet.publishedAt,
  };
}

// For browsing/picking a video in the real Analyze flow -- lighter than
// YoutubeVideoMeta (no stats yet, those are only fetched for the one video
// actually being analyzed).
export async function listRecentVideos(accessToken: string, count = 12): Promise<YoutubeVideoSummary[]> {
  const uploadsPlaylistId = await getUploadsPlaylistId(accessToken);

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${count}&playlistId=${uploadsPlaylistId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await response.json();
  const items = data.items ?? [];

  return items.map((item: { snippet: YoutubeSnippet & { resourceId: { videoId: string } } }) =>
    toSummary(item.snippet.resourceId.videoId, item.snippet)
  );
}

async function withStats(accessToken: string, summary: YoutubeVideoSummary): Promise<YoutubeVideoMeta> {
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${summary.platformVideoId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await response.json();
  const item = data.items?.[0];
  const durationIso = item?.contentDetails?.duration ?? "PT0S";
  const stats = item?.statistics ?? {};

  return {
    ...summary,
    durationSec: parseIso8601Duration(durationIso),
    views: Number(stats.viewCount ?? 0),
    likes: Number(stats.likeCount ?? 0),
    comments: Number(stats.commentCount ?? 0),
  };
}

// The owner's single most recent public upload -- used by the first proof-of-
// pipeline call (doc/Insight_Engine_Spec.md §13#6) when no specific video id
// is requested.
export async function getMostRecentVideo(accessToken: string): Promise<YoutubeVideoMeta> {
  const [summary] = await listRecentVideos(accessToken, 1);
  if (!summary) throw new Error("This channel has no uploaded videos.");
  return withStats(accessToken, summary);
}

// A specific video the creator picked in the real Analyze flow. Public metadata
// (part=snippet) works for any public video id, not just the owner's own --
// consistent with the URL-model design (doc/CLAUDE.md §5): we never need the file.
export async function getVideoById(accessToken: string, videoId: string): Promise<YoutubeVideoMeta> {
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await response.json();
  const item = data.items?.[0];
  if (!item) throw new Error("Video not found.");

  const stats = item.statistics ?? {};

  return {
    ...toSummary(videoId, item.snippet),
    durationSec: parseIso8601Duration(item.contentDetails?.duration ?? "PT0S"),
    views: Number(stats.viewCount ?? 0),
    likes: Number(stats.likeCount ?? 0),
    comments: Number(stats.commentCount ?? 0),
  };
}

export type YoutubeVideoAnalytics = {
  avgWatchSec: number | null;
  avgWatchPercent: number | null;
  // engagedViews = views past the first frame (matches Studio's "Engaged
  // views" exactly, verified 2026-10-03). engagedViews / views approximates
  // Studio's "Stayed to watch" but is NOT identical -- Studio divides by
  // Shorts-feed impressions, which the API doesn't expose (~2 points off).
  engagement: { views: number; engagedViews: number } | null;
  // Followers this video brought / lost (YouTube Analytics, verified live for
  // the owner 2026-10-08). Small numbers per video, so always shown with views.
  growth: { gained: number; lost: number } | null;
  // Each point: fraction of the video's duration elapsed (0-1) -> fraction of
  // viewers watching at that point -- YouTube's `audienceWatchRatio`, an
  // absolute ratio that can exceed 1.0 when viewers rewatch (corrected
  // 2026-10-03: this was wrongly called "relative" before; the relative one is
  // the separate `relativeRetentionPerformance` metric, not stored yet).
  retentionCurve: { elapsedRatio: number; watchRatio: number }[] | null;
  // How viewers found this video (discovery vs. loyal-audience traffic) and
  // whether they were already subscribed -- the two dimensions this session
  // picked as worth building first (the rest of YouTube Analytics' breakdowns
  // -- age/gender/country/device -- are context, not yet wired into anything
  // actionable). TikTok/Instagram have no equivalent, so this is YouTube-only.
  trafficSource: { source: string; label: string; views: number }[] | null;
  subscribedStatus: { subscribed: boolean; views: number; avgViewDurationSec: number }[] | null;
};

// Raw codes YouTube Analytics returns for insightTrafficSourceType -> a label
// a creator can actually read. Falls back to a title-cased version of the
// code for anything not in this list rather than hiding it.
const TRAFFIC_SOURCE_LABELS: Record<string, string> = {
  YT_SEARCH: "YouTube search",
  SUGGESTED_VIDEO: "Suggested videos",
  RELATED_VIDEO: "Suggested videos",
  BROWSE: "Home feed",
  SUBSCRIBER: "Subscription feed",
  NOTIFICATION: "Notifications",
  PLAYLIST: "Playlists",
  PLAYLIST_PAGE: "Playlists",
  EXT_URL: "External links",
  NO_LINK_OTHER: "Direct or unknown",
  NO_LINK_EMBEDDED: "Embedded players",
  YT_CHANNEL: "Channel page",
  YT_OTHER_PAGE: "Other YouTube pages",
  END_SCREEN: "End screens",
  ANNOTATION: "Cards",
  CAMPAIGN_CARD: "Campaign card",
  ADVERTISING: "Ads",
  PROMOTED: "Promoted content",
  HASHTAGS: "Hashtag pages",
  SOUND_PAGE: "Sound page",
  VIDEO_REMIXES: "Remixes",
  SHORTS: "Shorts feed",
};

function trafficSourceLabel(code: string): string {
  return (
    TRAFFIC_SOURCE_LABELS[code] ??
    code.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())
  );
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// YouTube Analytics is a separate API/host from the Data API above, and needs
// the yt-analytics.readonly scope (already requested at connect time).
// Real retention/watch-time data, unlike the Data API's basic view/like counts.
export async function getVideoAnalytics(
  accessToken: string,
  videoId: string,
  publishedAt: string
): Promise<YoutubeVideoAnalytics> {
  const authHeader = { Authorization: `Bearer ${accessToken}` };
  const startDate = toDateString(new Date(publishedAt));
  const endDate = toDateString(new Date());

  const averagesParams = new URLSearchParams({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: "averageViewDuration,averageViewPercentage,views,engagedViews",
    filters: `video==${videoId}`,
  });

  const retentionParams = new URLSearchParams({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: "audienceWatchRatio",
    dimensions: "elapsedVideoTimeRatio",
    filters: `video==${videoId}`,
  });

  const trafficSourceParams = new URLSearchParams({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: "views",
    dimensions: "insightTrafficSourceType",
    filters: `video==${videoId}`,
    sort: "-views",
  });

  const subscribedStatusParams = new URLSearchParams({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: "views,averageViewDuration",
    dimensions: "subscribedStatus",
    filters: `video==${videoId}`,
  });

  const growthParams = new URLSearchParams({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: "subscribersGained,subscribersLost",
    filters: `video==${videoId}`,
  });

  const [averagesResponse, retentionResponse, trafficSourceResponse, subscribedStatusResponse, growthResponse] = await Promise.all([
    fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${averagesParams}`, { headers: authHeader }),
    fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${retentionParams}`, { headers: authHeader }),
    fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${trafficSourceParams}`, { headers: authHeader }),
    fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${subscribedStatusParams}`, { headers: authHeader }),
    fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${growthParams}`, { headers: authHeader }),
  ]);
  const growthBody = await growthResponse.json();
  const growthRow: [number, number] | undefined = growthBody?.rows?.[0];

  const averagesBody = await averagesResponse.json();
  const retentionBody = await retentionResponse.json();
  const trafficSourceBody = await trafficSourceResponse.json();
  const subscribedStatusBody = await subscribedStatusResponse.json();

  const averagesRow: [number, number, number, number] | undefined = averagesBody?.rows?.[0];
  const retentionRows: [number, number][] = retentionBody?.rows ?? [];
  const trafficSourceRows: [string, number][] = trafficSourceBody?.rows ?? [];
  const subscribedStatusRows: [string, number, number][] = subscribedStatusBody?.rows ?? [];

  return {
    avgWatchSec: averagesRow ? Number(averagesRow[0]) : null,
    avgWatchPercent: averagesRow ? Number(averagesRow[1]) : null,
    engagement: averagesRow ? { views: Number(averagesRow[2]), engagedViews: Number(averagesRow[3]) } : null,
    growth: growthRow ? { gained: Number(growthRow[0]), lost: Number(growthRow[1]) } : null,
    retentionCurve:
      retentionRows.length > 0
        ? retentionRows.map(([elapsedRatio, watchRatio]) => ({ elapsedRatio, watchRatio }))
        : null,
    trafficSource:
      trafficSourceRows.length > 0
        ? trafficSourceRows.map(([source, views]) => ({ source, label: trafficSourceLabel(source), views: Number(views) }))
        : null,
    subscribedStatus:
      subscribedStatusRows.length > 0
        ? subscribedStatusRows.map(([status, views, avgViewDuration]) => ({
            subscribed: status === "SUBSCRIBED",
            views: Number(views),
            avgViewDurationSec: Number(avgViewDuration),
          }))
        : null,
  };
}

// Channel-level snapshot for the dashboard's "current state" (doc/CLAUDE.md §13#7).
export async function getChannelStatistics(accessToken: string): Promise<YoutubeChannelStats> {
  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await response.json();
  const stats = data.items?.[0]?.statistics ?? {};

  return {
    subscriberCount: Number(stats.subscriberCount ?? 0),
    totalViews: Number(stats.viewCount ?? 0),
  };
}
