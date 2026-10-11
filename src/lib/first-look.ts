import type { DashboardVideo } from "@/lib/dashboard-data";

// First Look (doc/CLAUDE.md §6): right after the First Scan, a creator who has
// not had any video read by AI yet gets three read automatically - the strongest,
// the latest and the weakest by views - so the first screen shows what Blumea
// understood and not only numbers. About ₪0.01-0.02 per video.
//
// Rules: YouTube only (TikTok needs the creator to upload the file); nothing
// happens when the creator already has any analyzed video, which is also what
// stops it from running twice; at least 3 videos with views are needed.

export const FIRST_LOOK_COUNT = 3;

export function pickFirstLook(videos: DashboardVideo[]): DashboardVideo[] {
  if (videos.some((video) => video.analyzed)) return [];

  const pool = videos.filter((video) => video.platform === "youtube" && video.views !== null);
  if (pool.length < FIRST_LOOK_COUNT) return [];

  const byViews = [...pool].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  const latest = [...pool].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))[0];

  const picks: DashboardVideo[] = [];
  const add = (video: DashboardVideo | undefined) => {
    if (video && !picks.some((pick) => pick.id === video.id)) picks.push(video);
  };

  add(byViews[0]); // strongest
  add(latest); // latest
  add(byViews[byViews.length - 1]); // weakest
  // If two of those were the same video, fill from the middle of the ranking.
  for (let i = Math.floor(byViews.length / 2); picks.length < FIRST_LOOK_COUNT && i < byViews.length; i += 1) add(byViews[i]);

  return picks.slice(0, FIRST_LOOK_COUNT);
}
