// Shared by the browser and the server: where a TikTok video upload is held
// temporarily, and the biggest file accepted (the free Supabase upload limit).
export const UPLOAD_BUCKET = "tiktok-uploads";
export const MAX_UPLOAD_BYTES = 52_428_800;