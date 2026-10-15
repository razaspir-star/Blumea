import { formatCount } from "@/lib/format";
import { formatLabel } from "@/lib/format-library";
import { median } from "@/lib/insight-patterns";
import { SMALL_VIDEO_VIEWS } from "@/lib/cross-video-insights";
import { windowLabel } from "@/lib/insight-cards";
import type { DashboardDerived, DashboardVideo } from "@/lib/dashboard-data";
import type { TextKey, Translator } from "@/lib/i18n/translate";

// "Try in your next video": what to test next, drawn from the creator's own
// numbers. Code decides what may be suggested (every candidate has a trigger
// with counts); the wording is fixed in the dictionaries (exp.*). An experiment is always an invitation
// ("worth testing"), never a promise of a result (spec principle 9), and each
// says what it rests on and what to look at afterwards.
//
// Candidates are ranked by how far the evidence stands out (a multiple of the
// creator's own usual), strongest first; at most one per kind, at most three
// shown. Nothing is shown when no candidate has evidence: silence is fine.

export type NextExperiment = {
  kind: "ask_again" | "repeat_best" | "win_followers" | "early_drop" | "other_time" | "rewatch";
  title: string;
  why: string;
  how: string;
  evidence: string;
  // How far the evidence stands out from the creator's usual (>= 1); only used to rank.
  strength: number;
  // The video the suggestion is about, when it is about one. Two suggestions about
  // the same video are merged into one card (the weaker one becomes a sentence).
  source?: string;
  extra?: string;
};

export const MAX_EXPERIMENTS = 3;
const MIN_VIDEOS = 8;

const quote = (text: string, locale: string) => {
  const clean = text.replace(/\s+/g, " ").trim();
  return locale === "he" ? `״${clean}״` : `“${clean}”`;
};

export function nextExperiments(derived: DashboardDerived, videos: DashboardVideo[], t: Translator): NextExperiment[] {
  const youtube = videos.filter((video) => video.platform === "youtube");
  if (youtube.length < MIN_VIDEOS) return [];

  const e = (key: string, params?: Record<string, string | number>) => t(`exp.${key}` as TextKey, params);
  const q = (text: string) => quote(text, t.locale);
  const candidates: NextExperiment[] = [];

  // 1. A personal invitation to comment drew far more comments (the owner's own finding).
  const ask = derived.cta?.standouts[0];
  if (ask && derived.cta?.noAsk && ask.multipleOfNoAsk) {
    candidates.push({
      kind: "ask_again",
      title: e("askAgainTitle"),
      why: e("askAgainWhy", {
        title: q(ask.title),
        text: q(ask.text),
        per100: ask.per100.toFixed(2),
        x: Math.round(ask.multipleOfNoAsk),
        usual: derived.cta.noAsk.medianPer100.toFixed(2),
      }),
      how: e("askAgainHow"),
      evidence: e("askAgainEvidence", { count: derived.cta.noAsk.count }),
      strength: ask.multipleOfNoAsk,
      source: ask.title,
      extra: e("askAgainExtra", { comments: ask.comments }),
    });
  }

  // 2. Make another one like the video that stood out most.
  const sized = youtube.filter((video) => (video.views ?? 0) >= SMALL_VIDEO_VIEWS);
  if (sized.length >= MIN_VIDEOS) {
    const usual = median(sized.map((video) => video.views as number));
    const best = [...sized].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0];
    if (usual > 0 && (best.views as number) / usual >= 2) {
      const format = best.analyzed && best.formatId ? formatLabel(best.formatId, t) : null;
      const x = ((best.views as number) / usual).toFixed(1);
      candidates.push({
        kind: "repeat_best",
        title: e("repeatTitle", { title: q(best.title) }),
        why: e("repeatWhy", {
          views: formatCount(best.views as number),
          x,
          usual: formatCount(usual),
          count: sized.length,
          format: format ? e("repeatFormat", { format: t.locale === "en" ? format.toLowerCase() : format }) : "",
        }),
        how: e("repeatHow"),
        evidence: e("repeatEvidence", { count: sized.length }),
        strength: (best.views as number) / usual,
        source: best.title,
        extra: e("repeatExtra", { views: formatCount(best.views as number), x }),
      });
    }
  }

  // 3. The video that won the most followers per view.
  const topGained = derived.followers?.topGained[0];
  if (topGained && derived.followers?.medianGainedPer1000) {
    candidates.push({
      kind: "win_followers",
      title: e("followersTitle", { title: q(topGained.title) }),
      why: e("followersWhy", {
        gained: topGained.gained,
        per1000: topGained.per1000.toFixed(1),
        median: derived.followers.medianGainedPer1000.toFixed(1),
      }),
      how: e("followersHow"),
      evidence: e("followersEvidence", { count: derived.followers.eligible }),
      strength: topGained.per1000 / derived.followers.medianGainedPer1000,
      source: topGained.title,
      extra: e("followersExtra", {
        gained: topGained.gained,
        per1000: topGained.per1000.toFixed(1),
        median: derived.followers.medianGainedPer1000.toFixed(1),
      }),
    });
  }

  // 4. Many videos lose people at the same second.
  const drops = derived.drops;
  if (drops && drops.count >= 3 && drops.of >= MIN_VIDEOS && drops.count / drops.of >= 0.2) {
    const second = Math.round(drops.medianAtSec);
    const time = `0:${String(second).padStart(2, "0")}`;
    candidates.push({
      kind: "early_drop",
      title: e("dropTitle", { time }),
      why: e("dropWhy", { count: drops.count, of: drops.of, time }),
      how: e("dropHow"),
      evidence: e("dropEvidence", { count: drops.count, of: drops.of }),
      strength: 1 + drops.count / drops.of,
    });
  }

  // 5. Every video goes out at the same time of day: nothing to compare yet.
  const posting = derived.posting;
  if (posting?.kind === "consistent") {
    candidates.push({
      kind: "other_time",
      title: e("timeTitle"),
      why: e("timeWhy", { count: posting.count, of: posting.of, window: windowLabel(t, posting.window) }),
      how: e("timeHow"),
      evidence: e("timeEvidence", { of: posting.of }),
      strength: 1 + posting.count / posting.of,
    });
  }

  // 6. A video watched again far more than others of its length.
  const rewatch = derived.rewatch?.standout;
  if (rewatch) {
    candidates.push({
      kind: "rewatch",
      title: e("rewatchTitle", { title: q(rewatch.title) }),
      why: e("rewatchWhy", { ratio: rewatch.startRatio.toFixed(1), usual: rewatch.usualForLength.toFixed(1) }),
      how: e("rewatchHow"),
      evidence: e("rewatchEvidence", { count: derived.rewatch?.eligible ?? 0 }),
      strength: rewatch.startRatio / rewatch.usualForLength,
      source: rewatch.title,
      extra: e("rewatchExtra", { ratio: rewatch.startRatio.toFixed(1) }),
    });
  }

  // Strongest first. A weaker suggestion about a video that already has a card is
  // folded into that card instead of taking a second one.
  const chosen: NextExperiment[] = [];
  for (const candidate of candidates.sort((a, b) => b.strength - a.strength)) {
    const same = candidate.source ? chosen.find((card) => card.source === candidate.source) : undefined;
    if (same) {
      if (candidate.extra) same.why = `${same.why} ${candidate.extra}`;
      continue;
    }
    if (chosen.length < MAX_EXPERIMENTS) chosen.push({ ...candidate });
  }
  return chosen;
}
