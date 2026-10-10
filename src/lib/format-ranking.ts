// Rating a creator's own formats against each other (doc/Insight_Engine_Spec.md
// §3.5 "Ranking formats" and §7): a format's rating is the §7 pattern with
// `format` as the feature, computed over the creator's own videos only, with
// counts. Pure functions; the page loads the rows.
import { median } from "@/lib/insight-patterns";

export type FormatVideoRow = {
  formatId: string;
  durationSec: number | null;
  avgWatchSec: number | null;
  views: number | null;
  likes: number | null;
  // "stayed to watch" estimate (engagedViews / views) and avg watch / duration, in percent.
  stayedPct: number | null;
  watchSharePct: number | null;
};

export type FormatSummary = {
  formatId: string;
  count: number;
  medianViews: number | null;
  medianLikes: number | null;
  medianStayedPct: number | null;
  medianWatchSharePct: number | null;
  medianDurationSec: number | null;
};

// §7 starting values: >= 4 videos per group, >= 12 analyzed in total, group
// medians >= 1.3x apart. A pattern that is just length must not be claimed
// (§7), so two formats whose typical lengths differ by this factor are only
// shown side by side, never explained.
export const RANK_MIN_PER_FORMAT = 4;
export const RANK_MIN_TOTAL = 12;
export const RANK_MIN_RATIO = 1.3;
export const LENGTH_CONFOUND_RATIO = 1.5;

const medianOf = (values: (number | null)[]): number | null => {
  const real = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return real.length ? median(real) : null;
};

export function summarizeFormats(rows: FormatVideoRow[]): {
  ranked: FormatSummary[];
  tooFew: { formatId: string; count: number }[];
  total: number;
} {
  const groups = new Map<string, FormatVideoRow[]>();
  for (const row of rows) {
    groups.set(row.formatId, [...(groups.get(row.formatId) ?? []), row]);
  }

  const ranked: FormatSummary[] = [];
  const tooFew: { formatId: string; count: number }[] = [];
  for (const [formatId, group] of groups) {
    if (group.length < RANK_MIN_PER_FORMAT) {
      tooFew.push({ formatId, count: group.length });
      continue;
    }
    ranked.push({
      formatId,
      count: group.length,
      medianViews: medianOf(group.map((r) => r.views)),
      medianLikes: medianOf(group.map((r) => r.likes)),
      medianStayedPct: medianOf(group.map((r) => r.stayedPct)),
      medianWatchSharePct: medianOf(group.map((r) => r.watchSharePct)),
      medianDurationSec: medianOf(group.map((r) => r.durationSec)),
    });
  }

  ranked.sort((a, b) => (b.medianViews ?? 0) - (a.medianViews ?? 0));
  tooFew.sort((a, b) => b.count - a.count);
  return { ranked, tooFew, total: rows.length };
}

// Length INSIDE one format (owner, 2026-10-07/08: formats have natural lengths --
// a song to camera can't be 10 s if the chorus is 30 s -- so Blumea never
// proposes a length from another format). Within a single format, the creator's
// own shorter half is compared with their longer half: do viewers stay longer on
// the longer videos, or do they stop at about the same point either way?
export type WithinFormatLength = {
  formatId: string;
  halfSize: number;
  shorterUpToSec: number;
  longerFromSec: number;
  shorterWatchedSec: number;
  longerWatchedSec: number;
  shorterSharePct: number;
  longerSharePct: number;
  kind: "stay_longer" | "same_stop_point" | "no_difference";
};

export const WITHIN_FORMAT_MIN = 8; // 4 in each half, the spec's per-group minimum

export function withinFormatLength(rows: FormatVideoRow[]): WithinFormatLength[] {
  const groups = new Map<string, FormatVideoRow[]>();
  for (const row of rows) {
    if (!row.durationSec || row.avgWatchSec === null) continue;
    groups.set(row.formatId, [...(groups.get(row.formatId) ?? []), row]);
  }

  const out: WithinFormatLength[] = [];
  for (const [formatId, group] of groups) {
    if (group.length < WITHIN_FORMAT_MIN) continue;
    const sorted = [...group].sort((a, b) => (a.durationSec as number) - (b.durationSec as number));
    const half = Math.floor(sorted.length / 2);
    const shorter = sorted.slice(0, half);
    const longer = sorted.slice(sorted.length - half);

    const watched = (g: FormatVideoRow[]) => median(g.map((r) => r.avgWatchSec as number));
    const share = (g: FormatVideoRow[]) => median(g.map((r) => ((r.avgWatchSec as number) / (r.durationSec as number)) * 100));
    const sW = watched(shorter);
    const lW = watched(longer);
    const sP = share(shorter);
    const lP = share(longer);

    const kind: WithinFormatLength["kind"] =
      sW > 0 && lW / sW >= RANK_MIN_RATIO ? "stay_longer" : lP > 0 && sP / lP >= RANK_MIN_RATIO ? "same_stop_point" : "no_difference";

    out.push({
      formatId,
      halfSize: half,
      shorterUpToSec: shorter[shorter.length - 1].durationSec as number,
      longerFromSec: longer[0].durationSec as number,
      shorterWatchedSec: sW,
      longerWatchedSec: lW,
      shorterSharePct: sP,
      longerSharePct: lP,
      kind,
    });
  }
  return out;
}

