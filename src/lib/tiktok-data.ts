import { getSupabaseAdmin } from "@/lib/supabase-admin";

type ConnectedAccountRow = {
  id: string;
  access_token_secret_id: string;
  refresh_token_secret_id: string;
  token_expires_at: string;
};

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`TikTok token refresh failed: ${await response.text()}`);
  }

  return response.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>;
}

// Same pattern as src/lib/youtube-data.ts's getValidYoutubeAccessToken, adapted
// to TikTok's refresh flow (which also rotates the refresh_token itself).
export async function getValidTiktokAccessToken(profileId: string): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: account, error } = await supabaseAdmin
    .from("connected_accounts")
    .select("id, access_token_secret_id, refresh_token_secret_id, token_expires_at")
    .eq("profile_id", profileId)
    .eq("platform", "tiktok")
    .single<ConnectedAccountRow>();

  if (error || !account) {
    throw new Error("No connected TikTok account for this profile.");
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
  await supabaseAdmin.rpc("update_oauth_secret", {
    secret_id: account.refresh_token_secret_id,
    new_secret: refreshed.refresh_token,
  });
  await supabaseAdmin
    .from("connected_accounts")
    .update({
      token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    })
    .eq("id", account.id);

  return refreshed.access_token;
}

export type TiktokVideoSummary = {
  platformVideoId: string;
  title: string;
  thumbnail: string;
  shareUrl: string;
  createTime: string;
};

// Checked live 2026-09-30: adding collect_count (saves) to this field list
// makes the whole request fail (400) -- confirmed not a valid field for this
// endpoint under our scopes. TikTok doesn't expose a saves count to us, same
// as YouTube.
const FIELDS = "id,title,cover_image_url,share_url,create_time";

// For browsing/picking a video in the real Analyze flow -- mirrors
// src/lib/youtube-data.ts's listRecentVideos. TikTok's Display API never
// gives the video file itself (doc/CLAUDE.md §5), so shareUrl is what lets
// the creator open the real video in TikTok to save it themselves.
export async function listRecentVideos(accessToken: string, count = 12): Promise<TiktokVideoSummary[]> {
  const response = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${FIELDS}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ max_count: count }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message ?? "Could not load TikTok videos.");
  }

  const videos = body?.data?.videos ?? [];

  return videos.map((video: { id: string; title: string; cover_image_url: string; share_url: string; create_time: number }) => ({
    platformVideoId: video.id,
    title: video.title,
    thumbnail: video.cover_image_url,
    shareUrl: video.share_url,
    createTime: new Date(video.create_time * 1000).toISOString(),
  }));
}

export type TiktokVideoMeta = TiktokVideoSummary & {
  durationSec: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
};

const QUERY_FIELDS =
  "id,title,cover_image_url,share_url,create_time,duration,view_count,like_count,comment_count,share_count";

// A specific video the creator picked (for Deep upload). video/query/ (not
// video/list/) is the right endpoint for looking up known ids, and is the
// only one of the two that returns engagement stats.
export async function getVideoById(accessToken: string, videoId: string): Promise<TiktokVideoMeta> {
  const response = await fetch(`https://open.tiktokapis.com/v2/video/query/?fields=${QUERY_FIELDS}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filters: { video_ids: [videoId] } }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message ?? "Could not load this TikTok video.");
  }

  const video = body?.data?.videos?.[0];
  if (!video) throw new Error("Video not found.");

  return {
    platformVideoId: video.id,
    title: video.title,
    thumbnail: video.cover_image_url,
    shareUrl: video.share_url,
    createTime: new Date(video.create_time * 1000).toISOString(),
    durationSec: Number(video.duration ?? 0),
    views: Number(video.view_count ?? 0),
    likes: Number(video.like_count ?? 0),
    comments: Number(video.comment_count ?? 0),
    shares: Number(video.share_count ?? 0),
  };
}

// First Scan: the creator's most recent videos with their numbers. video/list
// gives no stats and returns at most 20 per page, so one video/query call (up
// to 20 ids) adds views, likes, comments and shares.
export async function listVideosWithStats(accessToken: string, count = 20): Promise<TiktokVideoMeta[]> {
  const summaries = await listRecentVideos(accessToken, Math.min(count, 20));
  if (summaries.length === 0) return [];

  const response = await fetch(`https://open.tiktokapis.com/v2/video/query/?fields=${QUERY_FIELDS}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ filters: { video_ids: summaries.map((summary) => summary.platformVideoId) } }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? "Could not load TikTok video numbers.");

  const byId = new Map<string, Record<string, number>>(
    (body?.data?.videos ?? []).map((video: Record<string, number> & { id: string }) => [video.id, video])
  );

  return summaries.map((summary) => {
    const video = byId.get(summary.platformVideoId) ?? {};
    return {
      ...summary,
      durationSec: Number(video.duration ?? 0),
      views: Number(video.view_count ?? 0),
      likes: Number(video.like_count ?? 0),
      comments: Number(video.comment_count ?? 0),
      shares: Number(video.share_count ?? 0),
    };
  });
}
export type TiktokAccountStats = {
  followerCount: number;
};

// Account-level snapshot for the dashboard's "current state" (doc/CLAUDE.md
// §13#7), mirrors src/lib/youtube-data.ts's getChannelStatistics. TikTok has
// no "total views across all videos" equivalent to YouTube's channel
// view_count, so total_views is left unset for TikTok snapshots.
export async function getAccountStats(accessToken: string): Promise<TiktokAccountStats> {
  const response = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=follower_count",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message ?? "Could not load TikTok account stats.");
  }

  return { followerCount: Number(body?.data?.user?.follower_count ?? 0) };
}

export type TiktokSoundInfo = { label: string; url: string; soundId: string | null };

const decodeEntities = (text: string) =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");

// The real sound name + id, straight from TikTok's official oEmbed endpoint --
// a platform fact (Insight_Engine_Spec.md §3.2, tier P), not an AI guess.
// Validated live during earlier standalone testing (see doc/CLAUDE.md §5/§13):
// no auth needed, works from just the video's public share_url. Returns null
// if the embed has no music link (rare, but not every video has one parsed out).
export async function getSoundInfo(shareUrl: string): Promise<TiktokSoundInfo | null> {
  const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(shareUrl)}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) return null;

  const body = await response.json();
  const html: string = body?.html ?? "";
  const match = [...html.matchAll(/<a[^>]*href="([^"]*\/music\/[^"]*)"[^>]*>([^<]*)<\/a>/g)][0];
  if (!match) return null;

  const label = decodeEntities(match[2]).replace(/^♬\s*/, "");
  const url = match[1];

  return { label, url, soundId: url.match(/(\d+)(?:\?|$)/)?.[1] ?? null };
}
