"use client";

import { useEffect, useState } from "react";
import AppLink from "@/components/AppLink";
import FormatRankingSection from "@/components/FormatRankingSection";
import { deriveDashboard, loadDashboardData, type DashboardData } from "@/lib/dashboard-data";
import { realInsightCards } from "@/lib/insight-cards";
import Image from "next/image";
import { TrendingUp } from "lucide-react";

const tones: Record<"working" | "opportunity" | "watch" | "fact", { label: string; text: string; icon: string }> = {
  fact: {
    label: "Worth knowing",
    text: "text-blumea-blue",
    icon: "/blumea-logo-v2.png",
  },
  working: {
    label: "What's working",
    text: "text-emerald-600",
    icon: "/logo-colors/blumea-green-v1.png",
  },
  opportunity: {
    label: "Opportunity",
    text: "text-blumea-blue",
    icon: "/blumea-logo-v2.png",
  },
  watch: {
    label: "Worth watching",
    text: "text-red-500",
    icon: "/logo-colors/blumea-red-v1.png",
  },
};

export default function InsightsPage() {
  // Only real insights. An account with no analyzed video sees an honest note;
  // while loading, nothing flashes.
  const [data, setData] = useState<DashboardData | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadDashboardData().then((loaded) => {
      if (!cancelled) setData(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const hasRealVideos = (data?.videos.length ?? 0) > 0;
  const realCards = data && hasRealVideos ? realInsightCards(deriveDashboard(data.videos, data.accounts)) : [];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">
        Insights
      </h1>

      <p className="mt-2 text-blumea-slate">
        Patterns Blumea found across your content, and how sure it is about each one.
      </p>

      {/* REAL: computed from the creator's own analyzed YouTube videos. */}
      <FormatRankingSection />

      {hasRealVideos && (
        <section className="mt-8 grid grid-cols-1 gap-4">
          {realCards.map((card) => {
            const tone = tones[card.tone];
            return (
              <article
                key={card.title}
                className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex items-center gap-2">
                  <Image src={tone.icon} alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
                  <p className={`text-sm font-medium ${tone.text}`}>{tone.label}</p>
                </div>
                <h2 className="mt-3 text-xl font-semibold text-blumea-navy">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-blumea-slate">{card.body}</p>
                {card.evidence && <p className="mt-4 text-xs text-blumea-slate">{card.evidence}</p>}
              </article>
            );
          })}
        </section>
      )}

            {data && !hasRealVideos && (
        <section className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/60 p-5 sm:p-6">
          <p className="text-sm font-semibold text-blumea-navy">No insights yet</p>

          <p className="mt-2 text-sm leading-6 text-blumea-slate">
            Analyze a few of your videos and Blumea will look for patterns across them. Each insight says how many videos it
            rests on, and Blumea stays quiet when there is not enough to say. Small samples are noisy, so it won&apos;t guess.
          </p>

          <AppLink
            href="/analyze"
            className="mt-4 inline-block text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
          >
            Analyze a video →
          </AppLink>
        </section>
      )}

      <section className="mb-6 mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/60 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} strokeWidth={1.8} className="text-blumea-blue" />

          <p className="text-sm font-semibold text-blumea-navy">Trends</p>
        </div>

        <p className="mt-2 text-sm leading-6 text-blumea-slate">
          No confirmed trends yet. Blumea only shows a trend when there is real data behind it, and
          there is no official trend source for these platforms today. Trends will appear here when
          they can be backed up.
        </p>
      </section>
    </div>
  );
}
