"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Clock3, Trophy, TrendingDown } from "lucide-react";
import BlumeaFlowerLoader from "@/components/BlumeaFlowerLoader";
import PlatformBadge from "@/components/PlatformBadge";
import { getCurrentProfile } from "@/lib/auth";
import { formatPercent } from "@/lib/format";
import { useAppRouter } from "@/lib/use-app-router";
import { useMockStore } from "@/lib/mock-store";
import { engagementRate, seedAnalyzedIds, videos, type Video } from "@/lib/mock-data";

// The First Scan is numbers only (no AI), so it takes seconds. The AI only looks
// at three videos, the First Look. See doc/CLAUDE.md §6.
const steps = [
  "Reading your recent videos",
  "Building your baseline",
  "Choosing three videos to look at first",
];

const STEP_MS = 1000;

const reasonStyles = {
  Strongest: { icon: Trophy },
  Latest: { icon: Clock3 },
  Weakest: { icon: TrendingDown },
};

type Pick = { video: Video; reason: keyof typeof reasonStyles };

function pickFirstLook(list: Video[]): Pick[] {
  const strongest = [...list].sort((a, b) => b.metrics.views - a.metrics.views)[0];
  const latest = [...list].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0];
  const weakest = [...list].sort((a, b) => a.performance - b.performance)[0];

  const picks: Pick[] = [];
  const seen = new Set<string>();

  for (const [reason, video] of [
    ["Strongest", strongest],
    ["Latest", latest],
    ["Weakest", weakest],
  ] as const) {
    if (video && !seen.has(video.id)) {
      seen.add(video.id);
      picks.push({ video, reason });
    }
  }

  return picks;
}

// A pattern from numbers only. Returns nothing when the data doesn't support one,
// and always says how many videos it rests on.
function lengthInsight(list: Video[]) {
  const short = list.filter((video) => video.durationSec <= 30);
  const long = list.filter((video) => video.durationSec > 30);

  if (short.length < 2 || long.length < 2) {
    return null;
  }

  const average = (group: Video[]) =>
    group.reduce((sum, video) => sum + engagementRate(video.metrics), 0) / group.length;

  const shortRate = average(short);
  const longRate = average(long);

  if (shortRate <= longRate) {
    return null;
  }

  return { shortRate, longRate, total: list.length };
}

