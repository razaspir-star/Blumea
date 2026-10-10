"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAppRouter } from "@/lib/use-app-router";
import { Check, GitCompareArrows, TrendingUp } from "lucide-react";
import Modal from "@/components/Modal";
import BlumeaFlowerLoader from "@/components/BlumeaFlowerLoader";
import { PlatformIcon } from "@/components/PlatformBadge";
import { formatCount } from "@/lib/format";
import { videos } from "@/lib/mock-data";

type CompareKind = "videos" | "baseline" | "recent";

// Types that need data we don't have yet (competitors, benchmarks) are listed
// honestly as later instead of being faked.
const laterTypes = ["Creator vs Creator", "Hook vs Hook", "Topic vs Topic", "Your content vs your niche"];

const kinds: { id: CompareKind; title: string; description: string; icon: typeof GitCompareArrows }[] = [
  {
    id: "videos",
    title: "Video vs Video",
    description: "Put two of your videos side by side.",
    icon: GitCompareArrows,
  },
  {
    id: "baseline",
    title: "Video vs your usual",
    description: "See how one video sits against your last 50.",
    icon: TrendingUp,
  },
  {
    id: "recent",
    title: "Recent vs your usual",
    description: "See how the last 30 days compare with your baseline.",
    icon: TrendingUp,
  },
];

export default function CompareModal({ onClose }: { onClose: () => void }) {
  const router = useAppRouter();
  const [kind, setKind] = useState<CompareKind | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [preparing, setPreparing] = useState<string | null>(null);

  const needed = kind === "videos" ? 2 : 1;

  // A short, visible step before handing off to the comparison page — so the
  // popup itself shows something is happening, not just a silent page jump.
  useEffect(() => {
    if (!preparing) {
      return;
    }

    const timer = setTimeout(() => router.push(preparing), 600);

    return () => clearTimeout(timer);
  }, [preparing, router]);

  function toggle(videoId: string) {
    setSelected((current) => {
      if (current.includes(videoId)) {
        return current.filter((id) => id !== videoId);
      }

      // A single-choice step replaces the pick; two-choice keeps the latest two.
      return [...current, videoId].slice(-needed);
    });
  }

  function choose(next: CompareKind) {
    if (next === "recent") {
      setPreparing("/compare/recent/baseline");
      return;
    }

    setKind(next);
    setSelected([]);
  }

  function start() {
    if (selected.length !== needed) {
      return;
    }

    setPreparing(
      kind === "videos" ? `/compare/${selected[0]}/${selected[1]}` : `/compare/${selected[0]}/baseline`
    );
  }

  return (
    <Modal
      kicker="COMPARE"
      title="Start a comparison"
      description={
        kind || preparing ? undefined : "Choose what you want Blumea to compare."
      }
      onClose={onClose}
    >
      {preparing && (
        <div className="blumea-expand mt-8">
          <div className="flex flex-col items-center py-10 text-center">
            <BlumeaFlowerLoader size={56} />

            <h3 className="mt-6 text-lg font-semibold text-blumea-navy">
              Putting your comparison together
            </h3>

            <p className="mt-2 max-w-sm text-sm text-blumea-slate">
              Lining up the numbers so they&apos;re easy to compare.
            </p>
          </div>
        </div>
      )}

      {!preparing && !kind && (
        <div className="blumea-expand mt-7">
          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {kinds.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => choose(item.id)}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-blumea-blue hover:shadow-sm"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blumea-mist text-blumea-blue">
                      <Icon size={18} strokeWidth={1.8} />
                    </div>

                    <p className="mt-3 text-sm font-semibold text-blumea-navy">{item.title}</p>

                    <p className="mt-1 text-xs leading-5 text-blumea-slate">{item.description}</p>
                  </button>
                );
              })}
            </div>

            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-blumea-slate">
              Coming later
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {laterTypes.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-400"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {!preparing && kind && (
        <div className="blumea-expand mt-7">
          <div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setKind(null)}
                className="text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
              >
                ← Back
              </button>

              <span className="text-sm font-medium text-blumea-slate">
                {kinds.find((item) => item.id === kind)?.title}
              </span>
            </div>

            <h3 className="mt-5 text-lg font-semibold text-blumea-navy">
              {kind === "videos" ? "Choose two videos" : "Choose a video"}
            </h3>

            <div className="mt-4 max-h-[380px] space-y-2 overflow-y-auto pr-1">
              {videos.map((video) => {
                const isSelected = selected.includes(video.id);

                return (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => toggle(video.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl bg-white p-2.5 text-left transition-all ${
                      isSelected
                        ? "border-2 border-blumea-blue shadow-sm"
                        : "border border-slate-200 hover:border-blumea-blue/40"
                    }`}
                  >
                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      <Image src={video.thumbnail} alt="" fill sizes="40px" className="object-cover" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-blumea-navy">
                        {video.title}
                      </p>

                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-blumea-slate">
                        <PlatformIcon platform={video.platform} size={11} />
                        {formatCount(video.metrics.views)} views
                      </p>
                    </div>

                    {isSelected && (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blumea-blue text-white">
                        <Check size={14} strokeWidth={2.4} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={selected.length !== needed}
                onClick={start}
                className={
                  selected.length === needed
                    ? "rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blumea-blue"
                    : "cursor-not-allowed rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-400"
                }
              >
                Compare
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
