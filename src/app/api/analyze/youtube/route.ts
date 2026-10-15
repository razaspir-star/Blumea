import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAnalysisUsage, limitMessage } from "@/lib/analysis-limit";
import {
  getValidYoutubeAccessToken,
  getMostRecentVideo,
  getVideoById,
  getChannelStatistics,
  getVideoAnalytics,
  getOwnChannelId,
} from "@/lib/youtube-data";
import { analyzeYoutubeVideo, MODEL, PROMPT_VERSION, THINKING_LEVEL } from "@/lib/gemini-analysis";
import { translatorFor } from "@/lib/i18n/server";

// Real (non-mock) slice of the insight engine: analyzes a YouTube video --
// the one named in the request body, or the owner's most recent upload if
// none is given -- and writes the result to video_ai_profiles.
// An AI analysis can take 20-40 s; give serverless hosting room to finish.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const t = translatorFor(request);
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const profileId = userData.user.id;
  // Monthly cap on AI analyses for free creators (src/lib/analysis-limit.ts).
  const usage = await getAnalysisUsage(supabaseAdmin, profileId);
  if (usage.cap !== null && usage.used >= usage.cap) {
    return NextResponse.json(
      { error: limitMessage(usage, t), code: "limit", used: usage.used, cap: usage.cap, resetsOn: usage.resetsOn },
      { status: 402 }
    );
  }
  const requestedVideoId: string | undefined = await request
    .json()
    .then((body) => body?.videoId)
    .catch(() => undefined);

  let accessToken: string;
  let videoMeta: Awaited<ReturnType<typeof getMostRecentVideo>>;
  try {
    accessToken = await getValidYoutubeAccessToken(profileId);
    videoMeta = requestedVideoId
      ? await getVideoById(accessToken, requestedVideoId)
      : await getMostRecentVideo(accessToken);

    // Only the creator's own videos: a public video of someone else is refused.
    if (requestedVideoId && videoMeta.channelId && videoMeta.channelId !== (await getOwnChannelId(accessToken))) {
      return NextResponse.json({ error: t("errors.notOwnChannel") }, { status: 403 });
    }
  } catch (error) {
    console.error("YouTube video lookup failed", error);
    return NextResponse.json({ error: t("errors.videoFetchFailed") }, { status: 400 });
  }

  const { data: connectedAccount } = await supabaseAdmin
    .from("connected_accounts")
    .select("id")
    .eq("profile_id", profileId)
    .eq("platform", "youtube")
    .single();

  const { data: video, error: videoUpsertError } = await supabaseAdmin
    .from("videos")
    .upsert(
      {
        profile_id: profileId,
        connected_account_id: connectedAccount?.id ?? null,
        platform: "youtube",
        platform_video_id: videoMeta.platformVideoId,
        analysis_mode: "full",
        title: videoMeta.title,
        published_at: videoMeta.publishedAt,
        duration_sec: videoMeta.durationSec,
      },
      { onConflict: "profile_id,platform,platform_video_id" }
    )
    .select("id")
    .single();

  if (videoUpsertError || !video) {
    return NextResponse.json({ error: t("errors.saveVideo") }, { status: 500 });
  }

  const analytics = await getVideoAnalytics(accessToken, videoMeta.platformVideoId, videoMeta.publishedAt).catch(
    () => null
  );

  const breakdowns =
    analytics?.trafficSource || analytics?.subscribedStatus || analytics?.engagement || analytics?.growth
      ? {
          ...(analytics.trafficSource ? { trafficSource: analytics.trafficSource } : {}),
          ...(analytics.subscribedStatus ? { subscribedStatus: analytics.subscribedStatus } : {}),
          ...(analytics.engagement ? { engagement: analytics.engagement } : {}),
          ...(analytics.growth ? { growth: analytics.growth } : {}),
        }
      : null;

  await supabaseAdmin.from("video_metric_snapshots").insert({
    video_id: video.id,
    views: videoMeta.views,
    likes: videoMeta.likes,
    comments: videoMeta.comments,
    avg_watch_sec: analytics?.avgWatchSec ?? null,
    retention_curve: analytics?.retentionCurve ?? null,
    breakdowns,
  });

  if (connectedAccount?.id) {
    try {
      const channelStats = await getChannelStatistics(accessToken);
      await supabaseAdmin.from("account_snapshots").insert({
        connected_account_id: connectedAccount.id,
        followers_count: channelStats.subscriberCount,
        total_views: channelStats.totalViews,
      });
    } catch {
      // Non-fatal: the video-level analysis is the point of this call.
    }
  }

  let analysis: Awaited<ReturnType<typeof analyzeYoutubeVideo>>;
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoMeta.platformVideoId}`;
    analysis = await analyzeYoutubeVideo(watchUrl);
  } catch (error) {
    console.error("YouTube analysis failed", error);
    return NextResponse.json({ error: t("errors.analysisFailed") }, { status: 502 });
  }

  await supabaseAdmin
    .from("video_ai_profiles")
    .update({ is_current: false })
    .eq("video_id", video.id)
    .eq("is_current", true);

  const { error: profileInsertError } = await supabaseAdmin.from("video_ai_profiles").insert({
    video_id: video.id,
    model: MODEL,
    prompt_version: PROMPT_VERSION,
    thinking_level: THINKING_LEVEL,
    is_current: true,
    fields: analysis.fields,
  });

  if (profileInsertError) {
    return NextResponse.json({ error: t("errors.saveAnalysis") }, { status: 500 });
  }

  return NextResponse.json({
    video: { id: video.id, ...videoMeta },
    fields: analysis.fields,
    analytics,
  });
}
