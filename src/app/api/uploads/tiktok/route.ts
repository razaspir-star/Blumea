import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { UPLOAD_BUCKET, uploadActor } from "@/lib/upload-auth";
import { setUploadStage } from "@/lib/upload-progress";

// Step 1 of a TikTok upload: hands the browser one-time signed addresses in our
// private temporary bucket, so the files go straight from the creator's device to
// storage. (Vercel limits a function's request body to 4.5 MB, far less than a
// video, so the file can't travel through our own routes.) Step 2 is
// /api/analyze/tiktok-upload (the video) or /api/analyze/tiktok-screens (the
// screenshots of the video's analytics), which read the files and delete them.
// `count` asks for several addresses at once (a video plus its screenshots).
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const platformVideoId = body?.platformVideoId;
  if (typeof platformVideoId !== "string" || !platformVideoId) {
    return NextResponse.json({ error: "Missing platformVideoId." }, { status: 400 });
  }
  const count = Math.min(Math.max(Number(body?.count) || 1, 1), 9);

  const actor = await uploadActor(request, body?.handoffToken, platformVideoId);
  if (!actor) return NextResponse.json({ error: "This link has expired. Open Blumea on your computer and try again." }, { status: 401 });

  const admin = getSupabaseAdmin();
  const uploads: { path: string; token: string }[] = [];
  for (let i = 0; i < count; i += 1) {
    const path = `${actor.profileId}/${crypto.randomUUID()}`;
    const { data, error } = await admin.storage.from(UPLOAD_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return NextResponse.json({ error: "Could not prepare the upload." }, { status: 500 });
    uploads.push({ path: data.path, token: data.token });
  }

  await setUploadStage(admin, actor.profileId, platformVideoId, "uploading");
  return NextResponse.json({ uploads, path: uploads[0].path, token: uploads[0].token });
}
