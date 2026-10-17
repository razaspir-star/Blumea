import type { DashboardVideo } from "@/lib/dashboard-data";
import { againstPool, GROUP_MIN, type UsualRow } from "@/lib/compare-groups";
import { formatLabel } from "@/lib/format-library";
import { hookTypeLabel } from "@/lib/hook-library";
import { videoRef } from "@/lib/video-ref";
import type { Translator } from "@/lib/i18n/translate";

// The in-depth part of "video vs your other videos": the video against the creator's other videos of the
// SAME FORMAT on the same platform (only those Blumea has read), and the hook: where this video stands
// among them and whether a video that did clearly better opened with a DIFFERENT hook. Same rules as the
// rest: counts always stated, a recommendation only from a clear difference, never a cause.

export type HookInfo = { type: string | null; text: string | null };

export type UsualDeep = {
  formatId: string | null;
  formatName: string | null;
  group: number; // videos of this format, this one included
  enough: boolean;
  rows: UsualRow[];
  statements: string[];
  hookStatements: string[];
};

// The hook as written or said: on-screen text of the first seconds, else the first spoken or sung words.
export function hookInfoOf(fields: Record<string, { value?: unknown }> | null): HookInfo {
  if (!fields) return { type: null, text: null };
  const str = (key: string) => {
    const raw = fields[key]?.value;
    return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
  };
  const texts = (fields.on_screen_texts?.value as { text: string; role: string }[] | undefined) ?? [];
  const onScreen = texts.filter((item) => item.role !== "scene").map((item) => item.text).join(" · ");
  const text = onScreen || str("spoken_hook_text") || str("sung_hook_lyrics");
  return { type: str("hook_type"), text: text ? text.slice(0, 90) : null };
}

const words = (text: string) => new Set(text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean));
function similar(x: string, y: string): boolean {
  const a = words(x);
  const b = words(y);
  if (a.size === 0 || b.size === 0) return false;
  const shared = [...a].filter((w) => b.has(w)).length;
  return shared / (a.size + b.size - shared) >= 0.6;
}

// Two hooks are the same when they are the same kind and, where both words are known, nearly the same words.
function sameHook(x: HookInfo | undefined, y: HookInfo | undefined): boolean | null {
  if (!x || !y || !x.type || !y.type) return null;
  if (x.type !== y.type) return false;
  if (x.text && y.text) return similar(x.text, y.text);
  return true;
}

export function usualDeep(video: DashboardVideo, all: DashboardVideo[], hooks: Map<string, HookInfo>, t: Translator): UsualDeep {
  const formatId = video.formatId ?? null;
  const formatName = formatId ? (formatLabel(formatId, t) ?? formatId) : null;
  const quote = (text: string) => (t.locale === "he" ? `״${text}״` : `“${text}”`);
  const name = (v: DashboardVideo) => quote(videoRef(v.id, v.title));

  const others = formatId ? all.filter((v) => v.id !== video.id && v.platform === video.platform && v.analyzed && v.formatId === formatId) : [];
  const group = others.length + 1;
  const enough = group >= GROUP_MIN;
  if (!formatId || !enough) return { formatId, formatName, group, enough: false, rows: [], statements: [], hookStatements: [] };

  const { rows, statements } = againstPool(video, others, t, true, { above: "compare2.formatAbove", below: "compare2.formatBelow", close: "compare2.formatClose" }, { format: formatName ?? "", count: others.length });

  // ---- the hook, among the videos of this format ----
  const describe = (v: DashboardVideo) => {
    const info = hooks.get(v.id);
    const type = info?.type ? hookTypeLabel(info.type, t) : null;
    if (type && info?.text) return `${type}: ${quote(info.text)}`;
    return type ?? (info?.text ? quote(info.text) : "");
  };
  const hookStatements: string[] = [];
  const ranked = [video, ...others].filter((v) => v.views !== null).sort((x, y) => (y.views ?? 0) - (x.views ?? 0));
  if (video.views !== null && ranked.length >= GROUP_MIN && hooks.get(video.id)?.type) {
    const myViews = video.views;
    const rank = ranked.findIndex((v) => v.id === video.id) + 1;
    const best = ranked[0];
    const mine = describe(video);
    if (best.id === video.id) {
      hookStatements.push(t("compare2.hookBest", { video: name(video), format: formatName ?? "", count: ranked.length, hook: mine }));
    } else if ((best.views ?? 0) > 0 && myViews >= 0.8 * (best.views ?? 0)) {
      hookStatements.push(t("compare2.hookNearBest", { video: name(video), format: formatName ?? "", count: ranked.length, rank, best: name(best), hook: mine }));
    } else {
      const better = ranked.filter((v) => v.id !== video.id && (v.views ?? 0) >= 1.5 * myViews);
      if (better.length > 0 && sameHook(hooks.get(video.id), hooks.get(better[0].id)) === true) {
        hookStatements.push(t("compare2.hookSameAsBest", { video: name(video), best: name(better[0]), hook: mine }));
      }
      // The best video that opened with a different hook.
      const different = better.find((v) => sameHook(hooks.get(video.id), hooks.get(v.id)) === false);
      if (different) {
        hookStatements.push(
          t("compare2.hookTry", { format: formatName ?? "", best: name(different), views: different.views ?? 0, count: ranked.length, mine, theirs: describe(different) })
        );
      }
    }
  }

  return { formatId, formatName, group, enough: true, rows, statements, hookStatements };
}
