import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAnalysisUsage, limitMessage } from "@/lib/analysis-limit";
import { getValidTiktokAccessToken, getVideoById, getAccountStats, getSoundInfo } from "@/lib/tiktok-data";
import { analyzeUploadedVideo, MODEL, PROMPT_VERSION, THINKING_LEVEL } from "@/lib/gemini-analysis";

// TikTok Deep upload: the creator saved the video from TikTok themselves
// (doc/CLAUDE.md §5 -- TikTok's API never gives us the file) and uploads it
// here. Real file goes to Gemini's Files API, analyzed, then deleted
// (doc/CLAUDE.md §8). Mirrors /api/analyze/youtube's DB-writing shape.
// An AI analysis can take 20-40 s; give serverless hosting room to finish.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
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
      { error: limitMessage(usage), code: "limit", used: usage.used, cap: usage.cap, resetsOn: usage.resetsOn },
      { status: 402 }
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const platformVideoId = formData?.get("platformVideoId");

  if (!(file instanceof Blob) || typeof platformVideoId !== "string" || !platformVideoId) {
    return NextResponse.json({ error: "Missing file or platformVideoId." }, { status: 400 });
  }

  let accessToken: string;
  let videoMeta: Awaited<ReturnType<typeof getVideoById>>;
  try {
    accessToken = await getValidTiktokAccessToken(profileId);
    videoMeta = await getVideoById(accessToken, platformVideoId);
  } catch (error) {
    return NextResponse.json({ error: String(error instanceof Error ? error.message : error) }, { status: 400 });
  }

  const { data: connectedAccount } = await supabaseAdmin
    .from("connected_accounts")
    .select("id")
    .eq("profile_id", profileId)
    .eq("platform", "tiktok")
    .single();

  const { data: video, error: videoUpsertError } = await supabaseAdmin
    .from("videos")
    .upsert(
      {
        profile_id: profileId,
        connected_account_id: connectedAccount?.id ?? null,
        platform: "tiktok",
        platform_video_id: videoMeta.platformVideoId,
        analysis_mode: "deep",
        title: videoMeta.title,
        published_at: videoMeta.createTime,
        duration_sec: videoMeta.durationSec,
      },
      { onConflict: "profile_id,platform,platform_video_id" }
    )
    .select("id")
    .single();

  if (videoUpsertError || !video) {
    return NextResponse.json({ error: "Could not save the video record." }, { status: 500 });
  }

  await supabaseAdmin.from("video_metric_snapshots").insert({
    video_id: video.id,
    views: videoMeta.views,
    likes: videoMeta.likes,
    comments: videoMeta.comments,
    shares: videoMeta.shares,
  });

  if (connectedAccount?.id) {
    try {
      const accountStats = await getAccountStats(accessToken);
      await supabaseAdmin.from("account_snapshots").insert({
        connected_account_id: connectedAccount.id,
        followers_count: accountStats.followerCount,
      });
    } catch {
      // Non-fatal: the video-level analysis is the point of this call.
    }
  }

  let analysis: Awaited<ReturnType<typeof analyzeUploadedVideo>>;
  try {
    analysis = await analyzeUploadedVideo(file, file.type || "video/mp4");
  } catch (error) {
    return NextResponse.json({ error: String(error instanceof Error ? error.message : error) }, { status: 502 });
  }

  // Platform fact (Insight_Engine_Spec.md §3.2, tier P), not an AI guess --
  // merged into the same fields blob as its own key, distinct from Gemini's
  // own (unverified, tier 3) sound_candidate.
  const soundInfo = await getSoundInfo(videoMeta.shareUrl).catch(() => null);
  const fields = {
    ...analysis.fields,
    ...(soundInfo
      ? { platform_sound: { value: soundInfo, kind: "platform_fact" as const, confidence: "high" as const } }
      : {}),
  };

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
    fields,
  });

  if (profileInsertError) {
    return NextResponse.json({ error: "Could not save the analysis." }, { status: 500 });
  }

  return NextResponse.json({
    video: { id: video.id, ...videoMeta },
    fields,
  });
}
