import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { signHandoff, verifyHandoff } from "@/lib/handoff-token";
import { setUploadStage } from "@/lib/upload-progress";
import { getValidTiktokAccessToken, getVideoById } from "@/lib/tiktok-data";

// POST (signed in): a link for the creator's phone, to upload one TikTok video.
// Shown as a QR code on the computer; valid for 15 minutes (src/lib/handoff-token.ts).
export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!bearer) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data, error } = await getSupabaseAdmin().auth.getUser(bearer);
  if (error || !data.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const platformVideoId = body?.platformVideoId;
  if (typeof platformVideoId !== "string" || !platformVideoId) {
    return NextResponse.json({ error: "Missing platformVideoId." }, { status: 400 });
  }

  const token = signHandoff(data.user.id, platformVideoId);
  await setUploadStage(getSupabaseAdmin(), data.user.id, platformVideoId, "waiting");
  return NextResponse.json({ url: `${new URL(request.url).origin}/handoff/${token}` });
}

// GET ?token=...: what the phone page shows (the video's title), nothing else.
export async function GET(request: NextRequest) {
  const handoff = verifyHandoff(request.nextUrl.searchParams.get("token"));
  if (!handoff) return NextResponse.json({ error: "This link has expired. Open Blumea on your computer and scan a new code." }, { status: 401 });

  // The phone opened the page: the computer can say so (only moves "waiting" forward).
  await getSupabaseAdmin()
    .from("upload_progress")
    .update({ stage: "opened", updated_at: new Date().toISOString() })
    .eq("profile_id", handoff.profileId)
    .eq("platform_video_id", handoff.platformVideoId)
    .eq("stage", "waiting");

  try {
    const accessToken = await getValidTiktokAccessToken(handoff.profileId);
    const video = await getVideoById(accessToken, handoff.platformVideoId);
    return NextResponse.json({ title: video.title, shareUrl: video.shareUrl });
  } catch {
    return NextResponse.json({ title: "your TikTok video", shareUrl: null });
  }
}
