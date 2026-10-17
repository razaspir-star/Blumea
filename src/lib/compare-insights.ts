import { biggestDropAt, type CompareVideo } from "@/lib/compare-data";
import { friendlyFormatLabel, layoutLabel } from "@/lib/format-library";
import { familiarLabel, hookTypeLabel } from "@/lib/hook-library";
import { stayedToWatchPct } from "@/lib/insight-rules";
import { SMALL_VIDEO_VIEWS } from "@/lib/cross-video-insights";
import { formatCount } from "@/lib/format";
import { videoRef } from "@/lib/video-ref";
import type { TextKey, Translator } from "@/lib/i18n/translate";

// Compare, video against video (decided 2026-10-13: the creator's own videos, same
// platform). Code decides what may be said: only numbers both videos have, a "gap"
// only when it is clear, and never a cause -- a pair of videos differs in many
// things at once, and Blumea says so.

export type MetricFormat = "count" | "percent" | "seconds" | "clock" | "decimal" | "date";
export type MetricRow = {
  key: TextKey;
  a: number | string | null;
  b: number | string | null;
  format: MetricFormat;
  // Which side to highlight when the values differ; "none" for facts that are not better or worse.
  better: "higher" | "none";
};
export type IdentityRow = { key: TextKey; a: string | null; b: string | null; same: boolean };

export type Comparison = {
  metrics: MetricRow[];
  identity: IdentityRow[];
  statements: string[];
  notes: string[];
  analyzedBoth: boolean;
};

const fieldValue = (v: CompareVideo, field: string) => v.fields?.[field]?.value;

function topSourceLabel(v: CompareVideo, t: Translator): string | null {
  const rows = v.breakdowns?.trafficSource;
  if (!rows || rows.length === 0) return null;
  const top = [...rows].sort((x, y) => y.views - x.views)[0];
  return t.has(`library.traffic.${top.source}`) ? t(`library.traffic.${top.source}` as TextKey) : top.label;
}

function followersShare(v: CompareVideo): number | null {
  const rows = v.breakdowns?.subscribedStatus;
  if (rows && rows.length > 0) {
    const total = rows.reduce((sum, row) => sum + row.views, 0);
    const subs = rows.filter((row) => row.subscribed).reduce((sum, row) => sum + row.views, 0);
    return total > 0 ? (subs / total) * 100 : null;
  }
  return v.tiktokScreens?.followersPct ?? null;
}

const rate = (v: CompareVideo) =>
  v.views && v.views > 0 && v.likes !== null && v.comments !== null ? ((v.likes + v.comments) / v.views) * 100 : null;
const commentRate = (v: CompareVideo) => (v.views && v.views > 0 && v.comments !== null ? (v.comments / v.views) * 100 : null);
const watchShare = (v: CompareVideo) =>
  v.avgWatchSec !== null && v.durationSec ? (v.avgWatchSec / v.durationSec) * 100 : (v.tiktokScreens?.avgPercentWatched ?? null);
const avgWatch = (v: CompareVideo) => v.avgWatchSec ?? v.tiktokScreens?.avgWatchSec ?? null;
const stayed = (v: CompareVideo) => stayedToWatchPct(v.breakdowns?.engagement);
const rewatch = (v: CompareVideo) => v.retentionCurve?.[0]?.watchRatio ?? null;

