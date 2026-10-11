import { formatCount } from "@/lib/format";
import { formatLabel } from "@/lib/format-library";
import { median } from "@/lib/insight-patterns";
import { SMALL_VIDEO_VIEWS, TIME_WINDOW_LABEL } from "@/lib/cross-video-insights";
import type { DashboardDerived, DashboardVideo } from "@/lib/dashboard-data";

// "Try in your next video": what to test next, drawn from the creator's own
// numbers. Code decides what may be suggested (every candidate has a trigger
// with counts); the wording is fixed here. An experiment is always an invitation
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

const quote = (text: string) => `“${text.replace(/\s+/g, " ").trim()}”`;

export function nextExperiments(derived: DashboardDerived, videos: DashboardVideo[]): NextExperiment[] {
  const youtube = videos.filter((video) => video.platform === "youtube");
  if (youtube.length < MIN_VIDEOS) return [];

  const candidates: NextExperiment[] = [];

  // 1. A personal invitation to comment drew far more comments (the owner's own finding).
  const ask = derived.cta?.standouts[0];
  if (ask && derived.cta?.noAsk && ask.multipleOfNoAsk) {
    candidates.push({
      kind: "ask_again",
      title: "Invite a comment with a personal promise again",
      why: `${quote(ask.title)} asked for comments and promised something back (${quote(ask.text)}). It got ${ask.per100.toFixed(2)} comments per 100 views, about ${Math.round(ask.multipleOfNoAsk)}× the ${derived.cta.noAsk.medianPer100.toFixed(2)} of your videos that ask nothing. One video, not a pattern.`,
      how: "Look at comments per 100 views after a few days, and compare with that video and with your usual.",
      evidence: `1 video, against ${derived.cta.noAsk.count} that ask nothing`,
      strength: ask.multipleOfNoAsk,
      source: ask.title,
      extra: `It also drew ${ask.comments} comments.`,
    });
  }

  // 2. Make another one like the video that stood out most.
  const sized = youtube.filter((video) => (video.views ?? 0) >= SMALL_VIDEO_VIEWS);
  if (sized.length >= MIN_VIDEOS) {
    const usual = median(sized.map((video) => video.views as number));
    const best = [...sized].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0];
    if (usual > 0 && (best.views as number) / usual >= 2) {
      const format = best.analyzed && best.formatId ? formatLabel(best.formatId) : null;
      candidates.push({
        kind: "repeat_best",
        title: `Make another video like ${quote(best.title)}`,
        why: `It is your most-viewed: ${formatCount(best.views as number)} views, ${((best.views as number) / usual).toFixed(1)}× the usual ${formatCount(usual)} across your ${sized.length} videos with 1K+ views${format ? `. It is a ${format.toLowerCase()} video` : ""}. A second one shows whether it was the idea or a lucky post.`,
        how: "Compare its views after a few days with the usual, and with that video.",
        evidence: `${sized.length} videos with 1K+ views`,
        strength: (best.views as number) / usual,
        source: best.title,
        extra: `It is also your most-viewed: ${formatCount(best.views as number)} views, ${((best.views as number) / usual).toFixed(1)}× your usual.`,
      });
    }
  }

  // 3. The video that won the most followers per view.
  const topGained = derived.followers?.topGained[0];
  if (topGained && derived.followers?.medianGainedPer1000) {
    candidates.push({
      kind: "win_followers",
      title: `Try a video in the style of ${quote(topGained.title)}`,
      why: `It won ${topGained.gained} new followers, ${topGained.per1000.toFixed(1)} per 1,000 views, while a typical video of yours wins about ${derived.followers.medianGainedPer1000.toFixed(1)}.`,
      how: "Look at new followers per 1,000 views after a few days.",
      evidence: `${derived.followers.eligible} videos with 1K+ views`,
      strength: topGained.per1000 / derived.followers.medianGainedPer1000,
      source: topGained.title,
      extra: `It also won ${topGained.gained} new followers, ${topGained.per1000.toFixed(1)} per 1,000 views, against about ${derived.followers.medianGainedPer1000.toFixed(1)} for a typical video.`,
    });
  }

  // 4. Many videos lose people at the same second.
  const drops = derived.drops;
  if (drops && drops.count >= 3 && drops.of >= MIN_VIDEOS && drops.count / drops.of >= 0.2) {
    const second = Math.round(drops.medianAtSec);
    candidates.push({
      kind: "early_drop",
      title: `Change something just before 0:${String(second).padStart(2, "0")}`,
      why: `In ${drops.count} of your ${drops.of} videos with retention data, the single biggest drop (8+ points at once) comes around 0:${String(second).padStart(2, "0")}. Blumea can't tell what causes it.`,
      how: "Watch the retention curve of the new video around that second.",
      evidence: `${drops.count} of ${drops.of} videos`,
      strength: 1 + drops.count / drops.of,
    });
  }

  // 5. Every video goes out at the same time of day: nothing to compare yet.
  const posting = derived.posting;
  if (posting?.kind === "consistent") {
    candidates.push({
      kind: "other_time",
      title: "Post one video at a different time",
      why: `${posting.count} of your ${posting.of} videos went out ${TIME_WINDOW_LABEL[posting.window]}. With no variation, Blumea can't say whether another time would work better for you.`,
      how: "Compare the new video's views after three days with your usual, remembering it is one video.",
      evidence: `${posting.of} videos, all at about the same time`,
      strength: 1 + posting.count / posting.of,
    });
  }

  // 6. A video watched again far more than others of its length.
  const rewatch = derived.rewatch?.standout;
  if (rewatch) {
    candidates.push({
      kind: "rewatch",
      title: `Find what made ${quote(rewatch.title)} get rewatched`,
      why: `Its start was watched ${rewatch.startRatio.toFixed(1)} times per view, while your other videos of a similar length get about ${rewatch.usualForLength.toFixed(1)}. Watch it again and note what is different, then try that in your next video.`,
      how: "Look at rewatches (how often the start is watched per view) of the new video.",
      evidence: `${derived.rewatch?.eligible ?? 0} videos with 1K+ views`,
      strength: rewatch.startRatio / rewatch.usualForLength,
      source: rewatch.title,
      extra: `It was also rewatched more than your other videos of its length (${rewatch.startRatio.toFixed(1)} starts per view).`,
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
