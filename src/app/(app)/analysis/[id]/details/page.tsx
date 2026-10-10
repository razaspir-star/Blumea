"use client";

import { use } from "react";
import AppLink from "@/components/AppLink";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import PlatformBadge, { ModeBadge } from "@/components/PlatformBadge";
import { useMockStore } from "@/lib/mock-store";
import { formatPercent, formatTime } from "@/lib/format";
import {
  biggestDrop,
  engagementRate,
  getAnalysis,
  getVideo,
  platformLabels,
  seedAnalyzedIds,
  type Video,
} from "@/lib/mock-data";

type Stat = { label: string; value?: string; note: string; unavailable?: boolean };

function getStats(video: Video): Stat[] {
  const platformName = platformLabels[video.platform];
  const watchedShare = (video.avgWatchSec / video.durationSec) * 100;

  let completion: Stat = {
    label: "Completion rate",
    note: `${platformName} doesn't share it.`,
    unavailable: true,
  };

  if (video.fullWatchRate !== undefined) {
    completion = {
      label: "Watched to the end",
      value: formatPercent(video.fullWatchRate),
      note: "Share of views that reached the end of the video.",
    };
  } else if (video.retention) {
    completion = {
      label: "Watched to the end",
      value: formatPercent(video.retention[video.retention.length - 1]),
      note: "Share of viewers still watching at the last measured point.",
    };
  }

  let opening: Stat = {
    label: "3-second retention",
    note: `${platformName} doesn't share it.`,
    unavailable: true,
  };

  if (video.retention) {
    opening = {
      label: "3-second retention",
      value: formatPercent((video.retention[1] + video.retention[2]) / 2, 0),
      note: "Share of viewers still watching after the first 3 seconds.",
    };
  } else if (video.skipRate !== undefined) {
    opening = {
      label: "Opening retention",
      value: formatPercent(100 - video.skipRate, 0),
      note: "Share of viewers who didn't skip. Based on Instagram's skip rate.",
    };
  }

  return [
    {
      label: "Average watch time",
      value: `${video.avgWatchSec.toFixed(1)} sec`,
      note: `${formatPercent(watchedShare, 0)} of a ${video.durationSec} sec video.`,
    },
    completion,
    opening,
    {
      label: "Rewatch rate",
      note: "Not available from any connected platform yet.",
      unavailable: true,
    },
    {
      label: "Engagement rate",
      value: formatPercent(engagementRate(video.metrics)),
      note: `Likes, comments, shares${video.metrics.saves === null ? "" : " and saves"} as a share of views.`,
    },
  ];
}

const chart = { width: 600, height: 220, left: 40, right: 12, top: 12, bottom: 28 };

