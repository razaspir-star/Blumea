"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import AppLink from "@/components/AppLink";
import AnalyzeModal from "@/components/AnalyzeModal";
import CompareFrame from "@/components/CompareFrame";
import PlatformBadge from "@/components/PlatformBadge";
import VideoText from "@/components/VideoText";
import { loadDashboardData, type DashboardVideo } from "@/lib/dashboard-data";
import { USUAL_MIN_OTHERS, usualComparison, type UsualRow } from "@/lib/compare-groups";
import { hookInfoOf, usualDeep, type HookInfo } from "@/lib/compare-usual-deep";
import { show } from "@/lib/compare-format";
import { askCompareAccess } from "@/lib/use-compare-access";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n/client";
import { GROUP_MIN } from "@/lib/compare-groups";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function thumbOf(video: DashboardVideo): string | null {
  return video.platform === "youtube" ? `https://i.ytimg.com/vi/${video.platformVideoId}/maxresdefault.jpg` : video.thumbnailUrl;
}

function PoolTable({ rows, poolLabel }: { rows: UsualRow[]; poolLabel: string }) {
  const t = useT();
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-x-3 border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blumea-slate">
        <span />
        <span>{t("compare2.thisVideo")}</span>
        <span>{poolLabel}</span>
        <span>{t("compare2.ratioCol")}</span>
      </div>
      {rows.map((row) => {
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
  );
}

// A video against the creator's other videos on the same platform. In depth (a button): against the other
// videos of the same format, and how its hook did among them.
export default function UsualPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const [videos, setVideos] = useState<DashboardVideo[] | null>(null);
  const [version, setVersion] = useState(0);
  const [deepRun, setDeepRun] = useState(false);
  const [deepNote, setDeepNote] = useState<string | null>(null);
  const [hooks, setHooks] = useState<Map<string, HookInfo>>(new Map());
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
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
  }, [valid, version]);

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
  const needsUpload = video.platform === "tiktok" && !video.analyzed;

  async function runDeep(current: DashboardVideo) {
    setDeepNote(null);
    const access = await askCompareAccess("deep", `usual:${current.id}`);
    if (!access || !access.allowed) {
      const date = access ? new Date(access.resetsOn).toLocaleDateString(t.locale === "he" ? "he-IL" : "en-US", { month: "long", day: "numeric", timeZone: "UTC" }) : "";
      setDeepNote(access ? t("compare.deepCapReached", { cap: access.cap ?? 0, date }) : t("compare.deepAccessFailed"));
      return;
    }

    // A YouTube video that was only scanned is read now (it uses one of the creator's analyses).
    let list = videos as DashboardVideo[];
    if (current.platform === "youtube" && !current.analyzed) {
      setReadError(null);
      setReading(true);
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch("/api/analyze/youtube", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.session?.access_token ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: current.platformVideoId }),
      }).catch(() => null);
      if (!response || !response.ok) {
        const body = response ? await response.json().catch(() => null) : null;
        setReadError(t("compare.readFailed", { title: current.title, reason: body?.error ?? "" }));
        setReading(false);
        return;
      }
      list = (await loadDashboardData()).videos;
      setVideos(list);
      setReading(false);
    }

    // The hooks (as written and said) of this video and the read videos of the same format.
    const fresh = list.find((item) => item.id === current.id);
    const ids = list
      .filter((item) => item.platform === current.platform && item.analyzed && (item.id === current.id || (fresh?.formatId && item.formatId === fresh.formatId)))
      .map((item) => item.id);
    const map = new Map<string, HookInfo>();
    if (ids.length > 0) {
      const { data } = await supabase.from("video_ai_profiles").select("video_id, fields").in("video_id", ids).eq("is_current", true);
      for (const row of data ?? []) map.set(row.video_id as string, hookInfoOf(row.fields as Record<string, { value?: unknown }> | null));
    }
    setHooks(map);
    setDeepRun(true);
    setTimeout(() => document.getElementById("deep-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }

  const deep = deepRun && video.analyzed ? usualDeep(video, videos, hooks, t) : null;

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
          <PoolTable rows={result.rows} poolLabel={t("compare2.yourUsual")} />

          <section className="mt-8">
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

      <p className="mt-5 text-sm leading-6 text-blumea-slate">
        {t("compare2.deepOtherPlatform")}{" "}
        <AppLink href="/compare/platforms" className="font-semibold text-blumea-blue hover:opacity-70">
          {t("compare2.deepOtherPlatformLink")}
        </AppLink>
      </p>

      {reading && (
        <p className="mt-4 rounded-2xl border border-blumea-blue/30 bg-blumea-mist px-4 py-3 text-sm leading-6 text-blumea-navy">
          {t("compare.readingNow", { title: `${t.locale === "he" ? "״" : "“"}${video.title}${t.locale === "he" ? "״" : "”"}` })}
        </p>
      )}
      {readError && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">{readError}</p>}

      {!deepRun && (
        <div className="blumea-step mt-6 rounded-2xl border border-blumea-blue/25 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-blumea-navy">{t("compare.deepTitle")}</p>
          <p className="mt-1 text-sm leading-6 text-blumea-slate">{t("compare2.usualDeepBody")}</p>
          {deepNote && <p className="mt-2 text-sm text-rose-700">{deepNote}</p>}

          {video.platform === "youtube" && !video.analyzed && <p className="mt-2 text-xs leading-5 text-blumea-slate">{t("compare.stepYoutubeRead")}</p>}
          {needsUpload && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2.5">
              <p className="min-w-0 flex-1 text-xs leading-5 text-blumea-slate">{t("compare2.usualUploadHint")}</p>
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="rounded-full bg-blumea-navy px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blumea-blue"
              >
                {t("compare.stepUploadVideo")}
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={needsUpload || reading}
            onClick={() => runDeep(video)}
            className={
              !needsUpload && !reading
                ? "mt-4 rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
                : "mt-4 cursor-not-allowed rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-400"
            }
          >
            {needsUpload ? t("compare.deepGoWait") : t("compare.deepGo")}
          </button>
        </div>
      )}

      {deep && (
        <div id="deep-results" className="blumea-reveal-down scroll-mt-6 pb-8">
          <h2 className="mt-10 text-2xl font-semibold tracking-tight text-blumea-navy">{t("compare.deepResultTitle")}</h2>
          {!deep.formatId ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm leading-6 text-blumea-slate">{t("compare2.formatUnknown")}</p>
          ) : !deep.enough ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm leading-6 text-blumea-slate">
              {t("compare2.formatNeed", { min: GROUP_MIN, format: deep.formatName ?? "", count: deep.group })}
            </p>
          ) : (
            <>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-blumea-navy">{t("compare2.formatTitle", { format: deep.formatName ?? "" })}</h3>
              <p className="mt-1 text-sm text-blumea-slate">{t("compare2.formatBasis", { count: deep.group - 1, format: deep.formatName ?? "" })}</p>
              <PoolTable rows={deep.rows} poolLabel={deep.formatName ?? ""} />
              <div className="mt-4 space-y-3">
                {[...deep.statements, ...deep.hookStatements].map((statement, index) => (
                  <p key={index} className="rounded-2xl border border-blumea-blue/25 bg-white p-4 text-sm leading-6 text-blumea-navy shadow-sm">
                    <VideoText text={statement} />
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {uploadOpen && (
        <AnalyzeModal
          onClose={() => setUploadOpen(false)}
          startReal={{ platform: "tiktok", platformVideoId: video.platformVideoId }}
          onTiktokAnalyzed={() => {
            setUploadOpen(false);
            setVersion((current) => current + 1);
          }}
        />
      )}
    </>
  );
}
