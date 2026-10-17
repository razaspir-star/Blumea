import type { DashboardAccount, DashboardVideo } from "@/lib/dashboard-data";
import { median } from "@/lib/insight-patterns";
import { SMALL_VIDEO_VIEWS } from "@/lib/cross-video-insights";
import { formatCount } from "@/lib/format";
import { videoRef } from "@/lib/video-ref";
import type { MetricFormat } from "@/lib/compare-insights";
import type { TextKey, Translator } from "@/lib/i18n/translate";

// The other comparisons (decided 2026-10-17): a video against the creator's usual, a
// format or an opening against another one, and one platform against another. Same
// honesty as the rest of the engine: medians with counts, minimum sizes, a gap only
// when it is clear, never a cause. Platforms are never compared on raw numbers (views
// mean different things on each); each is held against its own usual.

export const USUAL_MIN_OTHERS = 10;
export const GROUP_MIN = 4;
export const PLATFORM_MIN = 5;

// ---- the numbers of one video ----
const engagement = (v: DashboardVideo) =>
  v.views && v.views > 0 && v.likes !== null && v.comments !== null ? ((v.likes + v.comments) / v.views) * 100 : null;
const watchShare = (v: DashboardVideo) => (v.avgWatchSec !== null && v.durationSec ? (v.avgWatchSec / v.durationSec) * 100 : null);
const rewatch = (v: DashboardVideo) => v.retentionCurve?.[0]?.watchRatio ?? null;
const followersPer1000 = (v: DashboardVideo) =>
  v.followersGained !== null && v.analyticsViews && v.analyticsViews > 0 ? (v.followersGained / v.analyticsViews) * 1000 : null;

type Metric = { key: TextKey; format: MetricFormat; read: (v: DashboardVideo) => number | null; kind: "count" | "points" };

// "count": a ratio says it (2.3x); "points": percentages, a difference in points says it.
const METRICS: Metric[] = [
  { key: "compare.metricViews", format: "count", read: (v) => v.views, kind: "count" },
  { key: "compare.metricLikes", format: "count", read: (v) => v.likes, kind: "count" },
  { key: "compare.metricComments", format: "count", read: (v) => v.comments, kind: "count" },
  { key: "compare.metricEngagement", format: "decimal", read: engagement, kind: "count" },
  { key: "compare.metricWatchShare", format: "percent", read: watchShare, kind: "points" },
  { key: "compare.metricStayed", format: "percent", read: (v) => v.stayedPct, kind: "points" },
  { key: "compare.metricRewatch", format: "decimal", read: rewatch, kind: "count" },
  { key: "compare.metricFollowersGained", format: "decimal", read: followersPer1000, kind: "count" },
];

// A number as the comparison sentences write it.
const fmtValue = (x: number, format: MetricFormat) =>
  format === "percent" ? `${Math.round(x)}%` : format === "count" ? formatCount(x) : x.toFixed(2).replace(/\.?0+$/, "");

// One line of "the biggest gaps": a multiple for counts, "a vs b" for percentages.
type Gap = { size: number; text: string };
function gapItem(m: Metric, hi: number, lo: number, more: boolean, valueFirst: number, valueSecond: number, t: Translator): Gap {
  if (m.kind === "points") {
    return { size: (hi - lo) / 8, text: t("compare2.itemPoints", { metric: t(m.key), a: fmtValue(valueFirst, m.format), b: fmtValue(valueSecond, m.format) }) };
  }
  const x = hi / lo;
  return { size: x, text: t(more ? "compare2.itemMore" : "compare2.itemLess", { metric: t(m.key), x: x.toFixed(1).replace(/\.0$/, "") }) };
}
const topGaps = (gaps: Gap[]) =>
  [...gaps]
    .sort((x, y) => y.size - x.size)
    .slice(0, 3)
    .map((gap) => gap.text)
    .join(", ");

