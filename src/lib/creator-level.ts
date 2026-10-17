import { median } from "@/lib/insight-patterns";

// The creator's general level on a platform, by the middle value of views per video (never across platforms:
// views mean different things on each). It is an ABSOLUTE yardstick, not only "against your own videos": a
// creator whose usual video gets 200K is doing well in general, one stuck at 500 has room to grow, and under
// 1,000 views Blumea also reads less of each video. The bands are proposals (owner, 2026-10-17); the wording
// that uses them is in the cards (cards.level*), see insight-cards.ts.

export const LEVEL_MIN_VIDEOS = 8;
export const LEVEL_BANDS = { growing: 1_000, strong: 10_000, veryStrong: 100_000 };

export type LevelBand = "low" | "growing" | "strong" | "veryStrong";

export type CreatorLevel = {
  platform: string;
  count: number;
  typical: number;
  band: LevelBand;
  // Nearly all videos land close to the typical one and none stands out: nothing has moved the number yet.
  flat: boolean;
  lowest: number;
  highest: number;
  // A video that got at least 3 times the typical.
  standout: { id: string; title: string; views: number; ratio: number } | null;
  // The strongest video (most views), for the creator who is just starting.
  best: { id: string; title: string; views: number };
};

type VideoLike = { id: string; title: string; platform: string; views: number | null };

export function creatorLevel(videos: VideoLike[], platform: string): CreatorLevel | null {
  const own = videos.filter((v) => v.platform === platform && v.views !== null && v.views > 0) as (VideoLike & { views: number })[];
  if (own.length < LEVEL_MIN_VIDEOS) return null;

  const typical = median(own.map((v) => v.views));
  if (typical <= 0) return null;
  const sorted = [...own].sort((x, y) => y.views - x.views);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const band: LevelBand =
    typical >= LEVEL_BANDS.veryStrong ? "veryStrong" : typical >= LEVEL_BANDS.strong ? "strong" : typical >= LEVEL_BANDS.growing ? "growing" : "low";
  const close = own.filter((v) => v.views >= typical / 2 && v.views <= typical * 2).length;
  const standout = best.views / typical >= 3 ? { id: best.id, title: best.title, views: best.views, ratio: best.views / typical } : null;
  const flat = !standout && close / own.length >= 0.8;

  return {
    platform,
    count: own.length,
    typical,
    band,
    flat,
    lowest: worst.views,
    highest: best.views,
    standout,
    best: { id: best.id, title: best.title, views: best.views },
  };
}

export function creatorLevels(videos: VideoLike[]): CreatorLevel[] {
  return [...new Set(videos.map((v) => v.platform))].map((platform) => creatorLevel(videos, platform)).filter((level): level is CreatorLevel => level !== null);
}
