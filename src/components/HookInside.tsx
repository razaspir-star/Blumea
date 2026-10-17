"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import AppLink from "@/components/AppLink";
import CompareFrame from "@/components/CompareFrame";
import VideoText from "@/components/VideoText";
import { loadDashboardData, type DashboardVideo } from "@/lib/dashboard-data";
import { GROUP_MIN, hookInside } from "@/lib/compare-groups";
import { hookInfoOf, type HookInfo } from "@/lib/compare-usual-deep";
import { show } from "@/lib/compare-format";
import { formatLabel } from "@/lib/format-library";
import { hookTypeLabel } from "@/lib/hook-library";
import { platformName } from "@/lib/platform-capabilities";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n/client";

// The videos that use one hook (on one platform, and optionally inside one format), best first, each with
// the words of its hook: which of them did best.
export default function HookInside({ platform: rawPlatform, hook, format }: { platform: string; hook: string; format?: string | null }) {
  const t = useT();
  const [videos, setVideos] = useState<DashboardVideo[] | null>(null);
  const [hooks, setHooks] = useState<Map<string, HookInfo>>(new Map());
  const platform = rawPlatform === "youtube" || rawPlatform === "tiktok" ? rawPlatform : null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const data = await loadDashboardData();
      const ids = data.videos.filter((v) => v.analyzed && v.hookTypeId === hook && v.platform === rawPlatform).map((v) => v.id);
      const map = new Map<string, HookInfo>();
      if (ids.length > 0) {
        const { data: rows } = await supabase.from("video_ai_profiles").select("video_id, fields").in("video_id", ids).eq("is_current", true);
        for (const row of rows ?? []) map.set(row.video_id as string, hookInfoOf(row.fields as Record<string, { value?: unknown }> | null));
      }
      if (cancelled) return;
      setHooks(map);
      setVideos(data.videos);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [hook, rawPlatform]);

  if (!platform) notFound();
  const hookName = hookTypeLabel(hook, t) ?? hook;
  const formatName = format ? (formatLabel(format, t) ?? format) : null;

  const frame = (children: React.ReactNode) => (
    <CompareFrame title={t("compare2.insideTitle", { hook: hookName })} subtitle={t("compare2.insideSubtitle", { platform: platformName(platform, t) })} accessKey={`group:inside:${platform}:${hook}:${format ?? "all"}`}>
      {formatName && (
        <p className="mt-3 inline-block rounded-full bg-blumea-mist px-3 py-1 text-xs font-semibold text-blumea-blue">
          {t("compare2.insideFormat", { format: formatName, platform: platformName(platform, t) })}
        </p>
      )}
      {children}
    </CompareFrame>
  );

  if (videos === null) return frame(<p className="mt-8 text-sm text-blumea-slate">{t("compare.loading")}</p>);
  const result = hookInside(videos, platform, hook, format ?? null, t);
  const cols = "grid grid-cols-[minmax(0,2.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-x-3";

  if (result.videos.length === 0) {
    return frame(<p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm leading-6 text-blumea-slate">{t("compare2.insideEmpty", { hook: hookName })}</p>);
  }

  const best = result.videos[0];
  const worst = result.videos[result.videos.length - 1];

  return frame(
    <>
      {result.few && <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">{t("compare2.insideFew", { count: result.videos.length, min: GROUP_MIN })}</p>}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        <div className={`${cols} border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blumea-slate`}>
          <span>{t("compare2.insideVideo")}</span>
          <span>{t("compare.metricViews")}</span>
          <span>{t("compare.metricLikes")}</span>
          <span>{t("compare.metricDuration")}</span>
        </div>
        {result.videos.map((video, index) => {
          const info = hooks.get(video.id);
          return (
            <div key={video.id} className={`${cols} border-b border-slate-100 px-4 py-3 text-sm last:border-b-0`}>
              <div className="min-w-0">
                <AppLink href={`/analysis/${video.id}`} className={`block truncate font-semibold hover:opacity-70 ${index === 0 ? "text-blumea-blue" : "text-blumea-navy"}`}>
                  {video.title}
                </AppLink>
                {info?.text && <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-blumea-slate">{t.locale === "he" ? `״${info.text}״` : `“${info.text}”`}</p>}
              </div>
              <span className="text-blumea-navy">
                <span className="ltr-island">{show(video.views, "count", t)}</span>
              </span>
              <span className="text-blumea-navy">
                <span className="ltr-island">{show(video.likes, "count", t)}</span>
              </span>
              <span className="text-blumea-navy">
                <span className="ltr-island">{show(video.durationSec, "seconds", t)}</span>
              </span>
            </div>
          );
        })}
      </div>

      <section className="mt-8 pb-6">
        <h2 className="text-xl font-semibold tracking-tight text-blumea-navy">{t("compare.stands")}</h2>
        <div className="mt-3 space-y-3">
          {result.statements.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm leading-6 text-blumea-slate">{t("compare2.insideOne", { hook: hookName })}</p>
          ) : (
            result.statements.map((statement, index) => (
              <p key={index} className="rounded-2xl border border-blumea-blue/25 bg-white p-4 text-sm leading-6 text-blumea-navy shadow-sm">
                <VideoText text={statement} />
              </p>
            ))
          )}
        </div>
        {best.id !== worst.id && (
          <p className="mt-3 text-sm">
            <AppLink href={`/compare/${best.id}/${worst.id}`} className="font-semibold text-blumea-blue hover:opacity-70">
              {t("compare2.insideCompareLink")}
            </AppLink>
          </p>
        )}
        <p className="mt-3 text-xs leading-5 text-blumea-slate">{t("compare2.insideNote", { count: result.videos.length })}</p>
      </section>
    </>
  );
}
