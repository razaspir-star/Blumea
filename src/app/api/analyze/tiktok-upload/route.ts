import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAnalysisUsage, limitMessage } from "@/lib/analysis-limit";
import { UPLOAD_BUCKET, uploadActor } from "@/lib/upload-auth";
import { getValidTiktokAccessToken, getVideoById, getAccountStats, getSoundInfo } from "@/lib/tiktok-data";
import { analyzeUploadedVideo, MODEL, PROMPT_VERSION, THINKING_LEVEL } from "@/lib/gemini-analysis";

// TikTok Deep upload: the creator saved the video from TikTok themselves
// (doc/CLAUDE.md §5 -- TikTok's API never gives us the file) and uploaded it,
// straight from their device, to our private temporary bucket
// (/api/uploads/tiktok). This route reads it from there, sends it to Gemini's
// Files API, and deletes it from the bucket whatever happens (doc/CLAUDE.md §8).
// Mirrors /api/analyze/youtube's DB-writing shape.
// An AI analysis can take 20-40 s; give serverless hosting room to finish.
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const platformVideoId = body?.platformVideoId;
  const path = body?.path;
  if (typeof platformVideoId !== "string" || !platformVideoId || typeof path !== "string" || !path) {
    return NextResponse.json({ error: "Missing the video or its upload." }, { status: 400 });
  }

  const actor = await uploadActor(request, body?.handoffToken, platformVideoId);
  if (!actor) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const profileId = actor.profileId;
  const supabaseAdmin = getSupabaseAdmin();

  // The file must be one this creator uploaded (the path starts with their id).
  if (!path.startsWith(`${profileId}/`) || path.includes("..")) {
    return NextResponse.json({ error: "That upload doesn't belong to you." }, { status: 403 });
  }

  // Whatever happens below, the uploaded file does not stay in our storage.
  const removeUpload = () => supabaseAdmin.storage.from(UPLOAD_BUCKET).remove([path]).catch(() => null);

  // Monthly cap on AI analyses for free creators (src/lib/analysis-limit.ts).
  const usage = await getAnalysisUsage(supabaseAdmin, profileId);
  if (usage.cap !== null && usage.used >= usage.cap) {
    await removeUpload();
    return NextResponse.json(
      { error: limitMessage(usage), code: "limit", used: usage.used, cap: usage.cap, resetsOn: usage.resetsOn },
      { status: 402 }
    );
  }

  const { data: file, error: downloadError } = await supabaseAdmin.storage.from(UPLOAD_BUCKET).download(path);
  if (downloadError || !file) {
    return NextResponse.json({ error: "The upload didn't arrive. Please try again." }, { status: 400 });
  }

  let accessToken: string;
  let videoMeta: Awaited<ReturnType<typeof getVideoById>>;
  try {
    accessToken = await getValidTiktokAccessToken(profileId);
    videoMeta = await getVideoById(accessToken, platformVideoId);
  } catch (error) {
    await removeUpload();
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
    await removeUpload();
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
    await removeUpload();
    return NextResponse.json({ error: String(error instanceof Error ? error.message : error) }, { status: 502 });
  }
  await removeUpload();

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
