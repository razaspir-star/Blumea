// First real rule from doc/Insight_Engine_Spec.md §5.1: "the payoff comes
// after most viewers have gone". Pure, deterministic, no AI call -- the AI
// already read key_moments once (tier 1, gemini-analysis.ts); this just
// compares stored numbers. Code decides whether the rule fires; the caller
// only phrases the result (§1: "code decides what may be said; language only
// phrases it").
//
// Allowed from video one (principle 9, §2): the statement never claims a
// direction ("this helps"), only that the gap is real and worth testing.

import { textIsNormFor } from "@/lib/format-library";

export type KeyMoment ={ at_seconds: number; type: string; what_happens: string };

export type PayoffAfterAvgWatchInsight = {
  payoffAtSec: number;
  payoffWhatHappens: string;
  avgWatchSec: number;
  durationSec: number;
  suggestedEarlierBySec: number;
};

// Spec thresholds (§5.1, "numbers are proposals", decided 2026-09-27 to start
// with the stated values): payoff_vs_avg_watch >= 2s AND watch_share < 0.8.
export function payoffAfterAvgWatchRule(input: {
  durationSec: number | null;
  avgWatchSec: number | null;
  keyMoments: KeyMoment[] | null;
}): PayoffAfterAvgWatchInsight | null {
  const { durationSec, avgWatchSec, keyMoments } = input;
  if (!durationSec || avgWatchSec === null || !keyMoments || keyMoments.length === 0) return null;

  // "timestamp of the reveal/peak moment (the payoff)" (§3.3) -- prefer an
  // explicit reveal, fall back to peak. No reveal/peak read from this video
  // means no payoff evidence to anchor on, so the rule stays silent rather
  // than guessing which moment counts (principle 4).
  const payoff =
    keyMoments.find((m) => m.type === "reveal") ?? keyMoments.find((m) => m.type === "peak");
  if (!payoff) return null;

  const payoffVsAvgWatch = payoff.at_seconds - avgWatchSec;
  const watchShare = avgWatchSec / durationSec;

  if (payoffVsAvgWatch < 2 || watchShare >= 0.8) return null;

  return {
    payoffAtSec: payoff.at_seconds,
    payoffWhatHappens: payoff.what_happens,
    avgWatchSec,
    durationSec,
    // N = round(payoff_vs_avg_watch), capped at half of payoff_time (§5.1).
    suggestedEarlierBySec: Math.min(Math.round(payoffVsAvgWatch), Math.round(payoff.at_seconds / 2)),
  };
}

export type RetentionPoint = { elapsedRatio: number; watchRatio: number };

export type BiggestDropInsight = {
  atSec: number;
  dropPercentagePoints: number;
  // A key moment within ~2s of the drop (§3.2's own timestamp tolerance) --
  // null when nothing read from the video lines up close enough to name
  // "what happens there" honestly.
  nearbyMoment: KeyMoment | null;
};

// §5.1 L1/IMPROVE "the biggest drop" -- YouTube owner only, needs the
// retention curve. Trigger: the largest single-step fall is >= 8 percentage
// points. No baseline needed, so allowed from video one like the payoff rule.
export function biggestDropRule(input: {
  durationSec: number | null;
  retentionCurve: RetentionPoint[] | null;
  keyMoments: KeyMoment[] | null;
}): BiggestDropInsight | null {
  const { durationSec, retentionCurve, keyMoments } = input;
  if (!durationSec || !retentionCurve || retentionCurve.length < 2) return null;

  let worst = { at: -1, fall: 0 };
  for (let i = 1; i < retentionCurve.length; i += 1) {
    const fall = retentionCurve[i - 1].watchRatio - retentionCurve[i].watchRatio;
    if (fall > worst.fall) worst = { at: retentionCurve[i].elapsedRatio, fall };
  }

  if (worst.at < 0 || worst.fall < 0.08) return null;

  const atSec = Math.round(worst.at * durationSec);
  const nearbyMoment = keyMoments?.find((m) => Math.abs(m.at_seconds - atSec) <= 2) ?? null;

  return {
    atSec,
    dropPercentagePoints: Math.round(worst.fall * 100),
    nearbyMoment,
  };
}

export type OnScreenText = { text: string; role: string };

// "Stayed to watch" estimate = engagedViews / views, in percent. YouTube Studio
// shows an exact figure with a denominator the API doesn't expose, so ours runs
// a couple of points off -- always shown as an estimate (see youtube-data.ts).
export function stayedToWatchPct(engagement: { views: number; engagedViews: number } | null | undefined): number | null {
  if (!engagement || engagement.views <= 0) return null;
  return (engagement.engagedViews / engagement.views) * 100;
}

// §4: baseline = the creator's median on the same platform, minimum 10 videos;
// below that no comparative statement is made (§8).
export const BASELINE_MIN_VIDEOS = 10;
// §5.1 opening rules: 10 percentage points from the baseline (decided
// 2026-09-27 to start with the stated values).
export const OPENING_MARGIN_POINTS = 10;

// scopeFormatId is set when the baseline is a same-format cohort (see
// baseline.ts); absent means the whole channel.
export type OpeningBaseline = { medianStayedPct: number; count: number; scopeFormatId?: string };

export type WeakOpeningInsight = {
  stayedPct: number;
  baselineMedianPct: number;
  baselineCount: number;
};

