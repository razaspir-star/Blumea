import type { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyHandoff } from "@/lib/handoff-token";

export { UPLOAD_BUCKET, MAX_UPLOAD_BYTES } from "@/lib/upload-limits";


// Who is uploading: a signed-in creator (Authorization header), or a phone that
// scanned the QR code (a handoff token for one specific TikTok video).
export async function uploadActor(
  request: NextRequest,
  handoffToken: string | null | undefined,
  platformVideoId: string
): Promise<{ profileId: string } | null> {
  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  if (bearer) {
    const { data, error } = await getSupabaseAdmin().auth.getUser(bearer);
    return error || !data.user ? null : { profileId: data.user.id };
  }

  const handoff = verifyHandoff(handoffToken);
  if (handoff && handoff.platformVideoId === platformVideoId) return { profileId: handoff.profileId };
  return null;
}
