"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AppLink from "@/components/AppLink";
import { GitCompareArrows, PlaySquare } from "lucide-react";
import AnalyzeModal from "@/components/AnalyzeModal";
import ComparePicker from "@/components/ComparePicker";
import PlatformBadge from "@/components/PlatformBadge";
import { loadDashboardData, type DashboardVideo } from "@/lib/dashboard-data";
import { formatLabel } from "@/lib/format-library";
import { formatCount } from "@/lib/format";
import { platformLabels } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import type { AnalysisUsage } from "@/lib/analysis-limit";
import { useT } from "@/lib/i18n/client";

type Filter = "all" | "youtube" | "tiktok";
const filters: Filter[] = ["all", "youtube", "tiktok"];

// Only real data: the creator's videos as the First Scan found them (numbers from
// the platform), and which of them Blumea has read with AI.
function thumbnailOf(video: DashboardVideo): string | null {
  return video.platform === "youtube" ? `https://i.ytimg.com/vi/${video.platformVideoId}/mqdefault.jpg` : video.thumbnailUrl;
}

function publishedLabel(iso: string | null, locale: string): string {
  return iso
    ? new Date(iso).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";
}

export default function ContentPage() {
  const t = useT();
  const [videos, setVideos] = useState<DashboardVideo[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [analyzeTarget, setAnalyzeTarget] = useState<DashboardVideo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [usage, setUsage] = useState<AnalysisUsage | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDashboardData().then((data) => {
      if (!cancelled) setVideos(data.videos);
    });
    // How many AI analyses are left this month (monthly cap, src/lib/analysis-limit.ts).
    supabase.auth.getSession().then(({ data: session }) =>
      fetch("/api/usage", { headers: { Authorization: `Bearer ${session.session?.access_token ?? ""}` } })
        .then((response) => (response.ok ? response.json() : null))
        .then((body) => {
          if (!cancelled && body) setUsage(body);
        })
        .catch(() => null)
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Looks for new videos on the connected accounts (numbers only, no AI cost).
  async function refreshVideos() {
    setRefreshing(true);
    const { data: session } = await supabase.auth.getSession();
    await fetch("/api/scan", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.session?.access_token ?? ""}` },
    }).catch(() => null);
    const data = await loadDashboardData();
    setVideos(data.videos);
    setRefreshing(false);
  }

  const visible = (videos ?? [])
    .filter((video) => filter === "all" || video.platform === filter)
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">{t("content.title")}</h1>

          <p className="mt-2 text-blumea-slate">
            {t("content.subtitle")}
          </p>

          {usage && usage.cap !== null && (
            <p className="mt-1 text-sm text-blumea-slate">
              {usage.used >= usage.cap
                ? t("content.usageUsedAll", {
                    cap: usage.cap,
                    date: new Date(usage.resetsOn).toLocaleDateString(t.locale === "he" ? "he-IL" : "en-US", { month: "long", day: "numeric", timeZone: "UTC" }),
                  })
                : t("content.usageSome", { used: usage.used, cap: usage.cap })}
            </p>
          )}

          {usage?.plan === "free" && (
            <p className="mt-1 text-sm text-blumea-slate">
              {t("content.freeScan")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refreshVideos}
            disabled={refreshing}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-blumea-navy transition-colors hover:border-blumea-blue hover:text-blumea-blue disabled:opacity-60"
          >
            {refreshing ? t("content.refreshing") : t("content.refresh")}
          </button>

          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-blumea-navy transition-colors hover:border-blumea-blue hover:text-blumea-blue"
          >
            <GitCompareArrows size={17} strokeWidth={1.8} />
            {t("compare.compareButton")}
          </button>

          <button
            type="button"
            onClick={() => setAnalyzeOpen(true)}
            className="flex items-center gap-2 rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-blumea-blue hover:shadow-md"
          >
            <PlaySquare size={17} strokeWidth={1.8} />
            {t("content.analyze")}
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            aria-pressed={filter === item}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === item
                ? "bg-blumea-navy text-white"
                : "border border-slate-200 bg-white text-blumea-slate hover:border-blumea-blue hover:text-blumea-navy"
            }`}
          >
            {item === "all" ? t("content.filterAll") : platformLabels[item]}
          </button>
        ))}
      </div>

      {videos === null && <p className="mt-8 text-sm text-blumea-slate">{t("content.loading")}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 pb-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((video) => {
          const thumbnail = thumbnailOf(video);
          const format = video.analyzed && video.formatId ? formatLabel(video.formatId, t) : null;

          return (
            <div
              key={video.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm"
            >
              <div className="relative aspect-[9/12] overflow-hidden bg-slate-100">
                {thumbnail && (
                  <Image src={thumbnail} alt={video.title} fill unoptimized sizes="25vw" className="object-cover" />
                )}

                <div className="absolute start-3 top-3">
                  <PlatformBadge platform={video.platform as "youtube" | "tiktok"} className="bg-white/90 shadow-sm" />
                </div>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <p className="truncate text-sm font-semibold text-blumea-navy">{video.title}</p>

                <p className="mt-1 text-xs text-blumea-slate">
                  {publishedLabel(video.publishedAt, t.locale)}
                  {video.views !== null ? ` · ${t("content.views", { count: formatCount(video.views) })}` : ""}
                  {video.likes !== null ? ` · ${t("content.likes", { count: formatCount(video.likes) })}` : ""}
                </p>

                <p className="mt-3">
                  {video.analyzed ? (
                    format && (
                      <span className="rounded-full bg-blumea-mist px-2.5 py-1 text-xs font-medium text-blumea-slate">{format}</span>
                    )
                  ) : (
                    <span className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-400">
                      {t("content.numbersOnly")}
                    </span>
                  )}
                </p>

                <div className="mt-auto pt-4">
                  {video.analyzed ? (
                    <AppLink
                      href={`/analysis/${video.id}`}
                      className="text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
                    >
                      {t("content.viewAnalysis")}
                    </AppLink>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAnalyzeTarget(video)}
                      className="text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
                    >
                      {t("content.analyzeThis")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {videos !== null && visible.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
          <p className="text-sm font-semibold text-blumea-navy">
            {videos.length === 0 ? t("content.emptyNone") : t("content.emptyPlatform")}
          </p>
          <p className="mt-1 text-sm text-blumea-slate">
            {t("content.emptyHint")}
          </p>
          <button
            type="button"
            onClick={() => setAnalyzeOpen(true)}
            className="mt-4 rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
          >
            {t("content.analyze")}
          </button>
        </div>
      )}

      {analyzeOpen && <AnalyzeModal onClose={() => setAnalyzeOpen(false)} />}

      {compareOpen && <ComparePicker onClose={() => setCompareOpen(false)} />}

      {analyzeTarget && (
        <AnalyzeModal
          onClose={() => setAnalyzeTarget(null)}
          startReal={{
            platform: analyzeTarget.platform === "tiktok" ? "tiktok" : "youtube",
            platformVideoId: analyzeTarget.platform === "youtube" ? analyzeTarget.platformVideoId : undefined,
          }}
        />
      )}
    </div>
  );
}
