import { formatTime, formatCount } from "@/lib/format";
import { CROSS_VIDEO_MIN, type DashboardDerived } from "@/lib/dashboard-data";
import { PATTERN_MIN_TOTAL } from "@/lib/insight-patterns";
import { formatLabel } from "@/lib/format-library";
import { SMALL_VIDEO_VIEWS } from "@/lib/cross-video-insights";
import type { TextKey, Translator } from "@/lib/i18n/translate";
import { videoRef } from "@/lib/video-ref";
import { platformName } from "@/lib/platform-capabilities";
import { LEVEL_BANDS } from "@/lib/creator-level";

// The cross-video insight cards for a creator who has analyzed videos. The
// Dashboard shows the first three (working / opportunity / watch); the Insights
// page shows all of them. Each says how many videos it rests on, or that there
// isn't enough, and never claims more than the counts carry. The wording lives
// in the dictionaries (cards.*), in English and Hebrew.
export type InsightCardContent = {
  tone: "working" | "opportunity" | "watch" | "fact";
  title: string;
  body: string;
  evidence: string;
};

const pct = (n: number) => `${Math.round(n)}%`;
const rate = (n: number) => n.toFixed(2);

export function windowLabel(t: Translator, window: string): string {
  return t(`library.window.${window}` as TextKey);
}

