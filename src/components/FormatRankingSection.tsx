"use client";

import { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCount } from "@/lib/format";
import { formatLabel } from "@/lib/format-library";
import { stayedToWatchPct } from "@/lib/insight-rules";
import {
  bestFormats,
  withinFormatLength,
  formatGap,
  summarizeFormats,
  RANK_MIN_PER_FORMAT,
  RANK_MIN_TOTAL,
  type FormatVideoRow,
} from "@/lib/format-ranking";

// REAL (not mock): how the creator's own YouTube videos compare by format
// (Insight_Engine_Spec.md §3.5 "Ranking formats"). Medians with counts, never a
// "best format" verdict the data cannot carry.
function useFormatRows() {
  const [rows, setRows] = useState<FormatVideoRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: videos } = await supabase
        .from("videos")
        .select("id, duration_sec")
        .eq("platform", "youtube");
      if (!videos || videos.length === 0) {
        if (!cancelled) setRows([]);
        return;
      }
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
      if (!cancelled) setRows(built);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return rows;
}

const pct = (value: number | null) => (value === null ? "—" : `${Math.round(value)}%`);
const count = (value: number | null) => (value === null ? "—" : formatCount(Math.round(value)));
const secs = (value: number | null) => (value === null ? "—" : `${Math.round(value)} s`);

