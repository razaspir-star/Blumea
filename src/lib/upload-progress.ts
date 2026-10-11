import type { SupabaseClient } from "@supabase/supabase-js";

// Live progress of a TikTok video upload, so the computer can show what the phone
// is doing (src/components/TiktokUploadStep.tsx polls it). Written by the server
// routes only; best effort - progress must never break the upload itself.
export type UploadStage = "waiting" | "opened" | "uploading" | "analyzing" | "done" | "failed";

export async function setUploadStage(
  admin: SupabaseClient,
  profileId: string,
  platformVideoId: string,
  stage: UploadStage,
  message?: string
): Promise<void> {
  await admin
    .from("upload_progress")
    .upsert(
      { profile_id: profileId, platform_video_id: platformVideoId, stage, message: message ?? null, updated_at: new Date().toISOString() },
      { onConflict: "profile_id,platform_video_id" }
    )
    .then(
      () => null,
      () => null
    );
}
