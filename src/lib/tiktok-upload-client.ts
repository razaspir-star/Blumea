import { supabase } from "@/lib/supabase";
import { MAX_UPLOAD_BYTES, UPLOAD_BUCKET } from "@/lib/upload-limits";
import type { Translator } from "@/lib/i18n/translate";

// Browser side of a TikTok upload, in three steps (see
// src/app/api/uploads/tiktok/route.ts for why files can't go through our own
// routes): ask for signed addresses, send the files straight to temporary storage,
// then ask for the reading (which deletes the files). Works signed in, or from a
// phone that scanned the QR code (handoffToken). The upload can be a video, its
// screenshots (TikTok's video analytics), or both together.

export type UploadStage = "uploading" | "analyzing";

export const MAX_SCREENSHOTS = 8;

async function authHeaders(handoffToken?: string): Promise<Record<string, string> | null> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (handoffToken) return headers;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  headers.Authorization = `Bearer ${data.session.access_token}`;
  return headers;
}

// Asks for one signed address per file and sends each file there. Returns the paths.
async function sendFiles(
  files: File[],
  platformVideoId: string,
  headers: Record<string, string>,
  handoffToken: string | undefined,
  t: Translator
): Promise<{ ok: true; paths: string[] } | { ok: false; error: string }> {
  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        ok: false,
        error: t("uploadErrors.tooBig", {
          name: file.name || t("uploadErrors.aFile"),
          mb: Math.round(file.size / 1_048_576),
          limit: Math.round(MAX_UPLOAD_BYTES / 1_048_576),
        }),
      };
    }
  }

  const start = await fetch("/api/uploads/tiktok", {
    method: "POST",
    headers,
    body: JSON.stringify({ platformVideoId, handoffToken, count: files.length }),
  });
  const startBody = await start.json().catch(() => ({}));
  if (!start.ok) return { ok: false, error: startBody.error ?? t("uploadErrors.couldNotStart") };

  const uploads: { path: string; token: string }[] = startBody.uploads;
  for (let i = 0; i < files.length; i += 1) {
    const { error } = await supabase.storage
      .from(UPLOAD_BUCKET)
      .uploadToSignedUrl(uploads[i].path, uploads[i].token, files[i], {
        contentType: files[i].type || (files[i].type.startsWith("image/") ? files[i].type : "video/mp4"),
      });
    if (error) return { ok: false, error: t("uploadErrors.uploadFailed") };
  }
  return { ok: true, paths: uploads.map((upload) => upload.path) };
}

export async function uploadTiktokVideo(input: {
  file: File;
  screenshots?: File[];
  platformVideoId: string;
  handoffToken?: string;
  onStage?: (stage: UploadStage) => void;
  t: Translator;
}): Promise<{ ok: true; videoId: string; screensError: string | null } | { ok: false; error: string }> {
  const { file, platformVideoId, handoffToken, onStage, t } = input;
  const screenshots = (input.screenshots ?? []).slice(0, MAX_SCREENSHOTS);

  const headers = await authHeaders(handoffToken);
  if (!headers) return { ok: false, error: t("uploadErrors.notSignedIn") };

  onStage?.("uploading");
  const sent = await sendFiles([file, ...screenshots], platformVideoId, headers, handoffToken, t);
  if (!sent.ok) return sent;

  onStage?.("analyzing");
  const analyze = await fetch("/api/analyze/tiktok-upload", {
    method: "POST",
    headers,
    body: JSON.stringify({ platformVideoId, path: sent.paths[0], screenshotPaths: sent.paths.slice(1), handoffToken }),
  });
  const analyzeBody = await analyze.json().catch(() => ({}));
  if (!analyze.ok) return { ok: false, error: analyzeBody.error ?? t("uploadErrors.analysisFailed") };

  return { ok: true, videoId: analyzeBody.video.id, screensError: analyzeBody.screens?.ok === false ? analyzeBody.screens.error : null };
}

// Screenshots only: adds TikTok's numbers to a video Blumea already knows.
export async function uploadTiktokScreens(input: {
  screenshots: File[];
  platformVideoId: string;
  handoffToken?: string;
  onStage?: (stage: UploadStage) => void;
  t: Translator;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { platformVideoId, handoffToken, onStage, t } = input;
  const screenshots = input.screenshots.slice(0, MAX_SCREENSHOTS);

  const headers = await authHeaders(handoffToken);
  if (!headers) return { ok: false, error: t("uploadErrors.notSignedIn") };

  onStage?.("uploading");
  const sent = await sendFiles(screenshots, platformVideoId, headers, handoffToken, t);
  if (!sent.ok) return sent;

  onStage?.("analyzing");
  const response = await fetch("/api/analyze/tiktok-screens", {
    method: "POST",
    headers,
    body: JSON.stringify({ platformVideoId, paths: sent.paths, handoffToken }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, error: body.error ?? t("uploadErrors.screensFailed") };
  return { ok: true };
}
