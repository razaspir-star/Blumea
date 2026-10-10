import { formatTime, formatCount } from "@/lib/format";
import { CROSS_VIDEO_MIN, type DashboardDerived } from "@/lib/dashboard-data";
import { PATTERN_MIN_TOTAL } from "@/lib/insight-patterns";
import { formatLabel } from "@/lib/format-library";
import { SMALL_VIDEO_VIEWS, TIME_WINDOW_LABEL } from "@/lib/cross-video-insights";

// The cross-video insight cards for a creator who has analyzed videos. The
// Dashboard shows the first three (working / opportunity / watch); the Insights
// page shows all of them. Each says how many videos it rests on, or that there
// isn't enough, and never claims more than the counts carry.
export type InsightCardContent = {
  tone: "working" | "opportunity" | "watch" | "fact";
  title: string;
  body: string;
  evidence: string;
};

const fmt = (id: string) => formatLabel(id) ?? id;
const pct = (n: number) => `${Math.round(n)}%`;

export function realInsightCards(derived: DashboardDerived): InsightCardContent[] {
  const cards: InsightCardContent[] = [];

  const pattern = derived.lengthPattern;
  if (pattern) {
    const sideName = pattern.shortKeepsMore ? `up to ${pattern.cutoffSec} sec` : `over ${pattern.cutoffSec} sec`;
    const otherName = pattern.shortKeepsMore ? "longer" : "shorter";
    const betterCount = pattern.shortKeepsMore ? pattern.shortCount : pattern.longCount;
    const worseCount = pattern.shortKeepsMore ? pattern.longCount : pattern.shortCount;
    const betterPct = pattern.shortKeepsMore ? pattern.shortMedianPct : pattern.longMedianPct;
    const worsePct = pattern.shortKeepsMore ? pattern.longMedianPct : pattern.shortMedianPct;
    const dominant = pattern.betterDominant;
    const sharedFormat = dominant && dominant.formatId !== pattern.worseDominant?.formatId;

    if (sharedFormat && dominant) {
      // The owner's point (2026-10-07): say what the group has in common -- here a
      // format -- instead of crediting the length alone.
      cards.push({
        tone: "working",
        title: `Your ${fmt(dominant.formatId).toLowerCase()} videos hold viewers better.`,
        body: `In your ${betterCount} videos ${sideName} — ${dominant.count} of them ${fmt(dominant.formatId).toLowerCase()} — viewers watched a median ${betterPct}% of the video. In your ${worseCount} ${otherName} ones, ${worsePct}%. Length and format go together in your videos, so Blumea can't tell which one it is.`,
        evidence: `Based on ${pattern.totalCount} YouTube videos`,
      });
    } else {
      cards.push({
        tone: "working",
        title: pattern.shortKeepsMore ? "Your shorter videos hold viewers better." : "Your longer videos hold viewers better.",
        body: `In your ${pattern.shortCount} videos up to ${pattern.cutoffSec} sec, viewers watched a median ${pattern.shortMedianPct}% of the video. In your ${pattern.longCount} longer ones, ${pattern.longMedianPct}%. A pattern in your videos — it doesn't prove length is the reason.`,
        evidence: `Based on ${pattern.totalCount} YouTube videos`,
      });
    }
  } else if (derived.typical && derived.typical.count >= PATTERN_MIN_TOTAL) {
    cards.push({
      tone: "working",
      title: "Your videos are consistent.",
      body: `A typical video of yours runs about ${Math.round(derived.typical.medianDurationSec)} sec and viewers watch about ${Math.round(derived.typical.medianWatchSharePct)}% of it. Shorter and longer ones don't differ clearly yet — a normal answer, not a missing one. Best at holding viewers: “${derived.typical.best.title}” (${Math.round(derived.typical.best.sharePct)}%).`,
      evidence: `Based on ${derived.typical.count} YouTube videos`,
    });
  } else {
    cards.push({
      tone: "working",
      title: "Not enough videos yet.",
      body: `Blumea compares your videos with each other once ${PATTERN_MIN_TOTAL} are analyzed — any mix of lengths is fine, and a consistent style is not a problem.`,
      evidence: `${derived.typical?.count ?? 0} analyzed with watch data so far`,
    });
  }

  if (derived.payoff && derived.payoff.fires >= CROSS_VIDEO_MIN) {
    cards.push({
      tone: "opportunity",
      title: "The payoff often comes after viewers have left.",
      body: `In ${derived.payoff.fires} of your ${derived.payoff.of} videos with watch data, the key moment arrives after the average viewer has already stopped watching. Worth testing showing it earlier.`,
      evidence: `Seen in ${derived.payoff.fires} analyzed videos`,
    });
  } else {
    cards.push({
      tone: "opportunity",
      title: "Nothing to flag here yet.",
      body: `Blumea calls out a pattern in your key moments only when at least ${CROSS_VIDEO_MIN} of your videos show it. Staying quiet is a normal answer.`,
      evidence: "",
    });
  }

  if (derived.drops && derived.drops.count >= CROSS_VIDEO_MIN) {
    cards.push({
      tone: "watch",
      title: "There's often a sharp drop early on.",
      body: `In ${derived.drops.count} of your ${derived.drops.of} videos with retention data, the single biggest drop (8+ points at once) comes around ${formatTime(Math.round(derived.drops.medianAtSec))}.`,
      evidence: `Seen in ${derived.drops.count} videos`,
    });
  } else {
    cards.push({
      tone: "watch",
      title: "Nothing to watch out for yet.",
      body: `No sharp drop shows up in at least ${CROSS_VIDEO_MIN} of your videos. Blumea stays quiet rather than invent a concern.`,
      evidence: "",
    });
  }

  // ---- Insights page only: followers and posting time ----

  const f = derived.followers;
  if (f) {
    const parts: string[] = [
      `In a typical video about ${pct(f.medianFollowerSharePct)} of the views come from people who already follow you — normal on a platform where most viewing is scrolling the feed.`,
    ];
    const top = f.topFollowerShare[0];
    if (top) {
      parts.push(
        `The video your followers carried most: “${top.title}” (${pct(top.sharePct)} of its views${
          top.viewsFromFollowersPer100Followers !== null ? `, about ${Math.round(top.viewsFromFollowersPer100Followers)} views from followers per 100 followers` : ""
        }).`
      );
    }
    if (f.reachPattern) {
      parts.push(
        `Your ${f.reachPattern.higherCount} videos with more followers watching got a median ${formatCount(f.reachPattern.higherMedianViews)} views vs ${formatCount(f.reachPattern.lowerMedianViews)} for the other ${f.reachPattern.lowerCount}${
          f.reachPattern.lengthSimilar ? ", at a similar length" : " — but their lengths differ a lot, so it may be the length"
        }. A pattern in your videos; it doesn't prove followers are the reason.`
      );
    }
    if (f.medianGainedPer1000 !== null && f.topGained.length > 0) {
      const g = f.topGained[0];
      parts.push(
        `New followers per 1,000 views: about ${f.medianGainedPer1000.toFixed(1)} in a typical video; “${g.title}” won ${g.gained} (${g.per1000.toFixed(1)} per 1,000 views).`
      );
    }
    if (f.leftOutSmall > 0) {
      parts.push(
        `${f.leftOutSmall} ${f.leftOutSmall === 1 ? "video" : "videos"} under ${formatCount(SMALL_VIDEO_VIEWS)} views ${
          f.leftOutSmall === 1 ? "is" : "are"
        } left out: a few followers can be most of a small audience, which says little about how well they were kept.`
      );
    }
    cards.push({
      tone: "fact",
      title: "Follower retention",
      body: parts.join(" "),
      evidence: `Based on ${f.eligible} videos with ${formatCount(SMALL_VIDEO_VIEWS)}+ views`,
    });
  }

  const c = derived.cta;
  if (c && c.noAsk) {
    const CTA_LABEL: Record<string, string> = {
      comment_question: "asking for an opinion",
      comment_invite: "inviting a comment with a personal promise",
      follow: "asking to follow",
      like_or_share: "asking to like or share",
      tag_friend: "asking to tag someone",
      link_or_buy: "pointing to a link",
      other: "another kind of ask",
    };
    const rate = (n: number) => n.toFixed(2);
    const parts: string[] = [
      `Comments per 100 views: ${rate(c.noAsk.medianPer100)} in your ${c.noAsk.count} videos that ask nothing.`,
    ];
    for (const g of c.groups) {
      const ratio = c.noAsk.medianPer100 > 0 ? g.medianPer100 / c.noAsk.medianPer100 : null;
      parts.push(
        `${rate(g.medianPer100)} in your ${g.count} videos ${CTA_LABEL[g.type] ?? "with an ask"}${ratio !== null && ratio > 0.77 && ratio < 1.3 ? " — about the same" : ""}.`
      );
    }
    for (const s of c.standouts) {
      parts.push(
        `One video, “${s.title}”, was ${CTA_LABEL[s.type] ?? "asking"} (“${s.text.replace(/\s+/g, " ").trim()}”) and got ${rate(s.per100)} (${s.comments} comments)${
          s.multipleOfNoAsk ? ` — about ${Math.round(s.multipleOfNoAsk)}× the videos that ask nothing` : ""
        }.`
      );
    }
    if (c.standouts.length > 0) {
      parts.push("Each of those is one video, not a pattern. Worth trying the same kind of ask again and seeing whether the comments repeat.");
    }
    if (c.leftOutSmall > 0) {
      parts.push(`${c.leftOutSmall} ${c.leftOutSmall === 1 ? "video" : "videos"} under ${formatCount(SMALL_VIDEO_VIEWS)} views left out.`);
    }
    cards.push({
      tone: "fact",
      title: "What your videos ask viewers to do",
      body: parts.join(" "),
      evidence: `Based on ${c.eligible} videos with ${formatCount(SMALL_VIDEO_VIEWS)}+ views; asks are read by AI from the video`,
    });
  }

  const r = derived.rewatch;
  if (r) {
    const parts: string[] = [
      `In a typical video, YouTube's data shows the start being watched about ${r.medianStartRatio.toFixed(1)} times per view${
        r.medianStartRatio >= 1.05 ? ", so some people watch again" : ", so few people watch again"
      }.`,
    ];
    if (r.lengthSplit && Math.abs(r.lengthSplit.shorterMedian - r.lengthSplit.longerMedian) >= 0.15) {
      const shorterHigher = r.lengthSplit.shorterMedian > r.lengthSplit.longerMedian;
      parts.push(
        `Your ${shorterHigher ? "shorter" : "longer"} videos are watched again more (${(shorterHigher ? r.lengthSplit.shorterMedian : r.lengthSplit.longerMedian).toFixed(1)} vs ${(shorterHigher ? r.lengthSplit.longerMedian : r.lengthSplit.shorterMedian).toFixed(1)}).`
      );
    }
    if (r.standout) {
      parts.push(
        `“${r.standout.title}” (${Math.round(r.standout.durationSec)} sec) stands out: ${r.standout.startRatio.toFixed(1)} per view, while your other videos of similar length get about ${r.standout.usualForLength.toFixed(1)}. Worth watching it again to see what is different — Blumea can't tell from the numbers whether it is the ending, the song or something else.`
      );
    }
    if (r.leftOutSmall > 0) {
      parts.push(`${r.leftOutSmall} ${r.leftOutSmall === 1 ? "video" : "videos"} under ${formatCount(SMALL_VIDEO_VIEWS)} views left out.`);
    }
    cards.push({
      tone: "fact",
      title: "Rewatches",
      body: parts.join(" "),
      evidence: `Based on ${r.eligible} videos with ${formatCount(SMALL_VIDEO_VIEWS)}+ views`,
    });
  }

  const p = derived.posting;
  if (p?.kind === "consistent") {
    cards.push({
      tone: "fact",
      title: "You post at the same time.",
      body: `${p.count} of your ${p.of} videos went out ${TIME_WINDOW_LABEL[p.window]}${p.earliestHour === p.latestHour ? ` (around ${p.earliestHour}:00)` : `, between ${p.earliestHour}:00 and ${p.latestHour}:59`}. With no variation there is nothing to compare, so Blumea can't say whether another time would work better for you. Worth testing a different time once.`,
      evidence: `Based on ${p.of} videos`,
    });
  } else if (p?.kind === "pattern") {
    cards.push({
      tone: "fact",
      title: "When you post may matter.",
      body: `Your ${p.betterCount} videos posted ${TIME_WINDOW_LABEL[p.better]} got a median ${formatCount(p.betterMedianViews)} views vs ${formatCount(p.worseMedianViews)} for your ${p.worseCount} posted ${TIME_WINDOW_LABEL[p.worse]}. A pattern in your videos; it doesn't prove the time is the reason.`,
      evidence: `Based on ${p.betterCount + p.worseCount} videos`,
    });
  }

  return cards;
}