export function buildComparison(a: CompareVideo, b: CompareVideo, t: Translator, mixed = false): Comparison {
  const m = (key: TextKey, va: number | string | null, vb: number | string | null, format: MetricFormat, better: "higher" | "none" = "higher"): MetricRow | null =>
    va === null && vb === null ? null : { key, a: va, b: vb, format, better };

  const metrics = [
    m("compare.metricPublished", a.publishedAt, b.publishedAt, "date", "none"),
    m("compare.metricViews", a.views, b.views, "count"),
    m("compare.metricLikes", a.likes, b.likes, "count"),
    m("compare.metricComments", a.comments, b.comments, "count"),
    a.platform === "tiktok" || b.platform === "tiktok" ? m("compare.metricShares", a.shares, b.shares, "count") : null,
    m("compare.metricEngagement", rate(a), rate(b), "decimal"),
    m("compare.metricDuration", a.durationSec, b.durationSec, "seconds", "none"),
    m("compare.metricWatchShare", watchShare(a), watchShare(b), "percent"),
    m("compare.metricAvgWatch", avgWatch(a), avgWatch(b), "seconds"),
    m("compare.metricStayed", stayed(a), stayed(b), "percent"),
    m("compare.metricDrop", biggestDropAt(a.retentionCurve, a.durationSec), biggestDropAt(b.retentionCurve, b.durationSec), "clock", "none"),
    m("compare.metricRewatch", rewatch(a), rewatch(b), "decimal"),
    m("compare.metricFollowers", followersShare(a), followersShare(b), "percent", "none"),
    m("compare.metricTraffic", topSourceLabel(a, t), topSourceLabel(b, t), "decimal", "none"),
    m("compare.metricFull", a.tiktokScreens?.watchedFullPct ?? null, b.tiktokScreens?.watchedFullPct ?? null, "percent"),
    m("compare.metricNewFollowers", a.tiktokScreens?.newFollowers ?? null, b.tiktokScreens?.newFollowers ?? null, "count"),
    m("compare.metricSaves", a.tiktokScreens?.saves ?? null, b.tiktokScreens?.saves ?? null, "count"),
  ].filter((row): row is MetricRow => row !== null);

  // ---- how the two are built (what the AI read) ----
  const analyzedBoth = a.fields !== null && b.fields !== null;
  const cats = (v: CompareVideo) => (fieldValue(v, "categories") as string[] | undefined) ?? null;
  const text = (key: TextKey, read: (v: CompareVideo) => string | null | undefined): IdentityRow => {
    const va = a.fields ? (read(a) ?? null) : null;
    const vb = b.fields ? (read(b) ?? null) : null;
    return { key, a: va, b: vb, same: va !== null && va === vb };
  };
  const askLabel = (v: CompareVideo) => {
    const ask = fieldValue(v, "call_to_action") as { type?: string } | null | undefined;
    if (!ask?.type) return t("compare.none");
    const key = `analysis.cta.${ask.type}`;
    return t.has(key) ? t(key as TextKey) : t("analysis.cta.generic");
  };
  const first3 = (v: CompareVideo) => {
    const texts = fieldValue(v, "on_screen_texts") as { role: string }[] | undefined;
    return texts && texts.some((item) => item.role !== "scene") ? t("compare.yes") : t("compare.no");
  };
  const identity: IdentityRow[] = [
    text("analysis.fieldLabel.format", (v) => friendlyFormatLabel(fieldValue(v, "format") as string | null, cats(v), t)),
    text("analysis.fieldLabel.layout", (v) => layoutLabel(fieldValue(v, "layout") as string | null, t)),
    text("analysis.fieldLabel.hook_type", (v) => hookTypeLabel(fieldValue(v, "hook_type") as string | null, t)),
    text("analysis.fieldLabel.familiar_moment", (v) => {
      const id = fieldValue(v, "familiar_moment") as string | null;
      return !id || id === "none" ? t("compare.none") : familiarLabel(id, t);
    }),
    text("compare.rowAsk", askLabel),
    text("compare.rowTextFirst3", first3),
    text("analysis.fieldLabel.sound_kind", (v) => {
      const id = fieldValue(v, "sound_kind") as string | null;
      return id && t.has(`library.sound.${id}`) ? t(`library.sound.${id}` as TextKey) : id;
    }),
  ].filter((row) => row.a !== null || row.b !== null);

  // ---- what stands out: only clear gaps, each with its numbers ----
  const q = (v: CompareVideo) => (t.locale === "he" ? `״${videoRef(v.id, v.title)}״` : `“${videoRef(v.id, v.title)}”`);
  const statements: string[] = [];
  const hi = <T,>(x: number | null, y: number | null, win: (big: "a" | "b", bigVal: number, smallVal: number) => T | null): T | null => {
    if (x === null || y === null) return null;
    return x >= y ? win("a", x, y) : win("b", y, x);
  };
  const named = (side: "a" | "b") => ({ big: q(side === "a" ? a : b), small: q(side === "a" ? b : a) });

  // Across platforms the raw numbers are not set against each other in a sentence (they are counted
  // differently); only how the two videos are built is.
  const numbersOk = !mixed;
  const views = !numbersOk ? null : hi(a.views, b.views, (side, big, small) =>
    small > 0 && big / small >= 1.5
      ? t("compare.viewsGap", { ...named(side), x: (big / small).toFixed(1).replace(/\.0$/, ""), a: formatCount(big), b: formatCount(small) })
      : null
  );
  if (views) statements.push(views);

  const watch = !numbersOk ? null : hi(watchShare(a), watchShare(b), (side, big, small) =>
    big - small >= 8 ? t("compare.watchGap", { ...named(side), a: Math.round(big), b: Math.round(small) }) : null
  );
  if (watch) statements.push(watch);

  const stay = !numbersOk ? null : hi(stayed(a), stayed(b), (side, big, small) =>
    big - small >= 8 ? t("compare.stayedGap", { ...named(side), a: Math.round(big), b: Math.round(small) }) : null
  );
  if (stay) statements.push(stay);

  const comments = !numbersOk ? null : hi(commentRate(a), commentRate(b), (side, big, small) =>
    small > 0 && big / small >= 1.5 && (side === "a" ? a.comments : b.comments)! >= 5
      ? t("compare.commentsGap", { ...named(side), a: big.toFixed(2), b: small.toFixed(2) })
      : null
  );
  if (comments) statements.push(comments);

  const followers = !numbersOk ? null : hi(followersShare(a), followersShare(b), (side, big, small) =>
    big - small >= 15 ? t("compare.followersGap", { ...named(side), a: Math.round(big), b: Math.round(small) }) : null
  );
  if (followers) statements.push(followers);

  if (statements.length === 0 && !mixed) {
    statements.push(t("compare.noGap"));
  } else {
    const differing = identity.filter((row) => row.a !== null && row.b !== null && !row.same).map((row) => t(row.key));
    if (differing.length > 0) statements.push(t("compare.differ", { list: differing.join(", ") }));
  }

  const notes: string[] = [t("compare.disclaimer")];
  if ((a.views ?? Infinity) < SMALL_VIDEO_VIEWS || (b.views ?? Infinity) < SMALL_VIDEO_VIEWS) notes.push(t("compare.small"));

  return { metrics, identity, statements, notes, analyzedBoth };
}
