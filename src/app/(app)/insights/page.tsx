"use client";

import { useEffect, useState } from "react";
import AppLink from "@/components/AppLink";
import FormatRankingSection from "@/components/FormatRankingSection";
import { deriveDashboard, loadDashboardData, type DashboardData } from "@/lib/dashboard-data";
import { realInsightCards } from "@/lib/insight-cards";
import CardFeedback from "@/components/CardFeedback";
import VideoText from "@/components/VideoText";
import { useT } from "@/lib/i18n/client";
import type { TextKey } from "@/lib/i18n/translate";
import Image from "next/image";
import { TrendingUp } from "lucide-react";

const tones: Record<"working" | "opportunity" | "watch" | "fact", { label: TextKey; text: string; icon: string }> = {
  fact: {
    label: "insightsPage.toneFact",
    text: "text-blumea-blue",
    icon: "/blumea-logo-v2.png",
  },
  working: {
    label: "dashboard.toneWorking",
    text: "text-emerald-600",
    icon: "/logo-colors/blumea-green-v1.png",
  },
  opportunity: {
    label: "dashboard.toneOpportunity",
    text: "text-blumea-blue",
    icon: "/blumea-logo-v2.png",
  },
  watch: {
    label: "dashboard.toneWatch",
    text: "text-red-500",
    icon: "/logo-colors/blumea-red-v1.png",
  },
};

export default function InsightsPage() {
  const t = useT();
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
  const realCards = data && hasRealVideos ? realInsightCards(deriveDashboard(data.videos, data.accounts), t) : [];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">
        {t("insightsPage.title")}
      </h1>

      <p className="mt-2 text-blumea-slate">
        {t("insightsPage.subtitle")}
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
                  <p className={`text-sm font-medium ${tone.text}`}>{t(tone.label)}</p>
                </div>
                <h2 className="mt-3 text-xl font-semibold text-blumea-navy">
                  <VideoText text={card.title} />
                </h2>
                <p className="mt-2 text-sm leading-6 text-blumea-slate">
                  <VideoText text={card.body} />
                </p>
                {card.evidence && <p className="mt-4 text-xs text-blumea-slate">{card.evidence}</p>}
                <CardFeedback target={card.title} />
              </article>
            );
          })}
        </section>
      )}

            {data && !hasRealVideos && (
        <section className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/60 p-5 sm:p-6">
          <p className="text-sm font-semibold text-blumea-navy">{t("insightsPage.emptyTitle")}</p>

          <p className="mt-2 text-sm leading-6 text-blumea-slate">
            {t("insightsPage.emptyBody")}
          </p>

          <AppLink
            href="/analyze"
            className="mt-4 inline-block text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
          >
            {t("insightsPage.analyzeLink")}
          </AppLink>
        </section>
      )}

      <section className="mb-6 mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/60 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} strokeWidth={1.8} className="text-blumea-blue" />

          <p className="text-sm font-semibold text-blumea-navy">{t("insightsPage.trendsTitle")}</p>
        </div>

        <p className="mt-2 text-sm leading-6 text-blumea-slate">
          {t("insightsPage.trendsBody")}
        </p>
      </section>
    </div>
  );
}
