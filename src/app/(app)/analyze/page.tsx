"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AppLink from "@/components/AppLink";
import { GitCompareArrows, PlaySquare } from "lucide-react";
import AnalyzeModal from "@/components/AnalyzeModal";
import ComparePicker from "@/components/ComparePicker";
import { PlatformIcon } from "@/components/PlatformBadge";
import { loadDashboardData, type DashboardVideo } from "@/lib/dashboard-data";
import { platformLabels } from "@/lib/mock-data";
import { useT } from "@/lib/i18n/client";

// Real data only. Comparing videos is not built yet, so the Compare button is
// shown as "coming soon" instead of opening the prototype's made-up comparisons.
export default function AnalyzePage() {
  const t = useT();
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [videos, setVideos] = useState<DashboardVideo[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDashboardData().then((data) => {
      if (!cancelled) setVideos(data.videos);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const recent = [...(videos ?? [])]
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">{t("analyzePage.title")}</h1>

        <p className="mt-2 text-blumea-slate">{t("analyzePage.subtitle")}</p>
      </div>

      <div className="mt-7 flex w-full justify-center">
        <div className="grid w-full max-w-sm grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => setAnalyzeOpen(true)}
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-blumea-navy px-4 py-2 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-blumea-blue hover:shadow-md"
            >
              <PlaySquare size={16} strokeWidth={1.8} className="text-white" />

              <span className="text-sm font-semibold text-white">{t("analyzePage.analyze")}</span>
            </button>

            <p className="mt-2 text-center text-xs text-blumea-slate">{t("analyzePage.understand")}</p>
          </div>

          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full border-2 border-blumea-navy bg-white px-4 py-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-blumea-blue hover:shadow-md"
            >
              <GitCompareArrows size={16} strokeWidth={1.8} className="text-blumea-navy" />

              <span className="text-sm font-semibold text-blumea-navy">{t("analyzePage.compare")}</span>
            </button>

            <p className="mt-2 text-center text-xs text-blumea-slate">{t("analyzePage.compareHint")}</p>
          </div>
        </div>
      </div>

      <section className="mt-12 pb-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-blumea-navy">{t("analyzePage.already")}</h2>

            <p className="mt-1 text-sm text-blumea-slate">{t("analyzePage.jumpBack")}</p>
          </div>

          <AppLink href="/content" className="text-sm font-semibold text-blumea-blue hover:opacity-70">
            {t("dashboard.viewAll")}
          </AppLink>
        </div>

        {videos !== null && recent.length === 0 && (
          <p className="mt-4 text-sm text-blumea-slate">{t("analyzePage.none")}</p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recent.map((video) => (
            <AppLink
              key={video.id}
              href={`/analysis/${video.id}`}
              className="group overflow-hidden rounded-2xl border border-slate-200/70 bg-white text-start shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blumea-blue/40 hover:shadow-md"
            >
              <div className="relative aspect-video overflow-hidden bg-slate-100">
                {(video.platform === "youtube" || video.thumbnailUrl) && (
                  <Image
                    src={video.platform === "youtube" ? `https://i.ytimg.com/vi/${video.platformVideoId}/mqdefault.jpg` : (video.thumbnailUrl as string)}
                    alt={video.title}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}

                <div className="absolute bottom-2 start-2 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-blumea-navy shadow-sm">
                  <PlatformIcon platform={video.platform as "youtube" | "tiktok"} size={12} />

                  <span>{platformLabels[video.platform as "youtube" | "tiktok"]}</span>
                </div>
              </div>

              <div className="p-4">
                <p className="truncate text-sm font-semibold text-blumea-navy">{video.title}</p>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-blumea-blue">{t("analyzePage.viewAnalysis")}</span>

                  <span className="text-blumea-blue transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1 rtl:group-hover:translate-x-0">→</span>
                </div>
              </div>
            </AppLink>
          ))}
        </div>
      </section>

      {analyzeOpen && <AnalyzeModal onClose={() => setAnalyzeOpen(false)} />}

      {compareOpen && <ComparePicker onClose={() => setCompareOpen(false)} />}
    </div>
  );
}
