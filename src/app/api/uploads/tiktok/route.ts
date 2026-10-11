import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { UPLOAD_BUCKET, uploadActor } from "@/lib/upload-auth";

// Step 1 of a TikTok video upload: hands the browser a one-time signed address in
// our private temporary bucket, so the video goes straight from the creator's
// device to storage. (Vercel limits a function's request body to 4.5 MB, far less
// than a video, so the file can't travel through our own routes.) Step 2 is
// /api/analyze/tiktok-upload, which reads it from there and deletes it.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const platformVideoId = body?.platformVideoId;
  if (typeof platformVideoId !== "string" || !platformVideoId) {
    return NextResponse.json({ error: "Missing platformVideoId." }, { status: 400 });
  }

  const actor = await uploadActor(request, body?.handoffToken, platformVideoId);
  if (!actor) return NextResponse.json({ error: "This link has expired. Open Blumea on your computer and try again." }, { status: 401 });

  const path = `${actor.profileId}/${crypto.randomUUID()}.mp4`;
  const { data, error } = await getSupabaseAdmin().storage.from(UPLOAD_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "Could not prepare the upload." }, { status: 500 });

  return NextResponse.json({ path: data.path, token: data.token });
}
