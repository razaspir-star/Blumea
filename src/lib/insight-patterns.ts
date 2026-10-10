// First real L4 pattern (doc/Insight_Engine_Spec.md §7), metric-only: does the
// creator's own video length go with how much of each video gets watched?
// Metric-only patterns are allowed from the first scan, with counts (§7, last
// paragraph) -- the "not just length" exclusion applies to AI-field patterns,
// and here length *is* the feature.

export type LengthWatchPoint = { durationSec: number; avgWatchSec: number; formatId?: string | null };

// The format most videos of a group share (>= 60% of them), if any. When a
// length group is mostly one format, "short" and that format go together in
// the creator's videos and the pattern should say so, not credit the length
// alone (owner, 2026-10-07).
export type DominantFormat = { formatId: string; count: number; of: number };

export type LengthWatchPattern = {
  cutoffSec: number;
  shortCount: number;
  longCount: number;
  totalCount: number;
  shortMedianPct: number;
  longMedianPct: number;
  shortKeepsMore: boolean;
  // Dominant format of the group that holds viewers better, and of the other group.
  betterDominant: DominantFormat | null;
  worseDominant: DominantFormat | null;
};

// Starting values from §7 (>= 12 analyzed in total, >= 4 per group, group
// medians differ by >= 1.3x). The 20 s cutoff is this feature's own binary
// split and, like the other thresholds, a proposal to tune on real data.
export const PATTERN_MIN_TOTAL = 12;
export const PATTERN_MIN_PER_GROUP = 4;
export const PATTERN_MIN_RATIO = 1.3;
// The split is made at the CREATOR'S OWN median length, not at a fixed number
// of seconds (owner, 2026-10-07: a creator whose videos are all long, or all
// short, is just being themselves on that platform; asking for "4 short and 4
// long" videos would ask them to change their style). "Shorter or longer than
// your usual" always splits the creator's own videos into two balanced groups.

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function lengthVsWatchSharePattern(videos: LengthWatchPoint[]): LengthWatchPattern | null {
  const usable = videos.filter((v) => v.durationSec > 0 && v.avgWatchSec >= 0);
  if (usable.length < PATTERN_MIN_TOTAL) return null;

  const shares = (group: LengthWatchPoint[]) => group.map((v) => v.avgWatchSec / v.durationSec);
  const cutoff = Math.round(median(usable.map((v) => v.durationSec)));
  const shortGroup = usable.filter((v) => v.durationSec <= cutoff);
  const longGroup = usable.filter((v) => v.durationSec > cutoff);
  if (shortGroup.length < PATTERN_MIN_PER_GROUP || longGroup.length < PATTERN_MIN_PER_GROUP) return null;

  const shortMedian = median(shares(shortGroup));
  const longMedian = median(shares(longGroup));
  if (longMedian === 0 || shortMedian === 0) return null;

  const ratio = shortMedian / longMedian;
  if (ratio < PATTERN_MIN_RATIO && ratio > 1 / PATTERN_MIN_RATIO) return null;

  const dominant = (group: LengthWatchPoint[]): DominantFormat | null => {
    const counts = new Map<string, number>();
    for (const v of group) if (v.formatId) counts.set(v.formatId, (counts.get(v.formatId) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return top && top[1] / group.length >= 0.6 ? { formatId: top[0], count: top[1], of: group.length } : null;
  };

  const shortKeepsMore = ratio > 1;
  return {
    cutoffSec: cutoff,
    shortCount: shortGroup.length,
    longCount: longGroup.length,
    totalCount: usable.length,
    shortMedianPct: Math.round(shortMedian * 100),
    longMedianPct: Math.round(longMedian * 100),
    shortKeepsMore,
    betterDominant: dominant(shortKeepsMore ? shortGroup : longGroup),
    worseDominant: dominant(shortKeepsMore ? longGroup : shortGroup),
  };
}
