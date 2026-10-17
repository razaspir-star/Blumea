import { biggestDropAt, type CompareVideo } from "@/lib/compare-data";
import { familiarLabel, hookTypeLabel } from "@/lib/hook-library";
import type { IdentityRow } from "@/lib/compare-insights";
import { videoRef } from "@/lib/video-ref";
import type { Translator } from "@/lib/i18n/translate";

// The in-depth part of Compare: how each video OPENS (what the AI read) and how viewers
// WATCHED (YouTube Analytics, or the creator's TikTok screenshots). Same rules as the
// regular comparison: only clear gaps, counts always stated, no causes, and a
// recommendation instead of a guess.

export type DeepComparison = {
  opening: IdentityRow[];
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
    row("compare.rowOpeningWords", (v) => firstWords(v) ?? t("compare.none")),
    row("compare.rowOpeningText", (v) => {
      const texts = textsFirst3(v);
      return texts.length > 0 ? texts.join(" · ") : t("compare.none");
    }),
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

  const noViewerNumbers = [a, b].filter((video) => !viewerNumbers(video));

  return { opening, statements, noViewerNumbers };
}
