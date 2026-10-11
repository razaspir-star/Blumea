import type { SupabaseClient } from "@supabase/supabase-js";
import { UPLOAD_BUCKET } from "@/lib/upload-limits";

// A video upload is deleted right after its analysis. If something broke in
// between (the creator closed the page after uploading, the analysis failed), the
// file would stay. This removes anything older than an hour; the daily scheduler
// calls it, so nothing a creator uploaded is kept longer than about a day, and
// normally minutes.
export async function cleanupStaleUploads(admin: SupabaseClient): Promise<number> {
  const bucket = admin.storage.from(UPLOAD_BUCKET);
  const { data: folders } = await bucket.list("", { limit: 1000 });

  let removed = 0;
  for (const folder of folders ?? []) {
    const { data: files } = await bucket.list(folder.name, { limit: 1000 });
    const stale = (files ?? [])
      .filter((file) => file.created_at && Date.now() - new Date(file.created_at).getTime() > 3_600_000)
      .map((file) => `${folder.name}/${file.name}`);
    if (stale.length > 0) {
      await bucket.remove(stale);
      removed += stale.length;
    }
  }
  return removed;
}