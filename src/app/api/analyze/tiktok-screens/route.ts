import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { uploadActor } from "@/lib/upload-auth";
import { saveTiktokScreens } from "@/lib/save-tiktok-screens";
import { translatorFor } from "@/lib/i18n/server";

// Adds the numbers from the creator's own screenshots of a TikTok video's
// analytics (watch time, retention, traffic, followers) to a video Blumea already
// knows. The pictures went to the temporary bucket first (/api/uploads/tiktok)
// and are deleted here. Works signed in, or from the phone's QR page.
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const t = translatorFor(request);
  const body = await request.json().catch(() => null);
  const platformVideoId = body?.platformVideoId;
  const paths: unknown = body?.paths;
  if (typeof platformVideoId !== "string" || !platformVideoId || !Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json({ error: t("errors.missingScreens") }, { status: 400 });
  }

  const actor = await uploadActor(request, body?.handoffToken, platformVideoId);
  if (!actor) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: video } = await admin
    .from("videos")
    .select("id")
    .eq("profile_id", actor.profileId)
    .eq("platform", "tiktok")
    .eq("platform_video_id", platformVideoId)
    .maybeSingle();
  if (!video) {
    await admin.storage.from("tiktok-uploads").remove(paths.map(String)).catch(() => null);
    return NextResponse.json({ error: t("errors.videoUnknown") }, { status: 404 });
  }

  const result = await saveTiktokScreens(admin, actor.profileId, video.id, paths.map(String), t);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json({ videoId: video.id, stats: result.stats });
}