const medianOf = (values: (number | null)[]): number | null => {
  const real = values.filter((x): x is number => x !== null && Number.isFinite(x));
  return real.length ? median(real) : null;
};

// ---- a video against the creator's usual ----
export type UsualRow = { key: TextKey; format: MetricFormat; value: number | null; usual: number | null; ratio: number | null };
export type UsualResult = {
  others: number;
  enough: boolean;
  rows: UsualRow[];
  statements: string[];
  notes: string[];
};

type PoolTexts = { above: TextKey; below: TextKey; close: TextKey };

// The rows and sentences for a video held against a pool of other videos (all the others, or the others
// of the same format).
export function againstPool(video: DashboardVideo, others: DashboardVideo[], t: Translator, enough: boolean, texts: PoolTexts, extra: Record<string, string | number> = {}) {
  const name = t.locale === "he" ? `״${videoRef(video.id, video.title)}״` : `“${videoRef(video.id, video.title)}”`;

  const rows: UsualRow[] = METRICS.map((m) => {
    const value = m.read(video);
    const usual = medianOf(others.map(m.read));
    return { key: m.key, format: m.format, value, usual, ratio: value !== null && usual !== null && usual > 0 ? value / usual : null };
  }).filter((row) => row.value !== null && row.usual !== null);

  const statements: string[] = [];
  if (enough) {
    const above: Gap[] = [];
    const below: Gap[] = [];
    METRICS.forEach((m) => {
      const row = rows.find((r) => r.key === m.key);
      if (!row || row.value === null || row.usual === null) return;
      const clear =
        m.kind === "points" ? Math.abs(row.value - row.usual) >= 8 : row.usual > 0 && row.value > 0 && (row.value / row.usual >= 1.5 || row.value / row.usual <= 1 / 1.5);
      if (!clear) return;
      if (row.value > row.usual) above.push(gapItem(m, row.value, row.usual, true, row.value, row.usual, t));
      else below.push(gapItem(m, row.usual, row.value, false, row.value, row.usual, t));
    });
    const total = rows.length;
    if (above.length > 0) statements.push(t(texts.above, { video: name, n: above.length, total, list: topGaps(above), ...extra }));
    if (below.length > 0) statements.push(t(texts.below, { video: name, n: below.length, total, list: topGaps(below), ...extra }));
    if (statements.length === 0) statements.push(t(texts.close, { video: name, ...extra }));
  }
  return { rows, statements };
}

export function usualComparison(video: DashboardVideo, all: DashboardVideo[], t: Translator): UsualResult {
  const others = all.filter((v) => v.id !== video.id && v.platform === video.platform);
  const enough = others.length >= USUAL_MIN_OTHERS;
  const { rows, statements } = againstPool(video, others, t, enough, { above: "compare2.usualAbove", below: "compare2.usualBelow", close: "compare2.usualClose" });

  const notes: string[] = [t("compare2.usualDisclaimer")];
  if ((video.views ?? Infinity) < SMALL_VIDEO_VIEWS) notes.push(t("compare.small"));
  return { others: others.length, enough, rows, statements, notes };
}

// ---- format against format, opening against opening ----
export type GroupKind = "format" | "hook";
export const groupIdOf = (v: DashboardVideo, by: GroupKind) => (by === "format" ? v.formatId : v.hookTypeId);

// The groups the creator can pick from: YouTube videos Blumea has read, by format or opening.
export function groupOptions(videos: DashboardVideo[], by: GroupKind, platform: string): { id: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of videos) {
    const id = v.platform === platform && v.analyzed ? groupIdOf(v, by) : null;
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()].map(([id, count]) => ({ id, count })).sort((x, y) => y.count - x.count);
}

export type GroupRow = { key: TextKey; format: MetricFormat; a: number | null; b: number | null; better: boolean };
export type GroupResult = {
  countA: number;
  countB: number;
  enough: boolean;
  rows: GroupRow[];
  statements: string[];
  notes: string[];
};

