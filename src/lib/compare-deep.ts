import { biggestDropAt, type CompareVideo } from "@/lib/compare-data";
import { familiarLabel, hookTypeLabel } from "@/lib/hook-library";
import type { IdentityRow, MetricRow } from "@/lib/compare-insights";
import { stayedToWatchPct } from "@/lib/insight-rules";
import { videoRef } from "@/lib/video-ref";
import type { Translator } from "@/lib/i18n/translate";

// The in-depth part of Compare: how each video OPENS (what the AI read) and how viewers
// WATCHED (YouTube Analytics, or the creator's TikTok screenshots). Same rules as the
// regular comparison: only clear gaps, counts always stated, no causes, and a
// recommendation instead of a guess.

export type HookText = { onScreen: string | null; spoken: string | null; sung: string | null };

export type DeepComparison = {
  // What each video says and shows as its hook (the first seconds).
  hooks: { a: HookText; b: HookText };
  opening: IdentityRow[];
  // How viewers watched: every number both sides have, side by side.
  viewers: MetricRow[];
  statements: string[];
  // Videos whose viewer numbers are missing (TikTok without screenshots).
  noViewerNumbers: CompareVideo[];
};

const value = (v: CompareVideo, field: string) => v.fields?.[field]?.value;

const str = (v: CompareVideo, field: string): string | null => {
  const raw = value(v, field);
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
};

const textsFirst3 = (v: CompareVideo): string[] => {
  const texts = value(v, "on_screen_texts") as { text: string; role: string }[] | undefined;
  return (texts ?? []).filter((item) => item.role !== "scene").map((item) => item.text);
};

// The first words heard: spoken, else sung.
const firstWords = (v: CompareVideo) => str(v, "spoken_hook_text") ?? str(v, "sung_hook_lyrics");

const viewerNumbers = (v: CompareVideo): boolean =>
  v.platform === "youtube" ? v.avgWatchSec !== null || v.retentionCurve !== null : v.tiktokScreens !== null;

const stopSec = (v: CompareVideo): number | null =>
  v.platform === "youtube" ? biggestDropAt(v.retentionCurve, v.durationSec) : (v.tiktokScreens?.mostStoppedAtSec ?? null);

