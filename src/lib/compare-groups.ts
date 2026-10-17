import type { DashboardAccount, DashboardVideo } from "@/lib/dashboard-data";
import { median } from "@/lib/insight-patterns";
import { SMALL_VIDEO_VIEWS } from "@/lib/cross-video-insights";
import { formatCount } from "@/lib/format";
import { videoRef } from "@/lib/video-ref";
import { hookTypeLabel } from "@/lib/hook-library";
import type { MetricFormat } from "@/lib/compare-insights";
import type { TextKey, Translator } from "@/lib/i18n/translate";

// The other comparisons (decided 2026-10-17): a video against the creator's usual, a
// format or an opening against another one, and one platform against another. Same
// honesty as the rest of the engine: medians with counts, minimum sizes, a gap only
// when it is clear, never a cause. Platforms are never compared on raw numbers (views
// mean different things on each); each is held against its own usual.

export const USUAL_MIN_OTHERS = 10;
export const GROUP_MIN = 4;
// Hooks: a creator with a consistent style has one hook type with many videos and the others with a few; from 2
// videos the comparison is shown, but only as a hint (owner decision 2026-10-17).
export const HOOK_MIN = 2;
export const groupMinFor = (by: GroupKind) => (by === "hook" ? HOOK_MIN : GROUP_MIN);
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
export function groupOptions(videos: DashboardVideo[], by: GroupKind, platform: string, formatId: string | null = null): { id: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of videos) {
    const id = v.platform === platform && v.analyzed && (!formatId || v.formatId === formatId) ? groupIdOf(v, by) : null;
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()].map(([id, count]) => ({ id, count })).sort((x, y) => y.count - x.count);
}

export type GroupRow = { key: TextKey; format: MetricFormat; a: number | null; b: number | null; better: boolean };
export type GroupResult = {
  countA: number;
  countB: number;
  enough: boolean;
  // Enough to show, but at least one group has fewer than GROUP_MIN videos: only a hint.
  few: boolean;
  rows: GroupRow[];
  statements: string[];
  notes: string[];
};

export function groupComparison(videos: DashboardVideo[], by: GroupKind, platform: string, idA: string, idB: string, nameA: string, nameB: string, t: Translator, formatId: string | null = null): GroupResult {
  const pool = videos.filter((v) => v.platform === platform && v.analyzed && (!formatId || v.formatId === formatId));
  const a = pool.filter((v) => groupIdOf(v, by) === idA);
  const b = pool.filter((v) => groupIdOf(v, by) === idB);
  const min = groupMinFor(by);
  const enough = a.length >= min && b.length >= min;
  const few = enough && (a.length < GROUP_MIN || b.length < GROUP_MIN);

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
  return { countA: a.length, countB: b.length, enough, few, rows, statements, notes };
}

// ---- which hook did best inside one format ----
export type HookRankRow = {
  id: string;
  count: number;
  typicalViews: number | null;
  typicalLikes: number | null;
  typicalEngagement: number | null;
  top: { id: string; title: string; views: number } | null;
};
export type HookRanking = { videos: number; rows: HookRankRow[]; usable: HookRankRow[]; statements: string[]; few: boolean };

export function hookRanking(videos: DashboardVideo[], platform: string, formatId: string, t: Translator): HookRanking {
  const pool = videos.filter((v) => v.platform === platform && v.analyzed && v.formatId === formatId && v.hookTypeId);
  const byHook = new Map<string, DashboardVideo[]>();
  for (const v of pool) byHook.set(v.hookTypeId as string, [...(byHook.get(v.hookTypeId as string) ?? []), v]);

  const rows: HookRankRow[] = [...byHook.entries()]
    .map(([id, list]) => {
      const best = [...list].filter((v) => v.views !== null).sort((x, y) => (y.views ?? 0) - (x.views ?? 0))[0];
      return {
        id,
        count: list.length,
        typicalViews: medianOf(list.map((v) => v.views)),
        typicalLikes: medianOf(list.map((v) => v.likes)),
        typicalEngagement: medianOf(list.map(engagement)),
        top: best ? { id: best.id, title: best.title, views: best.views ?? 0 } : null,
      };
    })
    .sort((x, y) => (y.typicalViews ?? 0) - (x.typicalViews ?? 0));

  // A hook counts from HOOK_MIN videos; under GROUP_MIN it is only a hint.
  const usable = rows.filter((row) => row.count >= HOOK_MIN && row.typicalViews !== null);
  const statements: string[] = [];
  const hookName = (id: string) => hookTypeLabel(id, t) ?? id;
  if (usable.length >= 2) {
    const [first, second] = usable;
    const ratio = (first.typicalViews as number) / Math.max(1, second.typicalViews as number);
    if (ratio >= 1.3) {
      statements.push(
        t("compare2.hookRankBest", {
          hook: hookName(first.id),
          a: formatCount(first.typicalViews as number),
          n: first.count,
          other: hookName(second.id),
          b: formatCount(second.typicalViews as number),
          m: second.count,
        })
      );
      if (first.top) statements.push(t("compare2.hookRankTop", { hook: hookName(first.id), video: `${t.locale === "he" ? "״" : "“"}${videoRef(first.top.id, first.top.title)}${t.locale === "he" ? "״" : "”"}`, views: formatCount(first.top.views) }));
    } else {
      statements.push(t("compare2.hookRankClose", { hook: hookName(first.id), other: hookName(second.id) }));
    }
  } else {
    statements.push(t("compare2.hookRankNone", { min: HOOK_MIN }));
  }
  const few = usable.length >= 2 && usable.slice(0, 2).some((row) => row.count < GROUP_MIN);
  return { videos: pool.length, rows, usable, statements, few };
}

// ---- the videos of one hook, ranked (which one did best under this hook) ----
export type HookInside = {
  videos: DashboardVideo[]; // most views first
  middle: number | null;
  statements: string[];
  few: boolean;
};

export function hookInside(videos: DashboardVideo[], platform: string, hookId: string, formatId: string | null, t: Translator): HookInside {
  const pool = videos
    .filter((v) => v.platform === platform && v.analyzed && v.hookTypeId === hookId && (!formatId || v.formatId === formatId) && v.views !== null)
    .sort((x, y) => (y.views ?? 0) - (x.views ?? 0));
  const middle = medianOf(pool.map((v) => v.views));
  const name = (v: DashboardVideo) => `${t.locale === "he" ? "״" : "“"}${videoRef(v.id, v.title)}${t.locale === "he" ? "״" : "”"}`;
  const hook = hookTypeLabel(hookId, t) ?? hookId;
  const statements: string[] = [];
  if (pool.length >= 2 && middle) {
    const best = pool[0];
    const worst = pool[pool.length - 1];
    const x = (best.views ?? 0) / middle;
    statements.push(
      t(x >= 1.3 ? "compare2.insideBest" : "compare2.insideClose", {
        count: pool.length,
        hook,
        video: name(best),
        views: formatCount(best.views ?? 0),
        x: x.toFixed(1).replace(/\.0$/, ""),
        mid: formatCount(middle),
      })
    );
    if (pool.length >= 3) statements.push(t("compare2.insideWorst", { video: name(worst), views: formatCount(worst.views ?? 0), hook }));
  }
  return { videos: pool, middle, statements, few: pool.length > 0 && pool.length < GROUP_MIN };
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
