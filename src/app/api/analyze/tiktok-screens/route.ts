import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { uploadActor } from "@/lib/upload-auth";
import { saveTiktokScreens } from "@/lib/save-tiktok-screens";

// Adds the numbers from the creator's own screenshots of a TikTok video's
// analytics (watch time, retention, traffic, followers) to a video Blumea already
// knows. The pictures went to the temporary bucket first (/api/uploads/tiktok)
// and are deleted here. Works signed in, or from the phone's QR page.
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const platformVideoId = body?.platformVideoId;
  const paths: unknown = body?.paths;
  if (typeof platformVideoId !== "string" || !platformVideoId || !Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json({ error: "Missing the video or its screenshots." }, { status: 400 });
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
    return NextResponse.json({ error: "Blumea doesn't have this video yet. Refresh your videos first." }, { status: 404 });
  }

  const result = await saveTiktokScreens(admin, actor.profileId, video.id, paths.map(String));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json({ videoId: video.id, stats: result.stats });
}