// §5.1 L1/IMPROVE "the opening": noticeably fewer viewers than usual stayed
// past the first frame AND the opening has no on-screen text.
// Deliberately NOT triggered by a missing spoken/sung line (the spec's
// original "text false OR spoken_or_sung false"): owner decision 2026-10-03 --
// many successful videos are a song as the sound plus a text line, and talking
// to camera doesn't fit that format, so its absence is never a flaw to flag.
export function weakOpeningRule(input: {
  stayedPct: number | null;
  baseline: OpeningBaseline | null;
  onScreenTexts: OnScreenText[] | null;
  formatId: string | null;
  layoutId: string | null;
}): WeakOpeningInsight | null {
  const { stayedPct, baseline, onScreenTexts, formatId, layoutId } = input;
  // Same format gate as the other text rules: "no text" is only worth raising
  // where text is a norm of the format.
  if (!textIsNormFor(formatId, layoutId)) return null;
  if (stayedPct === null || !baseline || baseline.count < BASELINE_MIN_VIDEOS) return null;
  if (stayedPct > baseline.medianStayedPct - OPENING_MARGIN_POINTS) return null;
  if (!onScreenTexts) return null;
  if (onScreenTexts.some((t) => t.role !== "scene")) return null;

  return { stayedPct, baselineMedianPct: baseline.medianStayedPct, baselineCount: baseline.count };
}

export type CommentBaseline = { medianPer100Views: number; count: number };

export type CommentOutlierInsight = {
  comments: number;
  per100Views: number;
  usualPer100Views: number;
  multiple: number;
  quote: string | null;
};

// A video that drew far more comments than the creator's usual -- the owner's
// example (2026-10-09): the one video whose caption directly invited a personal
// reply got ~8x the usual comments, while generic questions did not move it.
// Needs a baseline of >= 10 other videos, enough views and enough comments for
// the rate to mean something (spec §4: small numbers are noisy).
export const COMMENT_OUTLIER_MULTIPLE = 3;
export const COMMENT_MIN_VIEWS = 1000;
export const COMMENT_MIN_COMMENTS = 5;

export function commentOutlierRule(input: {
  views: number | null;
  comments: number | null;
  baseline: CommentBaseline | null;
  onScreenTexts: OnScreenText[] | null;
}): CommentOutlierInsight | null {
  const { views, comments, baseline, onScreenTexts } = input;
  if (!views || comments === null || !baseline || baseline.count < BASELINE_MIN_VIDEOS) return null;
  if (views < COMMENT_MIN_VIEWS || comments < COMMENT_MIN_COMMENTS) return null;

  const per100 = (comments / views) * 100;
  const usual = baseline.medianPer100Views;
  if (usual <= 0 || per100 < usual * COMMENT_OUTLIER_MULTIPLE) return null;

  const quote = onScreenTexts?.find((t) => t.role !== "scene")?.text?.replace(/\s+/g, " ").trim() ?? null;
  return { comments, per100Views: per100, usualPer100Views: usual, multiple: per100 / usual, quote };
}

export type StrongHookInsight = {
  stayedPct: number;
  baselineMedianPct: number;
  baselineCount: number;
  quote: string;
};

// §5.1 KEEP "the hook held": a hook was read from the video AND the opening
// metric beats the creator's usual by the same margin. The quote is shown as
// read by the AI (tier 2 wording, §3.2) -- the caller labels it as such.
export function strongHookRule(input: {
  stayedPct: number | null;
  baseline: OpeningBaseline | null;
  onScreenTexts: OnScreenText[] | null;
  spokenHookText: string | null;
  sungHookLyrics: string | null;
}): StrongHookInsight | null {
  const { stayedPct, baseline, onScreenTexts, spokenHookText, sungHookLyrics } = input;
  if (stayedPct === null || !baseline || baseline.count < BASELINE_MIN_VIDEOS) return null;
  if (stayedPct < baseline.medianStayedPct + OPENING_MARGIN_POINTS) return null;

  const firstText = onScreenTexts?.find((t) => t.role !== "scene")?.text ?? null;
  const quote = (spokenHookText || sungHookLyrics || firstText)?.replace(/\s+/g, " ").trim();
  if (!quote) return null;

  return { stayedPct, baselineMedianPct: baseline.medianStayedPct, baselineCount: baseline.count, quote };
}

// "kind" lets the screen show the sentence in the creator's language; "text" stays the English default.
export type ExperimentInsight = { kind: "no_text_first3s" | "no_captions_speech"; text: string };

// §5.2 experiment library, row 1: "no overlay text in the first 3 s". The AI
// only ever returns on_screen_texts for roughly the first 3 seconds
// (gemini-analysis.ts's prompt), so an empty list (after excluding "scene"
// text, which §3.2 says is never a hook) already means exactly this.
// Fires only where text is a normal part of the video's format (format
// library, §3.5) -- e.g. never on a silent cooking video that works on natural
// sound. Unknown format: silent.
export function noTextInFirst3sExperiment(
  onScreenTexts: OnScreenText[] | null,
  formatId: string | null,
  layoutId: string | null
): ExperimentInsight | null {
  if (!textIsNormFor(formatId, layoutId)) return null;
  if (!onScreenTexts) return null;
  const hasHookText = onScreenTexts.some((t) => t.role !== "scene");
  if (hasHookText) return null;
  return { kind: "no_text_first3s", text: "No text on screen in your first 3 seconds. Worth testing a short one." };
}

// §5.2 experiment library, row 5: "no subtitles and speech in the first 3 s".
export function noCaptionsOnSpeechExperiment(input: {
  subtitlesDetected: boolean | null;
  spokenHookText: string | null;
  formatId: string | null;
  layoutId: string | null;
}): ExperimentInsight | null {
  const { subtitlesDetected, spokenHookText, formatId, layoutId } = input;
  if (!textIsNormFor(formatId, layoutId)) return null;
  if (subtitlesDetected === null || subtitlesDetected) return null;
  if (!spokenHookText) return null;
  return { kind: "no_captions_speech", text: "No captions during your opening speech. Worth testing adding them." };
}
