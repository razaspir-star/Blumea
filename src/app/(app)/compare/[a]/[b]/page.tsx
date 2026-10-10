"use client";

import { use, useState } from "react";
import Image from "next/image";
import AppLink from "@/components/AppLink";
import { notFound } from "next/navigation";
import { ArrowLeft, GitCompareArrows } from "lucide-react";
import CompareModal from "@/components/CompareModal";
import { PlatformIcon } from "@/components/PlatformBadge";
import { formatCount, formatPercent } from "@/lib/format";
import { engagementRate, getSubject, type Subject } from "@/lib/mock-data";

function SubjectCard({ subject, tag }: { subject: Subject; tag: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
      {subject.thumbnail ? (
        <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          <Image src={subject.thumbnail} alt="" fill sizes="56px" className="object-cover" />
        </div>
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blumea-mist text-blumea-blue">
          <GitCompareArrows size={22} strokeWidth={1.8} />
        </div>
      )}

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-blumea-blue">{tag}</p>

        <p className="mt-1 truncate text-base font-semibold text-blumea-navy">{subject.label}</p>

        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-blumea-slate">
          {subject.platform && <PlatformIcon platform={subject.platform} size={11} />}
          {subject.sublabel}
        </p>
      </div>
    </div>
  );
}

function ratioText(a: number, b: number): string {
  return `${(a / b).toFixed(1).replace(/\.0$/, "")}×`;
}

export default function ComparePage({ params }: PageProps<"/compare/[a]/[b]">) {
  // Prototype page: made-up data, only for development until Compare is built.
  if (process.env.NODE_ENV !== "development") notFound();

  const { a, b } = use(params);
  const [compareOpen, setCompareOpen] = useState(false);

  const first = getSubject(a);
  const second = getSubject(b);

  if (!first || !second) {
    notFound();
  }

  const rows = [
    { label: "Views", a: formatCount(first.metrics.views), b: formatCount(second.metrics.views) },
    { label: "Likes", a: formatCount(first.metrics.likes), b: formatCount(second.metrics.likes) },
    {
      label: "Comments",
      a: formatCount(first.metrics.comments),
      b: formatCount(second.metrics.comments),
    },
    { label: "Shares", a: formatCount(first.metrics.shares), b: formatCount(second.metrics.shares) },
    { label: "Saves", a: formatCount(first.metrics.saves), b: formatCount(second.metrics.saves) },
    {
      label: "Engagement rate",
      a: formatPercent(engagementRate(first.metrics)),
      b: formatPercent(engagementRate(second.metrics)),
    },
    ...(first.avgWatchPct !== undefined && second.avgWatchPct !== undefined
      ? [
          {
            label: "Average share watched",
            a: formatPercent(first.avgWatchPct, 0),
            b: formatPercent(second.avgWatchPct, 0),
          },
        ]
      : []),
  ];

  // Fields both videos have, so the differences are like-for-like.
  const shared =
    first.identity && second.identity
      ? ["Format", "Textual hook", "Visual hook", "Sound"]
          .map((label) => ({
            label,
            a: first.identity?.find((field) => field.label === label),
            b: second.identity?.find((field) => field.label === label),
          }))
          .filter((row) => row.a && row.b)
      : [];

  const bothVideos = first.kind === "video" && second.kind === "video";

  // What we see: facts only.
  const facts = [
    `${first.label} has ${ratioText(first.metrics.views, second.metrics.views)} the views of ${second.label}.`,
  ];

  if (first.durationSec && second.durationSec) {
    facts.push(`${first.label} is ${first.durationSec} sec long; ${second.label} is ${second.durationSec} sec.`);
  }

  // What it may mean: cautious inference, only when the data supports a comparison.
  const inferences: string[] = [];

  if (
    first.durationSec &&
    second.durationSec &&
    first.avgWatchPct !== undefined &&
    second.avgWatchPct !== undefined
  ) {
    const [shorter, longer] =
      first.durationSec <= second.durationSec ? [first, second] : [second, first];

    if (
      (longer.durationSec as number) / (shorter.durationSec as number) >= 1.25 &&
      (shorter.avgWatchPct as number) > (longer.avgWatchPct as number)
    ) {
      inferences.push(
        `The shorter video kept a larger share of its length watched (${formatPercent(
          shorter.avgWatchPct as number,
          0
        )} vs ${formatPercent(longer.avgWatchPct as number, 0)}), suggesting length may play a part.`
      );
    }
  }

  if (bothVideos && shared.some((row) => row.a?.value !== row.b?.value)) {
    inferences.push(
      "The videos differ in how they open, which may contribute to the difference. Two videos can't prove the cause."
    );
  }

  if (inferences.length === 0) {
    inferences.push(
      bothVideos
        ? "Nothing in these two videos clearly explains the difference, so Blumea won't guess."
        : "A baseline shows how a video performed, not why. Compare it with a similar video to find out why."
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <AppLink
        href="/analyze"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
      >
        <ArrowLeft size={16} />
        Analyze & Compare
      </AppLink>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">
            Comparison
          </h1>

          <p className="mt-2 text-blumea-slate">What the numbers show, and what may explain them.</p>
        </div>

        <button
          type="button"
          onClick={() => setCompareOpen(true)}
          className="text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
        >
          Choose something else →
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <SubjectCard subject={first} tag="A" />

        <SubjectCard subject={second} tag="B" />
      </div>

      {/* Raw numbers stay color-neutral: facts, no good or bad. */}
      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-slate-100 bg-blumea-mist/60 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-blumea-slate">
          <span>Numbers</span>

          <span>A</span>

          <span>B</span>
        </div>

        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-slate-100 px-5 py-3.5 text-sm last:border-b-0"
          >
            <span className="text-blumea-slate">{row.label}</span>

            <span className="font-semibold text-blumea-navy">{row.a}</span>

            <span className="font-semibold text-blumea-navy">{row.b}</span>
          </div>
        ))}
      </section>

      {shared.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight text-blumea-navy">
            How they&apos;re built
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {shared.map((row) => (
              <div
                key={row.label}
                className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-blumea-blue">
                  {row.label}
                </p>

                <p className="mt-2 text-sm text-blumea-navy">
                  <span className="font-semibold text-blumea-slate">A · </span>
                  {row.a?.value}
                </p>

                <p className="mt-1 text-sm text-blumea-navy">
                  <span className="font-semibold text-blumea-slate">B · </span>
                  {row.b?.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fact, inference and recommendation stay in separate blocks. */}
      <section className="mt-8 grid grid-cols-1 gap-4 pb-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blumea-slate">
            What we see
          </p>

          <ul className="mt-3 space-y-2 text-sm leading-6 text-blumea-navy">
            {facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blumea-blue">
            What it may mean
          </p>

          <ul className="mt-3 space-y-2 text-sm leading-6 text-blumea-navy">
            {inferences.map((inference) => (
              <li key={inference}>{inference}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-blumea-mist p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blumea-success">
            What to try
          </p>

          <p className="mt-3 text-sm leading-6 text-blumea-navy">
            {bothVideos
              ? "Pick one difference above and change only that in your next video, so you can tell what made the difference."
              : "Open a video you like from this comparison and compare it with a similar one from your own content."}
          </p>
        </div>
      </section>

      {compareOpen && <CompareModal onClose={() => setCompareOpen(false)} />}
    </div>
  );
}
