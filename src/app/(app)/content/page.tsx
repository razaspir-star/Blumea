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

type Filter = "all" | "youtube" | "tiktok";
const filters: Filter[] = ["all", "youtube", "tiktok"];

// Only real data: the videos Blumea has analyzed for this creator, with the
// numbers the platforms gave us. (The prototype's made-up list is gone.)
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

  useEffect(() => {
    let cancelled = false;
    loadDashboardData().then((data) => {
      if (!cancelled) setVideos(data.videos);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = (videos ?? [])
    .filter((video) => filter === "all" || video.platform === filter)
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">Content</h1>

          <p className="mt-2 text-blumea-slate">The videos Blumea has analyzed on your connected accounts.</p>
        </div>

        <button
          type="button"
          onClick={() => setAnalyzeOpen(true)}
          className="flex items-center gap-2 rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-blumea-blue hover:shadow-md"
        >
          <PlaySquare size={17} strokeWidth={1.8} />
          Analyze a video
        </button>
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
          const format = video.formatId ? formatLabel(video.formatId) : null;

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

                {format && (
                  <p className="mt-3">
                    <span className="rounded-full bg-blumea-mist px-2.5 py-1 text-xs font-medium text-blumea-slate">{format}</span>
                  </p>
                )}

                <div className="mt-auto pt-4">
                  <AppLink
                    href={`/analysis/${video.id}`}
                    className="text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
                  >
                    View analysis →
                  </AppLink>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {videos !== null && visible.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
          <p className="text-sm font-semibold text-blumea-navy">
            {videos.length === 0 ? "No analyzed videos yet." : "No analyzed videos on this platform yet."}
          </p>
          <p className="mt-1 text-sm text-blumea-slate">Pick a video and Blumea will read it for you.</p>
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
    </div>
  );
}
