import { median } from "@/lib/insight-patterns";

// Two cross-video insights designed with the owner (2026-10-09). Both are plain
// functions over the creator's own videos; both refuse to over-read small
// numbers (spec §4: under 1,000 views a video's numbers are noisy).

export type FollowerVideo = {
  id: string;
  title: string;
  views: number | null; // views as counted by YouTube Analytics for this video
  subscribedViews: number | null;
  gained: number | null;
  durationSec: number | null;
};

export const SMALL_VIDEO_VIEWS = 1000;

export type FollowerInsight = {
  eligible: number;
  leftOutSmall: number;
  followerBase: number | null;
  // Share of views that come from people who already follow (typical video).
  medianFollowerSharePct: number;
  // Videos where followers made up the most of the audience.
  topFollowerShare: { id: string; title: string; sharePct: number; viewsFromFollowersPer100Followers: number | null }[];
  // New followers per 1,000 views.
  medianGainedPer1000: number | null;
  topGained: { id: string; title: string; gained: number; per1000: number }[];
  // Spec §7-style pattern: videos with a higher follower share got more views.
  reachPattern: { higherCount: number; lowerCount: number; higherMedianViews: number; lowerMedianViews: number; lengthSimilar: boolean } | null;
};

// "Follower retention" (owner's name, 2026-10-09): how much the creator's own
// followers carry a video, and how well a video wins new ones. A video with
// 100 views and 80% followers is not a better "retention" than one with 1,000
// views and 10% -- so videos under 1,000 views are left out and every number
// is shown next to its count.
export function followerInsight(videos: FollowerVideo[], followerBase: number | null): FollowerInsight | null {
  const withData = videos.filter((v) => v.views !== null && v.subscribedViews !== null && v.views > 0);
  const eligible = withData.filter((v) => (v.views as number) >= SMALL_VIDEO_VIEWS);
  if (eligible.length < 4) return null;

  const share = (v: FollowerVideo) => ((v.subscribedViews as number) / (v.views as number)) * 100;
  const byShare = [...eligible].sort((a, b) => share(b) - share(a));

  const gainedVideos = eligible.filter((v) => v.gained !== null);
  const per1000 = (v: FollowerVideo) => ((v.gained as number) / (v.views as number)) * 1000;
  const medianGained = gainedVideos.length >= 4 ? median(gainedVideos.map(per1000)) : null;
  const topGained =
    medianGained !== null && medianGained > 0
      ? gainedVideos
          .filter((v) => (v.gained as number) >= 3 && per1000(v) >= 3 * medianGained)
          .sort((a, b) => per1000(b) - per1000(a))
          .slice(0, 2)
          .map((v) => ({ id: v.id, title: v.title, gained: v.gained as number, per1000: per1000(v) }))
      : [];

  // Higher vs lower follower share, split at the median (needs >= 4 per side).
  let reachPattern: FollowerInsight["reachPattern"] = null;
  if (eligible.length >= 8) {
    const cut = median(eligible.map(share));
    const higher = eligible.filter((v) => share(v) >= cut);
    const lower = eligible.filter((v) => share(v) < cut);
    if (higher.length >= 4 && lower.length >= 4) {
      const hMed = median(higher.map((v) => v.views as number));
      const lMed = median(lower.map((v) => v.views as number));
      const hLen = median(higher.map((v) => v.durationSec ?? 0));
      const lLen = median(lower.map((v) => v.durationSec ?? 0));
      const lengthSimilar = hLen > 0 && lLen > 0 && Math.max(hLen, lLen) / Math.min(hLen, lLen) < 1.5;
      if (lMed > 0 && hMed / lMed >= 1.3) {
        reachPattern = { higherCount: higher.length, lowerCount: lower.length, higherMedianViews: hMed, lowerMedianViews: lMed, lengthSimilar };
      }
    }
  }

  return {
    eligible: eligible.length,
    leftOutSmall: withData.length - eligible.length,
    followerBase,
    medianFollowerSharePct: median(eligible.map(share)),
    topFollowerShare: byShare.slice(0, 2).map((v) => ({
      id: v.id,
      title: v.title,
      sharePct: share(v),
      viewsFromFollowersPer100Followers: followerBase && followerBase > 0 ? ((v.subscribedViews as number) / followerBase) * 100 : null,
    })),
    medianGainedPer1000: medianGained,
    topGained,
    reachPattern,
  };
}

// ---- what a video asks viewers to do (call to action) ----