export function buildDeep(a: CompareVideo, b: CompareVideo, t: Translator, mixed: boolean): DeepComparison {
  const q = (v: CompareVideo) => (t.locale === "he" ? `״${videoRef(v.id, v.title)}״` : `“${videoRef(v.id, v.title)}”`);
  const named = (side: "a" | "b") => ({ big: q(side === "a" ? a : b), small: q(side === "a" ? b : a) });
  const hi = (x: number | null, y: number | null, win: (side: "a" | "b", big: number, small: number) => string | null): string | null => {
    if (x === null || y === null) return null;
    return x >= y ? win("a", x, y) : win("b", y, x);
  };

  const row = (key: IdentityRow["key"], read: (v: CompareVideo) => string | null): IdentityRow => {
    const va = a.fields ? read(a) : null;
    const vb = b.fields ? read(b) : null;
    return { key, a: va, b: vb, same: va !== null && va === vb };
  };

  const opening: IdentityRow[] = [
    row("analysis.fieldLabel.hook_type", (v) => hookTypeLabel(str(v, "hook_type"), t)),
    row("analysis.fieldLabel.familiar_moment", (v) => {
      const id = str(v, "familiar_moment");
      return !id || id === "none" ? t("compare.none") : familiarLabel(id, t);
    }),
    row("compare.rowFirstSeconds", (v) => str(v, "visual_hook")),
  ].filter((r) => r.a !== null || r.b !== null);

  const statements: string[] = [];

  // ---- the opening ----
  const hookA = str(a, "hook_type");
  const hookB = str(b, "hook_type");
  if (hookA && hookB) {
    if (hookA === hookB) {
      statements.push(t("compare.hookSame", { type: hookTypeLabel(hookA, t) ?? hookA }));
    } else {
      statements.push(
        t("compare.hookDiff", {
          a: q(a),
          b: q(b),
          x: hookTypeLabel(hookA, t) ?? hookA,
          y: hookTypeLabel(hookB, t) ?? hookB,
        })
      );
      // The video that clearly got more views: its opening is worth trying again.
      if (!mixed && a.views !== null && b.views !== null) {
        const bigIsA = a.views >= b.views;
        const big = Math.max(a.views, b.views);
        const small = Math.min(a.views, b.views);
        if (small > 0 && big / small >= 1.5) {
          statements.push(t("compare.hookTry", { big: q(bigIsA ? a : b) }));
        }
      }
    }
  }

  if (a.fields && b.fields) {
    const textA = textsFirst3(a).length > 0;
    const textB = textsFirst3(b).length > 0;
    if (textA !== textB) statements.push(t("compare.textFirstOnly", { with: q(textA ? a : b), without: q(textA ? b : a) }));
    const wordsA = firstWords(a) !== null;
    const wordsB = firstWords(b) !== null;
    if (wordsA !== wordsB) statements.push(t("compare.wordsFirstOnly", { with: q(wordsA ? a : b), without: q(wordsA ? b : a) }));
  }

  // ---- how viewers watched (same platform only: the numbers are counted differently) ----
  const beforeViewers = statements.length;
  if (!mixed) {
    const sa = a.tiktokScreens;
    const sb = b.tiktokScreens;
    if (a.platform === "tiktok" && sa && sb) {
      const full = hi(sa.watchedFullPct, sb.watchedFullPct, (side, big, small) =>
        big - small >= 8 ? t("compare.fullGap", { ...named(side), a: Math.round(big), b: Math.round(small) }) : null
      );
      if (full) statements.push(full);

      const newViewers = hi(sa.newViewersPct, sb.newViewersPct, (side, big, small) =>
        big - small >= 15 ? t("compare.newViewersGap", { ...named(side), a: Math.round(big), b: Math.round(small) }) : null
      );
      if (newViewers) statements.push(newViewers);

      const per = (count: number | null, views: number | null, scale: number) =>
        count !== null && views !== null && views > 0 ? (count / views) * scale : null;
      const saves = hi(per(sa.saves, sa.views ?? a.views, 100), per(sb.saves, sb.views ?? b.views, 100), (side, big, small) =>
        small > 0 && big / small >= 1.5 && (side === "a" ? sa.saves : sb.saves)! >= 5
          ? t("compare.savesGap", { ...named(side), a: big.toFixed(2), b: small.toFixed(2) })
          : null
      );
      if (saves) statements.push(saves);

      const gained = hi(per(sa.newFollowers, sa.views ?? a.views, 1000), per(sb.newFollowers, sb.views ?? b.views, 1000), (side, big, small) =>
        small > 0 && big / small >= 1.5 && (side === "a" ? sa.newFollowers : sb.newFollowers)! >= 3
          ? t("compare.newFollowersGap", { ...named(side), a: big.toFixed(1), b: small.toFixed(1) })
          : null
      );
      if (gained) statements.push(gained);
    }

    const stopA = stopSec(a);
    const stopB = stopSec(b);
    if (stopA !== null && stopB !== null && Math.abs(stopA - stopB) >= 3) {
      statements.push(t("compare.stoppedAt", { first: q(a), second: q(b), a: stopA, b: stopB }));
    }
  }

  const viewerStatement = statements.length > beforeViewers;
  // The viewer numbers side by side (watching, stopping, who they were).
  const watchShare = (v: CompareVideo) =>
    v.avgWatchSec !== null && v.durationSec ? (v.avgWatchSec / v.durationSec) * 100 : (v.tiktokScreens?.avgPercentWatched ?? null);
  const avgWatch = (v: CompareVideo) => v.avgWatchSec ?? v.tiktokScreens?.avgWatchSec ?? null;
  const followersPct = (v: CompareVideo) => {
    const rows = v.breakdowns?.subscribedStatus;
    if (rows && rows.length > 0) {
      const total = rows.reduce((sum, item) => sum + item.views, 0);
      const subs = rows.filter((item) => item.subscribed).reduce((sum, item) => sum + item.views, 0);
      return total > 0 ? (subs / total) * 100 : null;
    }
    return v.tiktokScreens?.followersPct ?? null;
  };
  const m = (key: MetricRow["key"], va: number | null, vb: number | null, format: MetricRow["format"], better: MetricRow["better"] = "higher"): MetricRow | null =>
    va === null && vb === null ? null : { key, a: va, b: vb, format, better };
  const viewers = [
    m("compare.metricWatchShare", watchShare(a), watchShare(b), "percent"),
    m("compare.metricAvgWatch", avgWatch(a), avgWatch(b), "seconds"),
    m("compare.metricStayed", stayedToWatchPct(a.breakdowns?.engagement), stayedToWatchPct(b.breakdowns?.engagement), "percent"),
    m("compare.metricFull", a.tiktokScreens?.watchedFullPct ?? null, b.tiktokScreens?.watchedFullPct ?? null, "percent"),
    m("compare.metricStopped", stopSec(a), stopSec(b), "clock", "none"),
    m("compare.metricFollowers", followersPct(a), followersPct(b), "percent", "none"),
    m("compare.metricNewViewers", a.tiktokScreens?.newViewersPct ?? null, b.tiktokScreens?.newViewersPct ?? null, "percent", "none"),
    m("compare.metricNewFollowers", a.tiktokScreens?.newFollowers ?? null, b.tiktokScreens?.newFollowers ?? null, "count"),
    m("compare.metricSaves", a.tiktokScreens?.saves ?? null, b.tiktokScreens?.saves ?? null, "count"),
  ].filter((row): row is MetricRow => row !== null);

  // Both have viewer numbers but nothing differs clearly: say so, so the section is never silent.
  if (viewers.length > 0 && viewerNumbers(a) && viewerNumbers(b) && !viewerStatement) {
    statements.push(t("compare.viewersNoGap"));
  }

  const noViewerNumbers = [a, b].filter((video) => !viewerNumbers(video));

  const hookText = (v: CompareVideo): HookText => {
    const texts = textsFirst3(v);
    return { onScreen: texts.length > 0 ? texts.join(" · ") : null, spoken: str(v, "spoken_hook_text"), sung: str(v, "sung_hook_lyrics") };
  };

  return { hooks: { a: hookText(a), b: hookText(b) }, opening, viewers, statements, noViewerNumbers };
}