export default function FormatRankingSection() {
  const rows = useFormatRows();
  if (rows === null || rows.length === 0) return null;

  const { ranked, tooFew, total } = summarizeFormats(rows);
  const gap = formatGap(ranked, total);
  const best = bestFormats(rows);
  const withinLength = withinFormatLength(rows);
  const name = (id: string) => formatLabel(id) ?? id;
  const metricName = (metric: "views" | "likes") => (metric === "views" ? "views" : "likes");

  return (
    <section className="mt-8 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <Layers size={18} strokeWidth={1.8} className="text-blumea-blue" />
        <p className="text-sm font-semibold text-blumea-navy">Your formats</p>
      </div>

      <p className="mt-1 text-sm text-blumea-slate">
        How your own YouTube videos compare by format. Typical (median) values, with the number of
        videos behind each.
      </p>

      {ranked.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-blumea-slate">
                <th className="py-2 pr-3 font-semibold">Format</th>
                <th className="px-3 py-2 font-semibold">Videos</th>
                <th className="px-3 py-2 font-semibold">Views</th>
                <th className="px-3 py-2 font-semibold">Likes</th>
                <th className="px-3 py-2 font-semibold" title="Estimate, see the video page">Stayed to watch ≈</th>
                <th className="px-3 py-2 font-semibold">Watched of the video</th>
                <th className="py-2 pl-3 font-semibold">Typical length</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((format) => (
                <tr key={format.formatId} className="border-t border-slate-100 text-blumea-navy">
                  <td className="py-3 pr-3 font-medium">{name(format.formatId)}</td>
                  <td className="px-3 py-3">
                    {format.count} <span className="text-xs text-blumea-slate">({Math.round((format.count / total) * 100)}%)</span>
                  </td>
                  <td className="px-3 py-3">{count(format.medianViews)}</td>
                  <td className="px-3 py-3">{count(format.medianLikes)}</td>
                  <td className="px-3 py-3">{pct(format.medianStayedPct)}</td>
                  <td className="px-3 py-3">{pct(format.medianWatchSharePct)}</td>
                  <td className="py-3 pl-3">{secs(format.medianDurationSec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-blumea-slate">
          No format has {RANK_MIN_PER_FORMAT} analyzed videos yet, so there is nothing to compare.
        </p>
      )}

      {best.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-blumea-navy">Formats that work for you</p>
          {best.map((format) => (
            <div key={format.formatId} className="rounded-2xl border border-blumea-blue/25 bg-white p-4">
              <p className="text-sm leading-6 text-blumea-navy">
                Your <span className="font-semibold">{name(format.formatId)}</span> videos usually do better than your
                other videos: a median of {count(format.medianValue)} {metricName(format.metric)} vs{" "}
                {count(format.restMedianValue)}, and {format.beatingRest} of {format.count} of them beat your other
                videos&apos; median. <span className="font-medium">Worth keeping in the mix.</span>
                {format.lengthConfounded &&
                  " They also differ a lot in length from your other videos, so some of it may be the length rather than the format."}
              </p>
              <p className="mt-2 text-xs text-blumea-slate">
                A pattern in your {format.count + format.restCount} videos; it doesn&apos;t prove the format is the
                reason.
              </p>
            </div>
          ))}
        </div>
      )}

      {gap.kind === "pattern" && (
        <p className="mt-4 text-sm leading-6 text-blumea-navy">
          In your videos, <span className="font-semibold">{name(gap.better.formatId)}</span> got more{" "}
          {metricName(gap.metric)} than <span className="font-semibold">{name(gap.worse.formatId)}</span>
          : a median of{" "}
          {count(gap.metric === "views" ? gap.better.medianViews : gap.better.medianLikes)} vs{" "}
          {count(gap.metric === "views" ? gap.worse.medianViews : gap.worse.medianLikes)} ({gap.better.count} vs{" "}
          {gap.worse.count} videos). This is a pattern in <em>your</em> videos; it doesn&apos;t prove the
          format is the reason.
        </p>
      )}

      {gap.kind === "length_confounded" && (
        <p className="mt-4 text-sm leading-6 text-blumea-navy">
          <span className="font-semibold">{name(gap.better.formatId)}</span> videos got more{" "}
          {metricName(gap.metric)} than <span className="font-semibold">{name(gap.worse.formatId)}</span>{" "}
          videos (median{" "}
          {count(gap.metric === "views" ? gap.better.medianViews : gap.better.medianLikes)} vs{" "}
          {count(gap.metric === "views" ? gap.worse.medianViews : gap.worse.medianLikes)}), but they are also very
          different in length (typically {secs(gap.better.medianDurationSec)} vs{" "}
          {secs(gap.worse.medianDurationSec)}). Blumea can&apos;t tell whether the format or the length is behind
          the gap, so it won&apos;t say.
        </p>
      )}

      {withinLength.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-blumea-navy">Length inside a format</p>
          {withinLength.map((entry) => (
            <p key={entry.formatId} className="text-sm leading-6 text-blumea-navy">
              <span className="font-semibold">{name(entry.formatId)}:</span> your {entry.halfSize} shorter videos (up
              to {entry.shorterUpToSec} s) were watched for a median {Math.round(entry.shorterWatchedSec)} s (
              {Math.round(entry.shorterSharePct)}% of the video); your {entry.halfSize} longer ones (from{" "}
              {entry.longerFromSec} s), {Math.round(entry.longerWatchedSec)} s ({Math.round(entry.longerSharePct)}%).{" "}
              {entry.kind === "stay_longer" && "Viewers stay longer on the longer ones, so length doesn't look like what's limiting them."}
              {entry.kind === "same_stop_point" &&
                "Viewers stop at about the same point either way, so the longer ones lose a bigger share — a tighter cut of the same piece may be worth a try."}
              {entry.kind === "no_difference" && "Length doesn't clearly change how people watch this format."}
            </p>
          ))}
        </div>
      )}

      {gap.kind === "not_enough" && (
        <p className="mt-4 text-sm leading-6 text-blumea-slate">
          {ranked.length === 1
            ? `Your videos share one format, ${name(ranked[0].formatId)} — a consistent style. Blumea compares formats only when you use more than one, and never asks you to change yours.`
            : `Blumea compares formats once it has ${RANK_MIN_TOTAL} analyzed videos (${total} so far) and at least two formats with ${RANK_MIN_PER_FORMAT} videos each. Nothing here is a problem to fix.`}
        </p>
      )}

      {gap.kind === "no_gap" && (
        <p className="mt-4 text-sm leading-6 text-blumea-slate">
          No clear difference between your formats yet — a normal answer, not a missing one.
        </p>
      )}

      {tooFew.length > 0 && (
        <p className="mt-3 text-xs text-blumea-slate">
          Too few videos to compare yet:{" "}
          {tooFew.map((format) => `${name(format.formatId)} (${format.count})`).join(", ")}.
        </p>
      )}

      <p className="mt-3 text-xs text-blumea-slate">
        Based on {total} analyzed YouTube videos. Small groups are noisy — take the numbers loosely.
      </p>

      {/* Not built: which formats suit a niche needs other creators' data (spec
          L5, "not allowed in V1"); Blumea says so rather than guess. */}
      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4">
        <p className="text-sm font-semibold text-blumea-navy">Formats in your niche</p>
        <p className="mt-1 text-sm leading-6 text-blumea-slate">
          Coming later. To say which formats suit your niche, Blumea needs data from other creators in it, and
          won&apos;t guess in the meantime.
        </p>
      </div>
    </section>
  );
}