export type BestFormat = {
  formatId: string;
  count: number;
  restCount: number;
  metric: "views" | "likes";
  medianValue: number;
  restMedianValue: number;
  ratio: number;
  beatingRest: number; // how many of this format's videos beat the other videos' median
  lengthConfounded: boolean;
};

export const BEST_FORMAT_MIN_CONSISTENCY = 0.7;

// "Formats that work for you" (spec §7 with `format` as the feature, one format
// against all the creator's other videos): the format has >= 4 videos, the
// others have >= 4, >= 12 in total, its median is >= 1.3x the rest's on the
// first metric (views, then likes) where that holds, AND it works *regularly*
// -- at least 70% of its videos beat the rest's median. Length is flagged, not
// hidden: if the format's typical length is far from the others', the sentence
// says it may be the length (§7: not just length).
export function bestFormats(rows: FormatVideoRow[]): BestFormat[] {
  if (rows.length < RANK_MIN_TOTAL) return [];
  const groups = new Map<string, FormatVideoRow[]>();
  for (const row of rows) groups.set(row.formatId, [...(groups.get(row.formatId) ?? []), row]);

  const found: BestFormat[] = [];
  for (const [formatId, group] of groups) {
    const rest = rows.filter((r) => r.formatId !== formatId);
    if (group.length < RANK_MIN_PER_FORMAT || rest.length < RANK_MIN_PER_FORMAT) continue;

    for (const metric of ["views", "likes"] as const) {
      const pick = (r: FormatVideoRow) => (metric === "views" ? r.views : r.likes);
      const own = group.map(pick).filter((v): v is number => v !== null);
      const others = rest.map(pick).filter((v): v is number => v !== null);
      if (own.length < RANK_MIN_PER_FORMAT || others.length < RANK_MIN_PER_FORMAT) continue;
      const ownMedian = median(own);
      const restMedian = median(others);
      if (restMedian <= 0 || ownMedian / restMedian < RANK_MIN_RATIO) continue;

      const beating = own.filter((v) => v > restMedian).length;
      if (beating / own.length < BEST_FORMAT_MIN_CONSISTENCY) continue;

      const ownLength = medianOf(group.map((r) => r.durationSec));
      const restLength = medianOf(rest.map((r) => r.durationSec));
      const confounded =
        ownLength !== null &&
        restLength !== null &&
        Math.max(ownLength, restLength) / Math.max(1, Math.min(ownLength, restLength)) >= LENGTH_CONFOUND_RATIO;

      found.push({
        formatId,
        count: own.length,
        restCount: others.length,
        metric,
        medianValue: ownMedian,
        restMedianValue: restMedian,
        ratio: ownMedian / restMedian,
        beatingRest: beating,
        lengthConfounded: confounded,
      });
      break; // first qualifying metric in the spec's order leads
    }
  }
  return found.sort((a, b) => b.ratio - a.ratio);
}

export type FormatGap =
  | { kind: "not_enough" }
  | { kind: "no_gap" }
  | {
      kind: "pattern" | "length_confounded";
      metric: "views" | "likes";
      better: FormatSummary;
      worse: FormatSummary;
      ratio: number;
    };

// Spec §6.1/§7 metric order: views first, then likes. The first metric on which
// the best and the worst ranked format are >= 1.3x apart leads.
export function formatGap(ranked: FormatSummary[], total: number): FormatGap {
  if (ranked.length < 2 || total < RANK_MIN_TOTAL) return { kind: "not_enough" };

  for (const metric of ["views", "likes"] as const) {
    const key = metric === "views" ? "medianViews" : "medianLikes";
    const withMetric = ranked.filter((f) => f[key] !== null && (f[key] as number) > 0);
    if (withMetric.length < 2) continue;
    const sorted = [...withMetric].sort((a, b) => (b[key] as number) - (a[key] as number));
    const better = sorted[0];
    const worse = sorted[sorted.length - 1];
    const ratio = (better[key] as number) / (worse[key] as number);
    if (ratio < RANK_MIN_RATIO) continue;

    const durations = [better.medianDurationSec, worse.medianDurationSec];
    const confounded =
      durations[0] !== null &&
      durations[1] !== null &&
      Math.max(durations[0], durations[1]) / Math.max(1, Math.min(durations[0], durations[1])) >= LENGTH_CONFOUND_RATIO;

    return { kind: confounded ? "length_confounded" : "pattern", metric, better, worse, ratio };
  }

  return { kind: "no_gap" };
}
