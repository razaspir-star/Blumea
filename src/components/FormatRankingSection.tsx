"use client";

import { Layers } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCount } from "@/lib/format";
import { formatLabel } from "@/lib/format-library";
import { stayedToWatchPct } from "@/lib/insight-rules";
import { useT } from "@/lib/i18n/client";
import { platformName } from "@/lib/platform-capabilities";
import {
  bestFormats,
  withinFormatLength,
  formatGap,
  summarizeFormats,
  RANK_MIN_PER_FORMAT,
  RANK_MIN_TOTAL,
  type FormatVideoRow,
} from "@/lib/format-ranking";

// REAL (not mock): how the creator's own videos on one platform compare by format
// (Insight_Engine_Spec.md §3.5 "Ranking formats"). Medians with counts, never a
// "best format" verdict the data cannot carry.
export async function loadFormatRows(platform: string): Promise<FormatVideoRow[]> {
  const { data: videos } = await supabase
    .from("videos")
    .select("id, duration_sec")
    .eq("platform", platform);
  if (!videos || videos.length === 0) return [];
  const ids = videos.map((video) => video.id);

  const [{ data: snapshots }, { data: profiles }] = await Promise.all([
    supabase
      .from("video_metric_snapshots")
      .select("video_id, views, likes, avg_watch_sec, breakdowns, captured_at")
      .in("video_id", ids)
      .order("captured_at", { ascending: false }),
    supabase.from("video_ai_profiles").select("video_id, fields").in("video_id", ids).eq("is_current", true),
  ]);

  const latest = new Map<string, NonNullable<typeof snapshots>[number]>();
  for (const snapshot of snapshots ?? []) if (!latest.has(snapshot.video_id)) latest.set(snapshot.video_id, snapshot);

  const built: FormatVideoRow[] = [];
  for (const video of videos) {
    const fields = profiles?.find((profile) => profile.video_id === video.id)?.fields as
      | Record<string, { value?: unknown }>
      | undefined;
    const formatId = fields?.format?.value;
    const snapshot = latest.get(video.id);
    if (typeof formatId !== "string" || !snapshot) continue;

    const duration = video.duration_sec as number | null;
    const engagement = (snapshot.breakdowns as { engagement?: { views: number; engagedViews: number } } | null)?.engagement;
    built.push({
      formatId,
      durationSec: duration,
      avgWatchSec: snapshot.avg_watch_sec !== null ? Number(snapshot.avg_watch_sec) : null,
      views: snapshot.views ?? null,
      likes: snapshot.likes ?? null,
      stayedPct: stayedToWatchPct(engagement),
      watchSharePct: snapshot.avg_watch_sec !== null && duration ? (Number(snapshot.avg_watch_sec) / duration) * 100 : null,
    });
  }
  return built;
}

