"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AppLink from "@/components/AppLink";
import PageLoader from "@/components/PageLoader";
import PlatformBadge from "@/components/PlatformBadge";
import { loadDashboardData, type DashboardVideo } from "@/lib/dashboard-data";
import { parseComparisonKey } from "@/lib/compare-history";
import { formatLabel } from "@/lib/format-library";
import { hookTypeLabel } from "@/lib/hook-library";
import { platformName } from "@/lib/platform-capabilities";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n/client";

type AnalysisRow = { videoId: string; at: string };
type ComparisonRow = { kind: string; key: string; at: string };

const SHOWN = 12;

function thumbnailOf(video: DashboardVideo): string | null {
  return video.platform === "youtube" ? `https://i.ytimg.com/vi/${video.platformVideoId}/maxresdefault.jpg` : video.thumbnailUrl;
}

// The creator's own work in one place: the videos Blumea read most recently, and the comparisons opened most recently.
export default function HistoryPage() {
  const t = useT();
  const [videos, setVideos] = useState<DashboardVideo[] | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisRow[] | null>(null);
  const [comparisons, setComparisons] = useState<ComparisonRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadDashboardData(),
      supabase.from("video_ai_profiles").select("video_id, created_at").eq("is_current", true).order("created_at", { ascending: false }).limit(SHOWN),
      supabase.from("compare_events").select("kind, key, created_at").in("kind", ["regular", "deep"]).order("created_at", { ascending: false }).limit(SHOWN),
    ]).then(([data, profiles, events]) => {
      if (cancelled) return;
      setVideos(data.videos);
      setAnalyses((profiles.data ?? []).map((row) => ({ videoId: row.video_id as string, at: row.created_at as string })));
      setComparisons((events.data ?? []).map((row) => ({ kind: row.kind as string, key: row.key as string, at: row.created_at as string })));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!videos || !analyses || !comparisons) return <PageLoader />;

  const byId = new Map(videos.map((video) => [video.id, video]));
  const title = (id: string) => byId.get(id)?.title ?? t("history.unknownVideo");
  const dateOf = (iso: string) => new Date(iso).toLocaleDateString(t.locale === "he" ? "he-IL" : "en-US", { month: "short", day: "numeric", year: "numeric" });
  const formatName = (id: string) => formatLabel(id, t) ?? id;
  const hookName = (id: string) => hookTypeLabel(id, t) ?? id;

  const describe = (row: ComparisonRow): { label: string; href: string } | null => {
    const parsed = parseComparisonKey(row.key);
    if (!parsed) return null;
    const where = (platform: string) => platformName(platform, t);
    switch (parsed.type) {
      case "pair":
        return { href: parsed.href, label: t("history.cmpPair", { a: title(parsed.ids[0]), b: title(parsed.ids[1]) }) };
      case "usual":
        return { href: parsed.href, label: t("history.cmpUsual", { title: title(parsed.id) }) };
      case "platforms":
        return { href: parsed.href, label: t("history.cmpPlatforms") };
      case "group": {
        const names = parsed.by === "format" ? [formatName(parsed.a), formatName(parsed.b)] : [hookName(parsed.a), hookName(parsed.b)];
        const base = t(parsed.by === "format" ? "history.cmpFormats" : "history.cmpHooks", { a: names[0], b: names[1], platform: where(parsed.platform) });
        return { href: parsed.href, label: parsed.format ? `${base} · ${formatName(parsed.format)}` : base };
      }
      case "bestHook":
        return { href: parsed.href, label: t("history.cmpBestHook", { format: formatName(parsed.format), platform: where(parsed.platform) }) };
      case "inside":
        return {
          href: parsed.href,
          label: t("history.cmpInside", { hook: hookName(parsed.hook), platform: where(parsed.platform) }) + (parsed.format ? ` · ${formatName(parsed.format)}` : ""),
        };
    }
  };

  const shownAnalyses = analyses.filter((row) => byId.has(row.videoId));
  const shownComparisons = comparisons.map((row) => ({ row, info: describe(row) })).filter((entry) => entry.info !== null);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">{t("history.title")}</h1>
      <p className="mt-2 text-blumea-slate">{t("history.subtitle")}</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-blumea-navy">{t("history.analysesTitle")}</h2>
        {shownAnalyses.length === 0 ? (
          <div className="mt-3 rounded-3xl border border-dashed border-slate-300 bg-white/60 p-5">
            <p className="text-sm leading-6 text-blumea-slate">{t("history.analysesEmpty")}</p>
            <AppLink href="/analyze" className="mt-3 inline-block text-sm font-semibold text-blumea-blue hover:opacity-70">
              {t("history.analyzeLink")}
            </AppLink>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {shownAnalyses.map((row) => {
              const video = byId.get(row.videoId)!;
              const thumbnail = thumbnailOf(video);
              const format = video.formatId ? formatLabel(video.formatId, t) : null;
              return (
                <li key={row.videoId}>
                  <AppLink
                    href={`/analysis/${video.id}`}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm transition-colors hover:border-blumea-blue/40"
                  >
                    <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      {thumbnail && <Image src={thumbnail} alt="" fill unoptimized sizes="56px" className="object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <PlatformBadge platform={video.platform as "youtube" | "tiktok"} />
                        {format && <span className="text-xs font-medium text-blumea-slate">{format}</span>}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-blumea-navy">{video.title}</p>
                      <p className="mt-0.5 text-xs text-blumea-slate">{t("history.analyzedOn", { date: dateOf(row.at) })}</p>
                    </div>
                  </AppLink>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10 pb-6">
        <h2 className="text-lg font-semibold text-blumea-navy">{t("history.comparisonsTitle")}</h2>
        {shownComparisons.length === 0 ? (
          <div className="mt-3 rounded-3xl border border-dashed border-slate-300 bg-white/60 p-5">
            <p className="text-sm leading-6 text-blumea-slate">{t("history.comparisonsEmpty")}</p>
            <AppLink href="/content" className="mt-3 inline-block text-sm font-semibold text-blumea-blue hover:opacity-70">
              {t("history.compareLink")}
            </AppLink>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {shownComparisons.map(({ row, info }) => (
              <li key={`${row.kind}-${row.key}`}>
                <AppLink
                  href={info!.href}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm transition-colors hover:border-blumea-blue/40"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold text-blumea-navy">{info!.label}</p>
                    <p className="mt-0.5 text-xs text-blumea-slate">
                      {row.kind === "deep" ? `${t("history.deep")} · ` : ""}
                      {dateOf(row.at)}
                    </p>
                  </div>
                </AppLink>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
