"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import AppLink from "@/components/AppLink";
import CompareFrame from "@/components/CompareFrame";
import PlatformBadge from "@/components/PlatformBadge";
import VideoText from "@/components/VideoText";
import { loadDashboardData, type DashboardVideo } from "@/lib/dashboard-data";
import { USUAL_MIN_OTHERS, usualComparison } from "@/lib/compare-groups";
import { show } from "@/lib/compare-format";
import { useT } from "@/lib/i18n/client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function thumbOf(video: DashboardVideo): string | null {
  return video.platform === "youtube" ? `https://i.ytimg.com/vi/${video.platformVideoId}/mqdefault.jpg` : video.thumbnailUrl;
}

// A video against the creator's usual: the median of their other videos on the same platform.
export default function UsualPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const [videos, setVideos] = useState<DashboardVideo[] | null>(null);
  const valid = UUID.test(id);

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    loadDashboardData().then((data) => {
      if (!cancelled) setVideos(data.videos);
    });
    return () => {
      cancelled = true;
    };
  }, [valid]);

  if (!valid) notFound();

  const frame = (children: React.ReactNode) => (
    <CompareFrame title={t("compare2.usualTitle")} subtitle={t("compare2.usualSubtitle")} accessKey={`usual:${id}`}>
      {children}
    </CompareFrame>
  );

  if (videos === null) return frame(<p className="mt-8 text-sm text-blumea-slate">{t("compare.loading")}</p>);
  const video = videos.find((item) => item.id === id);
  if (!video) return frame(<p className="mt-8 text-sm text-blumea-slate">{t("compare.notFound")}</p>);

  const result = usualComparison(video, videos, t);
  const thumb = thumbOf(video);

  return frame(
    <>
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm">
        <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-blumea-mist to-slate-100">
          {thumb && <Image src={thumb} alt="" fill unoptimized sizes="56px" className="object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-blumea-navy">{video.title}</p>
          <div className="mt-1">
            <PlatformBadge platform={video.platform as "youtube" | "tiktok"} />
          </div>
          <AppLink href={`/analysis/${video.id}`} className="mt-1 inline-block text-xs font-semibold text-blumea-blue hover:opacity-70">
            {t("compare.openAnalysis")}
          </AppLink>
        </div>
      </div>

      {!result.enough ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm leading-6 text-blumea-slate">
          {t("compare2.usualNeed", { min: USUAL_MIN_OTHERS, count: result.others })}
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-blumea-slate">{t("compare2.usualBasis", { count: result.others })}</p>

          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
            <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-x-3 border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blumea-slate">
              <span />
              <span>{t("compare2.thisVideo")}</span>
              <span>{t("compare2.yourUsual")}</span>
              <span>{t("compare2.ratioCol")}</span>
            </div>
            {result.rows.map((row) => {
              const points = row.format === "percent";
              const diff = row.value !== null && row.usual !== null ? row.value - row.usual : null;
              const against = points
                ? diff === null ? "—" : t("compare2.points", { n: `${diff > 0 ? "+" : ""}${Math.round(diff)}` })
                : row.ratio === null ? "—" : `${row.ratio.toFixed(1).replace(/\.0$/, "")}×`;
              return (
                <div
                  key={row.key}
                  className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-x-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
                >
                  <span className="text-blumea-slate">{t(row.key)}</span>
                  <span className="font-semibold text-blumea-navy">
                    <span className="ltr-island">{show(row.value, row.format, t)}</span>
                  </span>
                  <span className="text-blumea-navy">
                    <span className="ltr-island">{show(row.usual, row.format, t)}</span>
                  </span>
                  <span className="text-blumea-slate">
                    <span className="ltr-island">{against}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <section className="mt-8 pb-6">
            <h2 className="text-xl font-semibold tracking-tight text-blumea-navy">{t("compare.stands")}</h2>
            <div className="mt-3 space-y-3">
              {result.statements.map((statement, index) => (
                <p key={index} className="rounded-2xl border border-blumea-blue/25 bg-white p-4 text-sm leading-6 text-blumea-navy shadow-sm">
                  <VideoText text={statement} />
                </p>
              ))}
            </div>
            {result.notes.map((note) => (
              <p key={note} className="mt-3 text-xs leading-5 text-blumea-slate">
                {note}
              </p>
            ))}
          </section>
        </>
      )}
    </>
  );
}
