import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAnalysisUsage, limitMessage } from "@/lib/analysis-limit";
import { UPLOAD_BUCKET, uploadActor } from "@/lib/upload-auth";
import { setUploadStage } from "@/lib/upload-progress";
import { saveTiktokScreens } from "@/lib/save-tiktok-screens";
import { translatorFor } from "@/lib/i18n/server";
import { saveThumbnail } from "@/lib/video-thumbnails";
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
  const t = translatorFor(request);
  const body = await request.json().catch(() => null);
  const platformVideoId = body?.platformVideoId;
  const path = body?.path;
  if (typeof platformVideoId !== "string" || !platformVideoId || typeof path !== "string" || !path) {
    return NextResponse.json({ error: t("errors.missingUpload") }, { status: 400 });
  }

  const actor = await uploadActor(request, body?.handoffToken, platformVideoId);
  if (!actor) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const profileId = actor.profileId;
  const supabaseAdmin = getSupabaseAdmin();

  // The file must be one this creator uploaded (the path starts with their id).
  if (!path.startsWith(`${profileId}/`) || path.includes("..")) {
    return NextResponse.json({ error: t("errors.notYours") }, { status: 403 });
  }

  // Whatever happens below, the uploaded file does not stay in our storage.
  const removeUpload = () => supabaseAdmin.storage.from(UPLOAD_BUCKET).remove([path]).catch(() => null);

  // A failure: delete the file, tell the computer (live progress), answer the caller.
  const fail = async (error: string, status: number, extra: Record<string, unknown> = {}) => {
    await removeUpload();
    await setUploadStage(supabaseAdmin, profileId, platformVideoId, "failed", error);
    return NextResponse.json({ error, ...extra }, { status });
  };

  // Monthly cap on AI analyses for free creators (src/lib/analysis-limit.ts).
  const usage = await getAnalysisUsage(supabaseAdmin, profileId);
  if (usage.cap !== null && usage.used >= usage.cap) {
    return fail(limitMessage(usage, t), 402, { code: "limit", used: usage.used, cap: usage.cap, resetsOn: usage.resetsOn });
  }

  const { data: file, error: downloadError } = await supabaseAdmin.storage.from(UPLOAD_BUCKET).download(path);
  if (downloadError || !file) {
    return fail(t("errors.uploadMissing"), 400);
  }
  await setUploadStage(supabaseAdmin, profileId, platformVideoId, "analyzing");

  let accessToken: string;
  let videoMeta: Awaited<ReturnType<typeof getVideoById>>;
  try {
    accessToken = await getValidTiktokAccessToken(profileId);
    videoMeta = await getVideoById(accessToken, platformVideoId);
  } catch (error) {
    console.error("TikTok video lookup failed", error);
    return fail(t("errors.videoFetchFailed"), 400);
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
    return fail(t("errors.saveVideo"), 500);
  }

  await saveThumbnail(supabaseAdmin, profileId, "tiktok", videoMeta.platformVideoId, videoMeta.thumbnail);

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
    analysis = await analyzeUploadedVideo(file, file.type || "video/mp4", t.locale);
  } catch (error) {
    console.error("Upload analysis failed", error);
    return fail(t("errors.analysisFailed"), 502);
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
    return fail(t("errors.saveAnalysis"), 500);
  }

  // Optional: screenshots of the video's TikTok analytics shared with it. Best
  // effort: a problem reading them does not undo the analysis; the reply says so.
  const screenPaths: string[] = Array.isArray(body?.screenshotPaths) ? body.screenshotPaths.map(String) : [];
  const screens = screenPaths.length > 0 ? await saveTiktokScreens(supabaseAdmin, profileId, video.id, screenPaths, t) : null;

  await setUploadStage(supabaseAdmin, profileId, platformVideoId, "done");

  return NextResponse.json({
    video: { id: video.id, ...videoMeta },
    fields,
    screens: screens ? (screens.ok ? { ok: true } : { ok: false, error: screens.error }) : null,
  });
}
