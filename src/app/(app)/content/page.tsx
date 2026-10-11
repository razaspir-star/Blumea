"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AppLink from "@/components/AppLink";
import { PlaySquare } from "lucide-react";
import AnalyzeModal from "@/components/AnalyzeModal";
import PlatformBadge from "@/components/PlatformBadge";
import { loadDashboardData, type DashboardVideo } from "@/lib/dashboard-data";
import { formatLabel } from "@/lib/format-library";
import { formatCount } from "@/lib/format";
import { platformLabels } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import type { AnalysisUsage } from "@/lib/analysis-limit";

type Filter = "all" | "youtube" | "tiktok";
const filters: Filter[] = ["all", "youtube", "tiktok"];

// Only real data: the creator's videos as the First Scan found them (numbers from
// the platform), and which of them Blumea has read with AI.
function thumbnailOf(video: DashboardVideo): string | null {
  return video.platform === "youtube" ? `https://i.ytimg.com/vi/${video.platformVideoId}/mqdefault.jpg` : null;
}

function publishedLabel(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
}

export default function ContentPage() {
  const [videos, setVideos] = useState<DashboardVideo[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
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
          <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">Content</h1>

          <p className="mt-2 text-blumea-slate">
            Your videos, with the numbers each platform reports. Analyze one to see what Blumea understood.
          </p>

          {usage && usage.cap !== null && (
            <p className="mt-1 text-sm text-blumea-slate">
              {usage.used >= usage.cap
                ? `You've used all ${usage.cap} free analyses this month. They start over on ${new Date(usage.resetsOn).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}.`
                : `${usage.used} of ${usage.cap} free analyses used this month.`}
            </p>
          )}

          {usage?.plan === "free" && (
            <p className="mt-1 text-sm text-blumea-slate">
              Blumea shows your 20 most recent videos on each platform. Blumea Pro reads more.
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
            {refreshing ? "Looking…" : "Refresh my videos"}
          </button>

          <button
            type="button"
            onClick={() => setAnalyzeOpen(true)}
            className="flex items-center gap-2 rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-blumea-blue hover:shadow-md"
          >
            <PlaySquare size={17} strokeWidth={1.8} />
            Analyze a video
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
            {item === "all" ? "All platforms" : platformLabels[item]}
          </button>
        ))}
      </div>

      {videos === null && <p className="mt-8 text-sm text-blumea-slate">Loading your videos…</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 pb-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((video) => {
          const thumbnail = thumbnailOf(video);
          const format = video.analyzed && video.formatId ? formatLabel(video.formatId) : null;

          return (
            <div
              key={video.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm"
            >
              <div className="relative aspect-[9/12] overflow-hidden bg-slate-100">
                {thumbnail && (
                  <Image src={thumbnail} alt={video.title} fill unoptimized sizes="25vw" className="object-cover" />
                )}

                <div className="absolute left-3 top-3">
                  <PlatformBadge platform={video.platform as "youtube" | "tiktok"} className="bg-white/90 shadow-sm" />
                </div>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <p className="truncate text-sm font-semibold text-blumea-navy">{video.title}</p>

                <p className="mt-1 text-xs text-blumea-slate">
                  {publishedLabel(video.publishedAt)}
                  {video.views !== null ? ` · ${formatCount(video.views)} views` : ""}
                  {video.likes !== null ? ` · ${formatCount(video.likes)} likes` : ""}
                </p>

                <p className="mt-3">
                  {video.analyzed ? (
                    format && (
                      <span className="rounded-full bg-blumea-mist px-2.5 py-1 text-xs font-medium text-blumea-slate">{format}</span>
                    )
                  ) : (
                    <span className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-400">
                      Numbers only
                    </span>
                  )}
                </p>

                <div className="mt-auto pt-4">
                  {video.analyzed ? (
                    <AppLink
                      href={`/analysis/${video.id}`}
                      className="text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
                    >
                      View analysis →
                    </AppLink>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAnalyzeTarget(video)}
                      className="text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
                    >
                      Analyze this video →
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
            {videos.length === 0 ? "No videos yet." : "No videos on this platform yet."}
          </p>
          <p className="mt-1 text-sm text-blumea-slate">
            Connect an account in Connections, then press &quot;Refresh my videos&quot;, or pick a video to analyze.
          </p>
          <button
            type="button"
            onClick={() => setAnalyzeOpen(true)}
            className="mt-4 rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
          >
            Analyze a video
          </button>
        </div>
      )}

      {analyzeOpen && <AnalyzeModal onClose={() => setAnalyzeOpen(false)} />}

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
