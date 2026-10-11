import { supabase } from "@/lib/supabase";
import { MAX_UPLOAD_BYTES, UPLOAD_BUCKET } from "@/lib/upload-limits";

// Browser side of a TikTok video upload, in three steps (see
// src/app/api/uploads/tiktok/route.ts for why the file can't go through our own
// routes): ask for a signed address, send the file straight to temporary storage,
// then ask for the analysis (which deletes the file). Works signed in, or from a
// phone that scanned the QR code (handoffToken).

export type UploadStage = "uploading" | "analyzing";

export async function uploadTiktokVideo(input: {
  file: File;
  platformVideoId: string;
  handoffToken?: string;
  onStage?: (stage: UploadStage) => void;
}): Promise<{ ok: true; videoId: string } | { ok: false; error: string }> {
  const { file, platformVideoId, handoffToken, onStage } = input;

  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `This video is ${Math.round(file.size / 1_048_576)} MB. The limit is ${Math.round(MAX_UPLOAD_BYTES / 1_048_576)} MB.` };
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!handoffToken) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return { ok: false, error: "Not signed in." };
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }

  onStage?.("uploading");
  const start = await fetch("/api/uploads/tiktok", {
    method: "POST",
    headers,
    body: JSON.stringify({ platformVideoId, handoffToken }),
  });
  const startBody = await start.json().catch(() => ({}));
  if (!start.ok) return { ok: false, error: startBody.error ?? "Could not start the upload." };

  const { error: uploadError } = await supabase.storage
    .from(UPLOAD_BUCKET)
    .uploadToSignedUrl(startBody.path, startBody.token, file, { contentType: file.type || "video/mp4" });
  if (uploadError) return { ok: false, error: "The upload didn't go through. Please try again." };

  onStage?.("analyzing");
  const analyze = await fetch("/api/analyze/tiktok-upload", {
    method: "POST",
    headers,
    body: JSON.stringify({ platformVideoId, path: startBody.path, handoffToken }),
  });
  const analyzeBody = await analyze.json().catch(() => ({}));
  if (!analyze.ok) return { ok: false, error: analyzeBody.error ?? "Analysis failed." };

  return { ok: true, videoId: analyzeBody.video.id };
}
