import type { SupabaseClient } from "@supabase/supabase-js";

// TikTok gives a cover-picture link that stops working after a few hours, so a card
// built from it would be blank by the next visit. The cover (about 30 KB) is copied
// once into our public bucket `video-thumbs` and its path kept on the video row.
// Paths are `<profile id>/<platform>/<platform video id>.jpg` (not guessable); they
// are removed when the account is disconnected or deleted (removeThumbnails).
// YouTube needs none: its thumbnails can be built from the video id.

export const THUMB_BUCKET = "video-thumbs";

export async function saveThumbnail(
  admin: SupabaseClient,
  profileId: string,
  platform: string,
  platformVideoId: string,
  url: string | null | undefined
): Promise<void> {
  if (!url) return;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return;
    const type = response.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
    if (!["image/jpeg", "image/png", "image/webp"].includes(type)) return;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 2_000_000) return;

    const path = `${profileId}/${platform}/${platformVideoId}.jpg`;
    const { error } = await admin.storage.from(THUMB_BUCKET).upload(path, bytes, { contentType: type, upsert: true });
    if (error) return;
    await admin
      .from("videos")
      .update({ thumbnail_path: path })
      .eq("profile_id", profileId)
      .eq("platform", platform)
      .eq("platform_video_id", platformVideoId);
  } catch {
    // A missing cover is cosmetic; never fail a scan or an analysis because of it.
  }
}

// Saves several covers, a few at a time.
export async function saveThumbnails(
  admin: SupabaseClient,
  profileId: string,
  platform: string,
  items: { platformVideoId: string; url: string | null | undefined }[]
): Promise<void> {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        await saveThumbnail(admin, profileId, platform, item.platformVideoId, item.url);
      }
    })
  );
}

// Deletes the covers kept for one platform (disconnect) or all of them (account deletion).
export async function removeThumbnails(admin: SupabaseClient, profileId: string, platform?: string): Promise<void> {
  try {
    const bucket = admin.storage.from(THUMB_BUCKET);
    const folders = platform ? [platform] : ["tiktok", "youtube", "instagram", "facebook"];
    for (const folder of folders) {
      const dir = `${profileId}/${folder}`;
      for (let round = 0; round < 10; round += 1) {
        const { data } = await bucket.list(dir, { limit: 100 });
        if (!data || data.length === 0) break;
        await bucket.remove(data.map((file) => `${dir}/${file.name}`));
      }
    }
  } catch {
    // Best effort: the rows are deleted either way.
  }
}
