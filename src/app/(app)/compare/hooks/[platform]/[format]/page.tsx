"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import AppLink from "@/components/AppLink";
import CompareFrame from "@/components/CompareFrame";
import VideoText from "@/components/VideoText";
import { loadDashboardData, type DashboardVideo } from "@/lib/dashboard-data";
import { GROUP_MIN, hookRanking } from "@/lib/compare-groups";
import { show } from "@/lib/compare-format";
import { formatLabel } from "@/lib/format-library";
import { hookTypeLabel } from "@/lib/hook-library";
import { platformName } from "@/lib/platform-capabilities";
import { useT } from "@/lib/i18n/client";

// Which hook did best inside one format, on one platform: every hook used in that format with how many
// read videos it has and their typical numbers.
export default function BestHookPage({ params }: { params: Promise<{ platform: string; format: string }> }) {
  const { platform: rawPlatform, format } = use(params);
  const t = useT();
  const [videos, setVideos] = useState<DashboardVideo[] | null>(null);
  const platform = rawPlatform === "youtube" || rawPlatform === "tiktok" ? rawPlatform : null;

  useEffect(() => {
    let cancelled = false;
    loadDashboardData().then((data) => {
      if (!cancelled) setVideos(data.videos);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!platform) notFound();
  const formatName = formatLabel(format, t) ?? format;

  const frame = (children: React.ReactNode) => (
    <CompareFrame title={t("compare2.hookRankTitle", { format: formatName })} subtitle={t("compare2.hookRankSubtitle", { platform: platformName(platform, t) })} accessKey={`group:besthook:${platform}:${format}`}>
      {children}
    </CompareFrame>
  );

  if (videos === null) return frame(<p className="mt-8 text-sm text-blumea-slate">{t("compare.loading")}</p>);
  const result = hookRanking(videos, platform, format, t);
  const cols = "grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3";

  return frame(
    <>
      {result.rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm leading-6 text-blumea-slate">
          {t("compare2.hookRankEmpty", { format: formatName })}
        </p>
      ) : (
        <>
          {result.few && (
            <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">{t("compare2.hookRankFew", { min: GROUP_MIN })}</p>
          )}

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
            <div className={`${cols} border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blumea-slate`}>
              <span>{t("compare2.hookRankHook")}</span>
              <span>{t("compare2.hookRankCount")}</span>
              <span>{t("compare.metricViews")}</span>
              <span>{t("compare.metricLikes")}</span>
              <span>{t("compare.metricEngagement")}</span>
            </div>
            {result.rows.map((row) => {
              const best = result.usable[0]?.id === row.id && result.usable.length >= 2;
              return (
                <div key={row.id} className={`${cols} border-b border-slate-100 px-4 py-3 text-sm last:border-b-0`}>
                  <span className={best ? "font-semibold text-blumea-blue" : "text-blumea-navy"}>{hookTypeLabel(row.id, t) ?? row.id}</span>
                  <span className="text-blumea-slate">{row.count}</span>
                  <span className="text-blumea-navy">
                    <span className="ltr-island">{show(row.typicalViews, "count", t)}</span>
                  </span>
                  <span className="text-blumea-navy">
                    <span className="ltr-island">{show(row.typicalLikes, "count", t)}</span>
                  </span>
                  <span className="text-blumea-navy">
                    <span className="ltr-island">{show(row.typicalEngagement, "decimal", t)}</span>
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
            <p className="mt-3 text-xs leading-5 text-blumea-slate">{t("compare2.hookRankNote", { count: result.videos })}</p>
            {result.usable.length >= 2 && (
              <p className="mt-3 text-sm">
                <AppLink href={`/compare/hooks/${platform}/${format}/${result.usable[0].id}/${result.usable[1].id}`} className="font-semibold text-blumea-blue hover:opacity-70">
                  {t("compare2.hookRankCompareTop")}
                </AppLink>
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}
