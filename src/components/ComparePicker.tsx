"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import Modal from "@/components/Modal";
import { PlatformIcon } from "@/components/PlatformBadge";
import { useAppRouter } from "@/lib/use-app-router";
import { loadDashboardData, type DashboardVideo } from "@/lib/dashboard-data";
import { useT } from "@/lib/i18n/client";
import { platformLabels } from "@/lib/mock-data";

function thumbOf(video: DashboardVideo): string | null {
  return video.platform === "youtube" ? `https://i.ytimg.com/vi/${video.platformVideoId}/mqdefault.jpg` : video.thumbnailUrl;
}

// Choose two of your own videos (from the same platform) and open the comparison.
// Starts with the first one chosen when it is opened from a video's own page.
export default function ComparePicker({ onClose, initialA }: { onClose: () => void; initialA?: string }) {
  const t = useT();
  const router = useAppRouter();
  const [videos, setVideos] = useState<DashboardVideo[] | null>(null);
  const [aId, setAId] = useState<string | null>(initialA ?? null);
  const [bId, setBId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDashboardData().then((data) => {
      if (!cancelled) setVideos([...data.videos].sort((x, y) => (y.publishedAt ?? "").localeCompare(x.publishedAt ?? "")));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const a = videos?.find((video) => video.id === aId) ?? null;
  // Views and watch time mean different things on different platforms: the second video
  // is picked from the first one's platform.
  const options = (videos ?? []).filter((video) => video.id !== aId && (!a || video.platform === a.platform));
  const enough = videos !== null && videos.length >= 2;

  function pick(video: DashboardVideo) {
    if (!a) {
      setAId(video.id);
      setBId(null);
    } else {
      setBId(video.id);
    }
  }

  return (
    <Modal kicker={t("compare.pickerKicker")} title={t("compare.pickerTitle")} onClose={onClose}>
      {videos === null && <p className="mt-6 text-sm text-blumea-slate">{t("compare.loading")}</p>}

      {videos !== null && !enough && <p className="mt-6 text-sm text-blumea-slate">{t("compare.needTwo")}</p>}

      {enough && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-blumea-navy">{a ? t("compare.pickSecond") : t("compare.pickFirst")}</p>
          <p className="mt-1 text-xs leading-5 text-blumea-slate">{t("compare.samePlatform")}</p>

          {a && (
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-blumea-blue/30 bg-blumea-mist/60 p-2.5">
              <PlatformIcon platform={a.platform as "youtube" | "tiktok"} size={14} />
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-blumea-navy">
                <span className="me-2 text-xs font-semibold uppercase tracking-wide text-blumea-blue">{t("compare.first")}</span>
                {a.title}
              </p>
              <button
                type="button"
                onClick={() => {
                  setAId(null);
                  setBId(null);
                }}
                className="shrink-0 text-xs font-semibold text-blumea-blue hover:opacity-70"
              >
                {t("compare.change")}
              </button>
            </div>
          )}

          <div className="mt-4 grid max-h-[340px] grid-cols-2 gap-3 overflow-y-auto pe-1 sm:grid-cols-3">
            {(a ? options : videos).map((video) => {
              const thumb = thumbOf(video);
              const selected = bId === video.id;
              return (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => pick(video)}
                  className={`group overflow-hidden rounded-2xl bg-white text-start transition-all ${
                    selected ? "border-2 border-blumea-blue shadow-md" : "border border-slate-200 shadow-sm hover:border-blumea-blue/40 hover:shadow-md"
                  }`}
                >
                  <div className="relative aspect-[9/12] overflow-hidden bg-slate-100">
                    {thumb && <Image src={thumb} alt="" fill unoptimized sizes="200px" className="object-cover" />}
                    <div className="absolute start-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-blumea-navy shadow-sm">
                      <PlatformIcon platform={video.platform as "youtube" | "tiktok"} size={11} />
                      {platformLabels[video.platform as "youtube" | "tiktok"]}
                    </div>
                    {selected && (
                      <div className="absolute end-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blumea-blue text-white shadow-sm">
                        <Check size={14} strokeWidth={2.4} />
                      </div>
                    )}
                  </div>
                  <p className="truncate p-2.5 text-xs font-semibold text-blumea-navy">{video.title}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              disabled={!aId || !bId}
              onClick={() => aId && bId && router.push(`/compare/${aId}/${bId}`)}
              className={
                aId && bId
                  ? "rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
                  : "cursor-not-allowed rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-400"
              }
            >
              {t("compare.go")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