export type CtaVideo = {
  id: string;
  title: string;
  views: number | null;
  comments: number | null;
  // false for videos analyzed before the prompt looked for asks: "never looked"
  // is not the same as "asks nothing".
  ctaRead: boolean;
  cta: { type: string; text: string } | null;
};

export type CtaGroup = { type: string; count: number; medianPer100: number };
export type CtaSingle = { type: string; id: string; title: string; text: string; per100: number; comments: number; multipleOfNoAsk: number | null };

export type CtaInsight = {
  eligible: number;
  leftOutSmall: number;
  noAsk: { count: number; medianPer100: number } | null;
  groups: CtaGroup[];
  // Types with 1-2 videos: shown only when far above the no-ask videos, and
  // always as "one video".
  standouts: CtaSingle[];
};

export const CTA_GROUP_MIN = 3;
export const CTA_STANDOUT_MULTIPLE = 3;
export const CTA_STANDOUT_MIN_COMMENTS = 5;

// Compares comments per 100 views between videos that ask for something and
// videos that ask nothing, split by the type of ask (owner's question,
// 2026-10-09: does a personal invitation draw comments where a generic
// question does not?). Medians only for groups of >= 3 videos; smaller groups
// are never averaged, and are mentioned only when one video clearly stands out.
export function ctaInsight(videos: CtaVideo[]): CtaInsight | null {
  const read = videos.filter((v) => v.ctaRead && v.views !== null && v.comments !== null && v.views > 0);
  const eligible = read.filter((v) => (v.views as number) >= SMALL_VIDEO_VIEWS);
  if (eligible.length < 8) return null;

  const per100 = (v: CtaVideo) => ((v.comments as number) / (v.views as number)) * 100;
  const none = eligible.filter((v) => !v.cta);
  const noAsk = none.length >= CTA_GROUP_MIN ? { count: none.length, medianPer100: median(none.map(per100)) } : null;

  const types = [...new Set(eligible.filter((v) => v.cta).map((v) => (v.cta as { type: string }).type))];
  const groups: CtaGroup[] = [];
  const standouts: CtaSingle[] = [];
  for (const type of types) {
    const members = eligible.filter((v) => v.cta?.type === type);
    if (members.length >= CTA_GROUP_MIN) {
      groups.push({ type, count: members.length, medianPer100: median(members.map(per100)) });
    } else if (noAsk && noAsk.medianPer100 > 0) {
      for (const v of members) {
        if ((v.comments as number) >= CTA_STANDOUT_MIN_COMMENTS && per100(v) >= CTA_STANDOUT_MULTIPLE * noAsk.medianPer100) {
          standouts.push({ type, id: v.id, title: v.title, text: (v.cta as { text: string }).text, per100: per100(v), comments: v.comments as number, multipleOfNoAsk: per100(v) / noAsk.medianPer100 });
        }
      }
    }
  }
  if (!noAsk || (groups.length === 0 && standouts.length === 0)) return null;

  return { eligible: eligible.length, leftOutSmall: read.length - eligible.length, noAsk, groups, standouts };
}

// ---- rewatches ----

export type RewatchVideo = {
  id: string;
  title: string;
  views: number | null;
  durationSec: number | null;
  // YouTube's audience-watch ratio at the very start of the video. It is
  // absolute, so a value above 1 means the start was watched more than once per
  // view -- people watching again (youtube-data.ts).
  startRatio: number | null;
};

export type RewatchInsight = {
  eligible: number;
  leftOutSmall: number;
  medianStartRatio: number;
  // Shorter vs longer half (split at the creator's own median length).
  lengthSplit: { shorterMedian: number; longerMedian: number; shorterCount: number; longerCount: number } | null;
  // A video rewatched far more than others of a similar length.
  standout: { id: string; title: string; startRatio: number; durationSec: number; usualForLength: number; sameLengthCount: number } | null;
};

const REWATCH_STANDOUT_MULTIPLE = 3;
const REWATCH_STANDOUT_MIN_EXTRA = 0.3;