export default function AnalyzingPage() {
  const router = useAppRouter();
  const { markAnalyzed } = useMockStore(seedAnalyzedIds);

  const [step, setStep] = useState(0);

  const picks = useMemo(() => pickFirstLook(videos), []);
  const insight = useMemo(() => lengthInsight(videos), []);
  const isFinished = step >= steps.length;

  useEffect(() => {
    async function checkAccess() {
      const profile = await getCurrentProfile();

      if (!profile) {
        router.replace("/login");
      }
    }

    checkAccess();
  }, [router]);

  useEffect(() => {
    if (isFinished) {
      return;
    }

    const timer = setTimeout(() => setStep((current) => current + 1), STEP_MS);

    return () => clearTimeout(timer);
  }, [step, isFinished]);

  // Mock: the First Look videos count as analyzed once the scan is done.
  useEffect(() => {
    if (isFinished) {
      picks.forEach((pick) => markAnalyzed(pick.video.id));
    }
  }, [isFinished, picks, markAnalyzed]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-white to-blumea-mist px-6 py-24">
      {/* Brand */}
      <div className="fixed left-6 top-6 z-50 flex items-center gap-3">
        <Image
          src="/blumea-logo-v2.png"
          alt="Blumea logo"
          width={44}
          height={44}
          priority
        />

        <span className="text-2xl font-semibold tracking-tight text-blumea-navy">
          Blum<span className="text-blumea-blue">ea</span>
        </span>
      </div>

      <div className="flex w-full max-w-xl flex-col items-center text-center">
        {isFinished ? (
          <Image
            src="/blumea-logo-v2.png"
            alt="Blumea"
            width={82}
            height={82}
            className="object-contain"
          />
        ) : (
          <BlumeaFlowerLoader size={82} />
        )}

        {!isFinished ? (
          <>
            <h1 className="mt-8 text-3xl font-semibold tracking-tight text-blumea-navy">
              Getting to know your content
            </h1>

            <p className="mt-3 max-w-md text-sm leading-6 text-blumea-slate">
              This takes a few seconds. Blumea starts with your numbers.
            </p>

            <div className="mt-8 w-full max-w-sm space-y-3 text-left">
              {steps.map((label, index) => {
                const completed = index < step;
                const active = index === step;

                return (
                  <div
                    key={label}
                    className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                      completed || active ? "text-blumea-navy" : "text-blumea-slate"
                    }`}
                  >
                    {completed ? (
                      <span className="check-pop flex h-6 w-6 items-center justify-center rounded-full bg-blumea-blue text-white">
                        <Check size={14} strokeWidth={2.5} />
                      </span>
                    ) : active ? (
                      <span className="flex h-6 w-6 items-center justify-center">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-blumea-blue" />
                      </span>
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center">
                        <span className="h-2 w-2 rounded-full bg-slate-200" />
                      </span>
                    )}

                    <span className={active ? "font-medium" : ""}>{label}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-8 text-3xl font-semibold tracking-tight text-blumea-navy">
              Your baseline is ready
            </h1>

            <p className="mt-3 max-w-md text-sm leading-6 text-blumea-slate">
              Blumea read your {videos.length} recent videos and worked out what a typical one looks
              like for you.
            </p>

            {insight ? (
              <div className="mt-8 w-full rounded-3xl border border-blumea-blue/20 bg-white p-6 text-left shadow-sm">
                <p className="text-sm font-medium text-blumea-blue">Blumea noticed</p>

                <h2 className="mt-2 text-xl font-semibold text-blumea-navy">
                  Your shorter videos get more engagement.
                </h2>

                <p className="mt-3 text-sm leading-6 text-blumea-slate">
                  Videos up to 30 seconds average {formatPercent(insight.shortRate)} engagement,
                  against {formatPercent(insight.longRate)} for longer ones.
                </p>

                <p className="mt-3 text-xs text-blumea-slate">
                  From numbers only, across {insight.total} videos. That&apos;s a small sample, so
                  treat it as a first hint.
                </p>
              </div>
            ) : (
              <div className="mt-8 w-full rounded-3xl border border-dashed border-slate-300 bg-white/60 p-6 text-left">
                <p className="text-sm font-semibold text-blumea-navy">No clear pattern yet</p>

                <p className="mt-2 text-sm leading-6 text-blumea-slate">
                  There isn&apos;t enough in your numbers to say something reliable. Blumea will
                  keep learning as you analyze more videos.
                </p>
              </div>
            )}

            <div className="mt-6 w-full rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm">
              <p className="text-sm font-semibold text-blumea-navy">First look</p>

              <p className="mt-1 text-sm text-blumea-slate">
                Blumea is watching three of your videos now. You don&apos;t need to wait: each one
                appears in Content as soon as it&apos;s ready.
              </p>

              <ul className="mt-4 space-y-2">
                {picks.map((pick) => {
                  const Icon = reasonStyles[pick.reason].icon;

                  return (
                    <li
                      key={pick.video.id}
                      className="flex items-center gap-3 rounded-2xl border border-slate-100 px-3 py-2.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blumea-mist text-blumea-blue">
                        <Icon size={16} strokeWidth={1.8} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-blumea-navy">
                          {pick.video.title}
                        </p>

                        <p className="text-xs text-blumea-slate">{pick.reason}</p>
                      </div>

                      <PlatformBadge platform={pick.video.platform} />
                    </li>
                  );
                })}
              </ul>
            </div>

            <button
              onClick={() => router.replace("/dashboard")}
              className="mt-8 rounded-full bg-blumea-navy px-7 py-3 font-medium text-white transition-all duration-300 hover:-translate-y-1 hover:bg-blumea-blue"
            >
              See my Dashboard
            </button>
          </>
        )}
      </div>
    </main>
  );
}