export function realInsightCards(derived: DashboardDerived, t: Translator): InsightCardContent[] {
  const cards: InsightCardContent[] = [];
  const c = (key: string, params?: Record<string, string | number>) => t(`cards.${key}` as TextKey, params);
  const views = formatCount(SMALL_VIDEO_VIEWS);
  // English reads better with the format in lower case inside a sentence.
  const fmt = (id: string) => {
    const label = formatLabel(id, t) ?? id;
    return t.locale === "en" ? label.toLowerCase() : label;
  };

  // Where the creator stands in general (not only against their own videos), and what that means for keeping or
  // improving it. One card per platform with enough videos.
  const quoteTitle = (id: string, title: string) => (t.locale === "he" ? `״${videoRef(id, title)}״` : `“${videoRef(id, title)}”`);
  for (const level of derived.levels) {
    const platform = platformName(level.platform, t);
    const median = formatCount(level.typical);
    const lines: string[] = [c(`level${level.band[0].toUpperCase()}${level.band.slice(1)}Body`, { platform, median, count: level.count, small: formatCount(LEVEL_BANDS.growing) })];
    if (level.standout) {
      lines.push(c("levelStandout", { video: quoteTitle(level.standout.id, level.standout.title), views: formatCount(level.standout.views), x: level.standout.ratio.toFixed(1).replace(/\.0$/, "") }));
    } else if (level.flat) {
      lines.push(c("levelFlat", { lo: formatCount(level.lowest), hi: formatCount(level.highest) }));
    }
    lines.push(c(level.band === "low" ? "levelAimLow" : level.band === "growing" ? "levelAimGrowing" : "levelAimKeep"));
    cards.push({
      tone: level.band === "low" ? "opportunity" : "working",
      title: c(`level${level.band[0].toUpperCase()}${level.band.slice(1)}Title`, { platform }),
      body: lines.join(" "),
      evidence: c("evidenceLevel", { count: level.count, platform }),
    });
  }

  const pattern = derived.lengthPattern;
  if (pattern) {
    const side = pattern.shortKeepsMore
      ? c("sideUpTo", { sec: pattern.cutoffSec })
      : c("sideOver", { sec: pattern.cutoffSec });
    const other = pattern.shortKeepsMore ? c("otherLonger") : c("otherShorter");
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
        title: c("lengthSharedTitle", { format: fmt(dominant.formatId) }),
        body: c("lengthSharedBody", {
          betterCount,
          side,
          domCount: dominant.count,
          format: fmt(dominant.formatId),
          betterPct,
          worseCount,
          other,
          worsePct,
        }),
        evidence: c("evidenceYoutube", { count: pattern.totalCount }),
      });
    } else {
      cards.push({
        tone: "working",
        title: pattern.shortKeepsMore ? c("lengthShortTitle") : c("lengthLongTitle"),
        body: c("lengthBody", {
          shortCount: pattern.shortCount,
          cutoff: pattern.cutoffSec,
          shortPct: pattern.shortMedianPct,
          longCount: pattern.longCount,
          longPct: pattern.longMedianPct,
        }),
        evidence: c("evidenceYoutube", { count: pattern.totalCount }),
      });
    }
  } else if (derived.typical && derived.typical.count >= PATTERN_MIN_TOTAL) {
    cards.push({
      tone: "working",
      title: c("consistentTitle"),
      body: c("consistentBody", {
        dur: Math.round(derived.typical.medianDurationSec),
        pct: Math.round(derived.typical.medianWatchSharePct),
        title: videoRef(derived.typical.best.id, derived.typical.best.title),
        bestPct: Math.round(derived.typical.best.sharePct),
      }),
      evidence: c("evidenceYoutube", { count: derived.typical.count }),
    });
  } else {
    cards.push({
      tone: "working",
      title: c("notEnoughTitle"),
      body: c("notEnoughBody", { min: PATTERN_MIN_TOTAL }),
      evidence: c("notEnoughEvidence", { count: derived.typical?.count ?? 0 }),
    });
  }

  if (derived.payoff && derived.payoff.fires >= CROSS_VIDEO_MIN) {
    cards.push({
      tone: "opportunity",
      title: c("payoffTitle"),
      body: c("payoffBody", { fires: derived.payoff.fires, of: derived.payoff.of }),
      evidence: c("payoffEvidence", { fires: derived.payoff.fires }),
    });
  } else {
    cards.push({
      tone: "opportunity",
      title: c("noFlagTitle"),
      body: c("noFlagBody", { min: CROSS_VIDEO_MIN }),
      evidence: "",
    });
  }

  if (derived.drops && derived.drops.count >= CROSS_VIDEO_MIN) {
    cards.push({
      tone: "watch",
      title: c("dropsTitle"),
      body: c("dropsBody", {
        count: derived.drops.count,
        of: derived.drops.of,
        time: formatTime(Math.round(derived.drops.medianAtSec)),
      }),
      evidence: c("dropsEvidence", { count: derived.drops.count }),
    });
  } else {
    cards.push({
      tone: "watch",
      title: c("noWatchTitle"),
      body: c("noWatchBody", { min: CROSS_VIDEO_MIN }),
      evidence: "",
    });
  }

  // ---- Insights page only: followers and posting time ----

  const leftOut = (key: "followersLeftOut" | "leftOutShort", n: number) => t.plural(`cards.${key}`, n, { views });

  const f = derived.followers;
  if (f) {
    // Card 1: how much of a video's audience already follows the creator.
    const parts: string[] = [c("followersTypical", { pct: pct(f.medianFollowerSharePct) })];
    const top = f.topFollowerShare[0];
    if (top) {
      const ratio = f.medianViews > 0 ? top.views / f.medianViews : 1;
      parts.push(
        c("followersTop", {
          title: videoRef(top.id, top.title),
          pct: pct(top.sharePct),
          views: formatCount(top.views),
          vs: ratio >= 1.3 ? c("followersViewsMore") : ratio <= 0.77 ? c("followersViewsFewer") : c("followersViewsSame"),
        })
      );
    }
    if (f.reachPattern) {
      parts.push(
        c("followersReach", {
          higherCount: f.reachPattern.higherCount,
          higher: formatCount(f.reachPattern.higherMedianViews),
          lower: formatCount(f.reachPattern.lowerMedianViews),
          lowerCount: f.reachPattern.lowerCount,
          tail: f.reachPattern.lengthSimilar ? c("followersReachSimilar") : c("followersReachDiffers"),
        })
      );
    }
    if (f.leftOutSmall > 0) parts.push(leftOut("followersLeftOut", f.leftOutSmall));
    cards.push({
      tone: "fact",
      title: c("followersTitle"),
      body: parts.join(" "),
      evidence: c("followersEvidence", { eligible: f.eligible, views }),
    });

    // Card 2: new followers (a different question, so a card of its own).
    if (f.medianGainedPer1000 !== null) {
      const g = f.topGained[0];
      const gainedParts = [c("gainedTypical", { median: f.medianGainedPer1000.toFixed(1) })];
      if (g) {
        gainedParts[0] = c("followersGained", {
          median: f.medianGainedPer1000.toFixed(1),
          title: videoRef(g.id, g.title),
          gained: g.gained,
          per1000: g.per1000.toFixed(1),
        });
      }
      cards.push({
        tone: "fact",
        title: c("gainedTitle"),
        body: gainedParts.join(" "),
        evidence: c("followersEvidence", { eligible: f.eligible, views }),
      });
    }
  }

  const ct = derived.cta;
  if (ct && ct.noAsk) {
    // Plural for a group of videos ("videos asking for an opinion"), singular for one video.
    const askPhrase = (type: string, singular: boolean) => {
      const group = singular ? "ask1" : "ask";
      const key = `library.${group}.${type}`;
      return t(`library.${group}.${t.has(key) ? type : singular ? "asking" : "withAsk"}` as TextKey);
    };
    const parts: string[] = [c("askNone", { rate: rate(ct.noAsk.medianPer100), count: ct.noAsk.count })];
    for (const g of ct.groups) {
      const ratio = ct.noAsk.medianPer100 > 0 ? g.medianPer100 / ct.noAsk.medianPer100 : null;
      parts.push(
        c("askGroup", {
          rate: rate(g.medianPer100),
          count: g.count,
          ask: askPhrase(g.type, false),
          same: ratio !== null && ratio > 0.77 && ratio < 1.3 ? c("askSame") : "",
        })
      );
    }
    for (const s of ct.standouts) {
      parts.push(
        c("askStandout", {
          title: videoRef(s.id, s.title),
          ask: askPhrase(s.type, true),
          text: s.text.replace(/\s+/g, " ").trim(),
          rate: rate(s.per100),
          comments: s.comments,
          mult: s.multipleOfNoAsk ? c("askStandoutMult", { x: Math.round(s.multipleOfNoAsk) }) : "",
        })
      );
    }
    if (ct.standouts.length > 0) parts.push(c("askStandoutNote"));
    if (ct.leftOutSmall > 0) parts.push(leftOut("leftOutShort", ct.leftOutSmall));
    cards.push({
      tone: "fact",
      title: c("askTitle"),
      body: parts.join(" "),
      evidence: c("askEvidence", { eligible: ct.eligible, views }),
    });
  }

  const r = derived.rewatch;
  if (r) {
    const parts: string[] = [
      c("rewatchTypical", {
        ratio: r.medianStartRatio.toFixed(1),
        tail: r.medianStartRatio >= 1.05 ? c("rewatchSome") : c("rewatchFew"),
      }),
    ];
    if (r.lengthSplit && Math.abs(r.lengthSplit.shorterMedian - r.lengthSplit.longerMedian) >= 0.15) {
      const shorterHigher = r.lengthSplit.shorterMedian > r.lengthSplit.longerMedian;
      parts.push(
        c("rewatchLength", {
          which: shorterHigher ? c("rewatchShorter") : c("rewatchLonger"),
          a: (shorterHigher ? r.lengthSplit.shorterMedian : r.lengthSplit.longerMedian).toFixed(1),
          b: (shorterHigher ? r.lengthSplit.longerMedian : r.lengthSplit.shorterMedian).toFixed(1),
        })
      );
    }
    if (r.standout) {
      parts.push(
        c("rewatchStandout", {
          title: videoRef(r.standout.id, r.standout.title),
          dur: Math.round(r.standout.durationSec),
          ratio: r.standout.startRatio.toFixed(1),
          usual: r.standout.usualForLength.toFixed(1),
        })
      );
    }
    if (r.leftOutSmall > 0) parts.push(leftOut("leftOutShort", r.leftOutSmall));
    cards.push({
      tone: "fact",
      title: c("rewatchTitle"),
      body: parts.join(" "),
      evidence: c("followersEvidence", { eligible: r.eligible, views }),
    });
  }

  const p = derived.posting;
  if (p?.kind === "consistent") {
    cards.push({
      tone: "fact",
      title: c("postSameTitle"),
      body: c("postSameBody", {
        count: p.count,
        of: p.of,
        window: windowLabel(t, p.window),
        hours:
          p.earliestHour === p.latestHour
            ? c("postSameAround", { h: p.earliestHour })
            : c("postSameBetween", { a: p.earliestHour, b: p.latestHour }),
      }),
      evidence: c("postSameEvidence", { count: p.of }),
    });
  } else if (p?.kind === "pattern") {
    cards.push({
      tone: "fact",
      title: c("postPatternTitle"),
      body: c("postPatternBody", {
        betterCount: p.betterCount,
        better: windowLabel(t, p.better),
        betterViews: formatCount(p.betterMedianViews),
        worseViews: formatCount(p.worseMedianViews),
        worseCount: p.worseCount,
        worse: windowLabel(t, p.worse),
      }),
      evidence: c("postSameEvidence", { count: p.betterCount + p.worseCount }),
    });
  }

  return cards;
}
