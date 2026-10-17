import { median } from "@/lib/insight-patterns";

// Where the creator stands on a platform. Not by fixed numbers (an Israeli creator has a ceiling an English one
// does not, a niche has its own norm, and Blumea has no data on either): by the creator's OWN trajectory and
// by what brings followers. Owner, 2026-10-17: "we need to see growth" and "keep the formats that bring
// followers even when the other numbers are good". Same honesty as the rest: counts stated, a change only when
// clear (1.3x), never across platforms.

export const LEVEL_MIN_VIDEOS = 8;
const CLEAR = 1.3;

export type Trend = "growing" | "steady" | "declining";

export type CreatorLevel = {
  platform: string;
  count: number;
  typical: number; // middle value of views per video
  // The newest half of the videos against the older half (by date posted).
  trend: Trend | null;
  recent: number | null;
  earlier: number | null;
  recentCount: number;
  earlierCount: number;
  followers: number | null;
  // New followers per video (YouTube Analytics): the middle value, how many videos it rests on, and the trend.
  gained: { typical: number; count: number; trend: Trend | null; recent: number | null; earlier: number | null } | null;
  // The format whose videos brought clearly more new followers than the rest.
  carrier: { formatId: string; typical: number; count: number; others: number; othersCount: number } | null;
  // Followers now against about a week ago, when there is history.
  followersChange: { delta: number; days: number } | null;
  standout: { id: string; title: string; views: number; ratio: number } | null;
};

type VideoLike = {
  id: string;
  title: string;
  platform: string;
  views: number | null;
  publishedAt: string | null;
  formatId: string | null;
  followersGained: number | null;
};
type AccountLike = { platform: string; followers: number | null; previous: { followers: number | null; daysAgo: number } | null };

const trendOf = (recent: number | null, earlier: number | null): Trend | null => {
  if (recent === null || earlier === null || earlier <= 0) return null;
  const ratio = recent / earlier;
  return ratio >= CLEAR ? "growing" : ratio <= 1 / CLEAR ? "declining" : "steady";
};

export function creatorLevel(videos: VideoLike[], accounts: AccountLike[], platform: string): CreatorLevel | null {
  const own = (videos.filter((v) => v.platform === platform && v.views !== null && v.views > 0) as (VideoLike & { views: number })[]).sort((x, y) =>
    (y.publishedAt ?? "").localeCompare(x.publishedAt ?? "")
  );
  if (own.length < LEVEL_MIN_VIDEOS) return null;

  const typical = median(own.map((v) => v.views));
  const half = Math.floor(own.length / 2);
  const recentVideos = own.slice(0, half);
  const earlierVideos = own.slice(own.length - half);
  const recent = median(recentVideos.map((v) => v.views));
  const earlier = median(earlierVideos.map((v) => v.views));

  const account = accounts.find((a) => a.platform === platform) ?? null;
  const followers = account?.followers ?? null;
  const followersChange =
    account && account.previous && account.followers !== null && account.previous.followers !== null && account.previous.daysAgo >= 5
      ? { delta: account.followers - account.previous.followers, days: Math.round(account.previous.daysAgo) }
      : null;

  // New followers per video, where the platform tells us (YouTube).
  const withGain = own.filter((v) => v.followersGained !== null) as (typeof own[number] & { followersGained: number })[];
  let gained: CreatorLevel["gained"] = null;
  let carrier: CreatorLevel["carrier"] = null;
  if (withGain.length >= 5) {
    const gHalf = Math.floor(withGain.length / 2);
    const gRecent = gHalf >= 3 ? median(withGain.slice(0, gHalf).map((v) => v.followersGained)) : null;
    const gEarlier = gHalf >= 3 ? median(withGain.slice(withGain.length - gHalf).map((v) => v.followersGained)) : null;
    gained = {
      typical: median(withGain.map((v) => v.followersGained)),
      count: withGain.length,
      trend: gRecent !== null && gEarlier !== null && gEarlier > 0 ? trendOf(gRecent, gEarlier) : null,
      recent: gRecent,
      earlier: gEarlier,
    };

    const byFormat = new Map<string, number[]>();
    for (const v of withGain) if (v.formatId) byFormat.set(v.formatId, [...(byFormat.get(v.formatId) ?? []), v.followersGained]);
    let best: CreatorLevel["carrier"] = null;
    for (const [formatId, values] of byFormat) {
      const rest = withGain.filter((v) => v.formatId !== formatId).map((v) => v.followersGained);
      if (values.length < 3 || rest.length < 3) continue;
      const mine = median(values);
      const others = median(rest);
      if (mine >= 1 && mine >= others * CLEAR && (!best || mine > best.typical)) best = { formatId, typical: mine, count: values.length, others, othersCount: rest.length };
    }
    carrier = best;
  }

  const top = [...own].sort((x, y) => y.views - x.views)[0];
  const standout = typical > 0 && top.views / typical >= 3 ? { id: top.id, title: top.title, views: top.views, ratio: top.views / typical } : null;

  return {
    platform,
    count: own.length,
    typical,
    trend: trendOf(recent, earlier),
    recent,
    earlier,
    recentCount: recentVideos.length,
    earlierCount: earlierVideos.length,
    followers,
    gained,
    carrier,
    followersChange,
    standout,
  };
}

export function creatorLevels(videos: VideoLike[], accounts: AccountLike[]): CreatorLevel[] {
  return [...new Set(videos.map((v) => v.platform))]
    .map((platform) => creatorLevel(videos, accounts, platform))
    .filter((level): level is CreatorLevel => level !== null);
}