function RetentionChart({ video, dropAt }: { video: Video; dropAt: number | null }) {
  const points = video.retention ?? [];
  const innerWidth = chart.width - chart.left - chart.right;
  const innerHeight = chart.height - chart.top - chart.bottom;

  const x = (seconds: number) => chart.left + (seconds / video.durationSec) * innerWidth;
  const y = (percent: number) => chart.top + (1 - percent / 100) * innerHeight;

  const line = points.map((percent, index) => `${x(index * 2)},${y(percent)}`).join(" ");
  const area = `${chart.left},${y(0)} ${line} ${x((points.length - 1) * 2)},${y(0)}`;

  return (
    <svg
      viewBox={`0 0 ${chart.width} ${chart.height}`}
      role="img"
      aria-label="Viewer retention over the length of the video"
      className="w-full"
    >
      {[0, 50, 100].map((tick) => (
        <g key={tick}>
          <line
            x1={chart.left}
            x2={chart.width - chart.right}
            y1={y(tick)}
            y2={y(tick)}
            className="stroke-slate-200"
            strokeWidth={1}
          />

          <text x={chart.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-slate-400 text-[11px]">
            {tick}%
          </text>
        </g>
      ))}

      <polygon points={area} className="fill-blumea-blue/10" />

      <polyline
        points={line}
        fill="none"
        className="stroke-blumea-blue"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {dropAt !== null && (
        <g>
          <line
            x1={x(dropAt)}
            x2={x(dropAt)}
            y1={chart.top}
            y2={y(0)}
            className="stroke-amber-400"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />

          <text x={x(dropAt) + 6} y={chart.top + 12} className="fill-amber-600 text-[11px] font-semibold">
            Biggest drop {formatTime(dropAt)}
          </text>
        </g>
      )}

      {[0, 0.5, 1].map((share) => (
        <text
          key={share}
          x={x(share * video.durationSec)}
          y={chart.height - 8}
          textAnchor={share === 0 ? "start" : share === 1 ? "end" : "middle"}
          className="fill-slate-400 text-[11px]"
        >
          {formatTime(share * video.durationSec)}
        </text>
      ))}
    </svg>
  );
}

export default function DetailedAnalyticsPage({
  params,
}: PageProps<"/analysis/[id]/details">) {
  // Prototype page: made-up data, only for development until a real one exists.
  if (process.env.NODE_ENV !== "development") notFound();

  const { id } = use(params);
  const { deepIds } = useMockStore(seedAnalyzedIds);

  const video = getVideo(id);
  const analysis = video ? getAnalysis(video, deepIds) : undefined;

  if (!video || !analysis) {
    notFound();
  }

  const dropAt = video.retention ? biggestDrop(video.retention) : null;
  const timeline = [
    ...analysis.moments,
    ...(dropAt !== null && !analysis.moments.some((moment) => Math.abs(moment.at - dropAt) <= 1)
      ? [{ at: dropAt, label: "Biggest drop in viewers", kind: "note" as const }]
      : []),
  ].sort((a, b) => a.at - b.at);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <AppLink
        href={`/analysis/${video.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
      >
        <ArrowLeft size={16} />
        Video analysis
      </AppLink>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">
        Detailed analytics
      </h1>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-blumea-slate">{video.title}</p>

        <PlatformBadge platform={video.platform} />

        <ModeBadge mode={analysis.mode} />
      </div>

      <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {getStats(video).map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border p-4 shadow-sm ${
              stat.unavailable
                ? "border-dashed border-slate-200 bg-white/60"
                : "border-slate-200/70 bg-white"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-blumea-slate">
              {stat.label}
            </p>

            <p
              className={`mt-3 text-2xl font-semibold tracking-tight ${
                stat.unavailable ? "text-slate-400" : "text-blumea-navy"
              }`}
            >
              {stat.value ?? "Not available"}
            </p>

            <p className="mt-1 text-sm text-blumea-slate">{stat.note}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-blumea-navy">Retention</h2>

        {video.retention ? (
          <>
            <p className="mt-1 text-sm text-blumea-slate">
              How many viewers were still watching at each point in the video.
            </p>

            <div className="mt-4">
              <RetentionChart video={video} dropAt={dropAt} />
            </div>
          </>
        ) : (
          <div className="mt-3 flex items-start gap-3 rounded-xl bg-blumea-mist p-4">
            <Info size={18} strokeWidth={1.8} className="mt-0.5 shrink-0 text-blumea-blue" />

            <p className="text-sm leading-6 text-blumea-slate">
              {platformLabels[video.platform]} doesn&apos;t share second-by-second retention, so
              Blumea can&apos;t draw this curve. The summary above uses what the platform does
              provide.
            </p>
          </div>
        )}
      </section>

      <section className="mt-8 pb-6">
        <h2 className="text-lg font-semibold text-blumea-navy">Timeline</h2>

        {timeline.length > 0 ? (
          <ol className="mt-4 space-y-2">
            {timeline.map((moment) => (
              <li
                key={`${moment.at}-${moment.label}`}
                className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm"
              >
                <span className="w-10 shrink-0 text-sm font-semibold text-blumea-blue">
                  {formatTime(moment.at)}
                </span>

                <span className="text-sm text-blumea-navy">{moment.label}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-blumea-slate">
            The timeline needs the video file. Upload it from the analysis page to see the key
            moments.
          </p>
        )}
      </section>
    </div>
  );
}