// "Rewatches" (owner-approved experiment idea, 2026-10-09: loop endings). We do
// not know whether an ending loops -- only how much a video was watched again,
// which is a fact in YouTube's own data. The statement is only that a video
// stands out for its length and is worth a look; never why. Videos under 1,000
// views are left out (spec §4), a median split by length keeps a 12 s video
// from being compared with a 40 s one.
export function rewatchInsight(videos: RewatchVideo[]): RewatchInsight | null {
  const withCurve = videos.filter((v) => v.startRatio !== null && v.views !== null && v.durationSec);
  const eligible = withCurve.filter((v) => (v.views as number) >= SMALL_VIDEO_VIEWS);
  if (eligible.length < 8) return null;

  const start = (v: RewatchVideo) => v.startRatio as number;
  const extra = (v: RewatchVideo) => Math.max(start(v) - 1, 0);
  const cut = median(eligible.map((v) => v.durationSec as number));
  const shorter = eligible.filter((v) => (v.durationSec as number) <= cut);
  const longer = eligible.filter((v) => (v.durationSec as number) > cut);

  const lengthSplit =
    shorter.length >= 4 && longer.length >= 4
      ? { shorterMedian: median(shorter.map(start)), longerMedian: median(longer.map(start)), shorterCount: shorter.length, longerCount: longer.length }
      : null;

  let standout: RewatchInsight["standout"] = null;
  for (const group of [shorter, longer]) {
    if (group.length < 4) continue;
    for (const v of group) {
      const others = group.filter((o) => o !== v);
      const usual = median(others.map(extra));
      const e = extra(v);
      if (e < REWATCH_STANDOUT_MIN_EXTRA || e < REWATCH_STANDOUT_MULTIPLE * Math.max(usual, 0.05)) continue;
      if (!standout || start(v) > standout.startRatio) {
        standout = { id: v.id, title: v.title, startRatio: start(v), durationSec: v.durationSec as number, usualForLength: 1 + usual, sameLengthCount: others.length };
      }
    }
  }

  return {
    eligible: eligible.length,
    leftOutSmall: withCurve.length - eligible.length,
    medianStartRatio: median(eligible.map(start)),
    lengthSplit,
    standout,
  };
}

// ---- posting time ----

export type PostingTimeVideo = { publishedAt: string | null; views: number | null };

export type TimeWindow = "morning" | "midday" | "evening" | "night";

export const TIME_WINDOW_LABEL: Record<TimeWindow, string> = {
  morning: "in the morning",
  midday: "around midday",
  evening: "in the evening",
  night: "at night",
};

function windowOf(hour: number): TimeWindow {
  if (hour >= 5 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 16) return "midday";
  if (hour >= 17 && hour <= 21) return "evening";
  return "night";
}

export type PostingTimeInsight =
  | { kind: "consistent"; window: TimeWindow; count: number; of: number; earliestHour: number; latestHour: number }
  | { kind: "pattern"; better: TimeWindow; worse: TimeWindow; betterCount: number; worseCount: number; betterMedianViews: number; worseMedianViews: number };

// Hours are read in the viewer's own time zone (this runs in the browser), which
// is the creator's. If almost every video goes out in one window there is
// nothing to compare, so the only honest statements are the fact and an
// invitation to try another time once ("worth testing", never a claim it helps).
// If two windows each have >= 4 videos and one's median views is >= 1.3x the
// other's, that is a pattern in the creator's own videos (spec §7).
export function postingTimeInsight(videos: PostingTimeVideo[]): PostingTimeInsight | null {
  const dated = videos
    .filter((v) => v.publishedAt)
    .map((v) => ({ hour: new Date(v.publishedAt as string).getHours(), views: v.views }));
  if (dated.length < 12) return null;

  const groups = new Map<TimeWindow, typeof dated>();
  for (const v of dated) groups.set(windowOf(v.hour), [...(groups.get(windowOf(v.hour)) ?? []), v]);

  const top = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  if (top[1].length / dated.length >= 0.8) {
    const hours = top[1].map((v) => v.hour);
    return { kind: "consistent", window: top[0], count: top[1].length, of: dated.length, earliestHour: Math.min(...hours), latestHour: Math.max(...hours) };
  }

  const big = [...groups.entries()].filter(([, g]) => g.length >= 4 && g.every((v) => v.views !== null));
  if (big.length >= 2) {
    const meds = big.map(([w, g]) => ({ w, n: g.length, med: median(g.map((v) => v.views as number)) })).sort((a, b) => b.med - a.med);
    const better = meds[0];
    const worse = meds[meds.length - 1];
    if (worse.med > 0 && better.med / worse.med >= 1.3) {
      return { kind: "pattern", better: better.w, worse: worse.w, betterCount: better.n, worseCount: worse.n, betterMedianViews: better.med, worseMedianViews: worse.med };
    }
  }
  return null;
}