const pct = (value: number | null) => (value === null ? "—" : `${Math.round(value)}%`);
const count = (value: number | null) => (value === null ? "—" : formatCount(Math.round(value)));
export default function FormatRankingSection({ platform, rows }: { platform: string; rows: FormatVideoRow[] }) {
  const t = useT();
  const platformLabel = platformName(platform, t);
  const secs = (value: number | null) => (value === null ? "—" : t("formats.seconds", { n: Math.round(value) }));
  if (rows.length === 0) return null;

  const { ranked, tooFew, total } = summarizeFormats(rows);
  const hasStayed = ranked.some((format) => format.medianStayedPct !== null);
  const hasWatched = ranked.some((format) => format.medianWatchSharePct !== null);
  const gap = formatGap(ranked, total);
  const best = bestFormats(rows);
  const withinLength = withinFormatLength(rows);
  const name = (id: string) => formatLabel(id, t) ?? id;
  const metricName = (metric: "views" | "likes") => (metric === "views" ? t("formats.metricViews") : t("formats.metricLikes"));

  return (
    <section className="mt-8 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <Layers size={18} strokeWidth={1.8} className="text-blumea-blue" />
        <p className="text-sm font-semibold text-blumea-navy">{t("formats.title", { platform: platformLabel })}</p>
      </div>

      <p className="mt-1 text-sm text-blumea-slate">
        {t("formats.intro")}
      </p>

      {ranked.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-start text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-blumea-slate">
                <th className="py-2 pe-3 text-start font-semibold">{t("formats.colFormat")}</th>
                <th className="px-3 py-2 text-start font-semibold">{t("formats.colVideos")}</th>
                <th className="px-3 py-2 text-start font-semibold">{t("formats.colViews")}</th>
                <th className="px-3 py-2 text-start font-semibold">{t("formats.colLikes")}</th>
                {hasStayed && <th className="px-3 py-2 text-start font-semibold" title={t("formats.colStayedTitle")}>{t("formats.colStayed")}</th>}
                {hasWatched && <th className="px-3 py-2 text-start font-semibold">{t("formats.colWatched")}</th>}
                <th className="py-2 ps-3 text-start font-semibold">{t("formats.colLength")}</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((format) => (
                <tr key={format.formatId} className="border-t border-slate-100 text-blumea-navy">
                  <td className="py-3 pe-3 font-medium">{name(format.formatId)}</td>
                  <td className="px-3 py-3">
                    {format.count} <span className="text-xs text-blumea-slate">({Math.round((format.count / total) * 100)}%)</span>
                  </td>
                  <td className="px-3 py-3">{count(format.medianViews)}</td>
                  <td className="px-3 py-3">{count(format.medianLikes)}</td>
                  {hasStayed && <td className="px-3 py-3">{pct(format.medianStayedPct)}</td>}
                  {hasWatched && <td className="px-3 py-3">{pct(format.medianWatchSharePct)}</td>}
                  <td className="py-3 ps-3">{secs(format.medianDurationSec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-blumea-slate">
          {t("formats.none", { min: RANK_MIN_PER_FORMAT })}
        </p>
      )}

      {best.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-blumea-navy">{t("formats.bestTitle")}</p>
          {best.map((format) => (
            <div key={format.formatId} className="rounded-2xl border border-blumea-blue/25 bg-white p-4">
              <p className="text-sm leading-6 text-blumea-navy">
                {t("formats.bestBody", {
                  format: name(format.formatId),
                  median: count(format.medianValue),
                  metric: metricName(format.metric),
                  rest: count(format.restMedianValue),
                  beating: format.beatingRest,
                  count: format.count,
                })}{" "}
                <span className="font-medium">{t("formats.bestKeep")}</span>
                {format.lengthConfounded && ` ${t("formats.bestConfounded")}`}
              </p>
              <p className="mt-2 text-xs text-blumea-slate">
                {t("formats.bestNote", { count: format.count + format.restCount })}
              </p>
            </div>
          ))}
        </div>
      )}

      {gap.kind === "pattern" && (
        <p className="mt-4 text-sm leading-6 text-blumea-navy">
          {t("formats.gapPattern", {
            better: name(gap.better.formatId),
            worse: name(gap.worse.formatId),
            metric: metricName(gap.metric),
            a: count(gap.metric === "views" ? gap.better.medianViews : gap.better.medianLikes),
            b: count(gap.metric === "views" ? gap.worse.medianViews : gap.worse.medianLikes),
            ac: gap.better.count,
            bc: gap.worse.count,
          })}
        </p>
      )}

      {gap.kind === "length_confounded" && (
        <p className="mt-4 text-sm leading-6 text-blumea-navy">
          {t("formats.gapConfounded", {
            better: name(gap.better.formatId),
            worse: name(gap.worse.formatId),
            metric: metricName(gap.metric),
            a: count(gap.metric === "views" ? gap.better.medianViews : gap.better.medianLikes),
            b: count(gap.metric === "views" ? gap.worse.medianViews : gap.worse.medianLikes),
            la: secs(gap.better.medianDurationSec),
            lb: secs(gap.worse.medianDurationSec),
          })}
        </p>
      )}

      {withinLength.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-blumea-navy">{t("formats.withinTitle")}</p>
          {withinLength.map((entry) => (
            <p key={entry.formatId} className="text-sm leading-6 text-blumea-navy">
              {t("formats.withinText", {
                format: name(entry.formatId),
                half: entry.halfSize,
                upTo: entry.shorterUpToSec,
                sw: Math.round(entry.shorterWatchedSec),
                sp: Math.round(entry.shorterSharePct),
                from: entry.longerFromSec,
                lw: Math.round(entry.longerWatchedSec),
                lp: Math.round(entry.longerSharePct),
              })}{" "}
              {entry.kind === "stay_longer" && t("formats.withinStay")}
              {entry.kind === "same_stop_point" && t("formats.withinSame")}
              {entry.kind === "no_difference" && t("formats.withinNone")}
            </p>
          ))}
        </div>
      )}

      {gap.kind === "not_enough" && (
        <p className="mt-4 text-sm leading-6 text-blumea-slate">
          {ranked.length === 1
            ? t("formats.notEnoughOne", { format: name(ranked[0].formatId) })
            : t("formats.notEnoughMany", { total: RANK_MIN_TOTAL, have: total, per: RANK_MIN_PER_FORMAT })}
        </p>
      )}

      {gap.kind === "no_gap" && (
        <p className="mt-4 text-sm leading-6 text-blumea-slate">
          {t("formats.noGap")}
        </p>
      )}

      {tooFew.length > 0 && (
        <p className="mt-3 text-xs text-blumea-slate">
          {t("formats.tooFew", { list: tooFew.map((format) => `${name(format.formatId)} (${format.count})`).join(", ") })}
        </p>
      )}

      <p className="mt-3 text-xs text-blumea-slate">
        {t("formats.basedOn", { total, platform: platformLabel })}
      </p>

      {/* Not built: which formats suit a niche needs other creators' data (spec
          L5, "not allowed in V1"); Blumea says so rather than guess. */}
      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4">
        <p className="text-sm font-semibold text-blumea-navy">{t("formats.nicheTitle")}</p>
        <p className="mt-1 text-sm leading-6 text-blumea-slate">
          {t("formats.nicheBody")}
        </p>
      </div>
    </section>
  );
}