export function groupComparison(videos: DashboardVideo[], by: GroupKind, platform: string, idA: string, idB: string, nameA: string, nameB: string, t: Translator): GroupResult {
  const pool = videos.filter((v) => v.platform === platform && v.analyzed);
  const a = pool.filter((v) => groupIdOf(v, by) === idA);
  const b = pool.filter((v) => groupIdOf(v, by) === idB);
  const enough = a.length >= GROUP_MIN && b.length >= GROUP_MIN;

  const lengthA = medianOf(a.map((v) => v.durationSec));
  const lengthB = medianOf(b.map((v) => v.durationSec));
  const rows: GroupRow[] = [
    ...METRICS.map((m) => ({ key: m.key, format: m.format, a: medianOf(a.map(m.read)), b: medianOf(b.map(m.read)), better: true })),
    { key: "compare.metricDuration" as TextKey, format: "seconds" as MetricFormat, a: lengthA, b: lengthB, better: false },
  ].filter((row) => row.a !== null || row.b !== null);

  const statements: string[] = [];
  if (enough) {
    const aheadA: Gap[] = [];
    const aheadB: Gap[] = [];
    let total = 0;
    for (const m of METRICS) {
      const row = rows.find((r) => r.key === m.key);
      if (!row || row.a === null || row.b === null) continue;
      total += 1;
      const bigIsA = row.a >= row.b;
      const big = bigIsA ? row.a : row.b;
      const small = bigIsA ? row.b : row.a;
      const clear = m.kind === "points" ? big - small >= 8 : small > 0 && big / small >= 1.3;
      if (!clear) continue;
      (bigIsA ? aheadA : aheadB).push(gapItem(m, big, small, true, big, small, t));
    }
    if (aheadA.length > 0) statements.push(t("compare2.groupGap", { big: nameA, small: nameB, n: aheadA.length, total, list: topGaps(aheadA) }));
    if (aheadB.length > 0) statements.push(t("compare2.groupGap", { big: nameB, small: nameA, n: aheadB.length, total, list: topGaps(aheadB) }));
    if (statements.length === 0) statements.push(t("compare.noGap"));
    if (lengthA !== null && lengthB !== null && Math.max(lengthA, lengthB) / Math.max(1, Math.min(lengthA, lengthB)) >= 1.5) {
      statements.push(t("compare2.lengthWarn", { a: t("compare.seconds", { n: Math.round(lengthA) }), b: t("compare.seconds", { n: Math.round(lengthB) }) }));
    }
  }

  const notes: string[] = [t("compare2.groupDisclaimer", { count: pool.length })];
  return { countA: a.length, countB: b.length, enough, rows, statements, notes };
}

// ---- platform against platform (each against its own usual) ----
export type PlatformSummary = {
  platform: string;
  followers: number | null;
  videos: number;
  analyzed: number;
  typicalViews: number | null;
  typicalLikes: number | null;
  typicalEngagement: number | null;
  strongest: { id: string; title: string; ratio: number } | null;
};

export function platformSummary(videos: DashboardVideo[], accounts: DashboardAccount[], platform: string): PlatformSummary {
  const own = videos.filter((v) => v.platform === platform);
  const typicalViews = medianOf(own.map((v) => v.views));
  let strongest: PlatformSummary["strongest"] = null;
  if (typicalViews && own.length >= PLATFORM_MIN) {
    for (const v of own) {
      const ratio = (v.views ?? 0) / typicalViews;
      if (!strongest || ratio > strongest.ratio) strongest = { id: v.id, title: v.title, ratio };
    }
  }
  return {
    platform,
    followers: accounts.find((account) => account.platform === platform)?.followers ?? null,
    videos: own.length,
    analyzed: own.filter((v) => v.analyzed).length,
    typicalViews,
    typicalLikes: medianOf(own.map((v) => v.likes)),
    typicalEngagement: medianOf(own.map(engagement)),
    strongest,
  };
}
