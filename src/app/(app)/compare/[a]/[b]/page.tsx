"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import AppLink from "@/components/AppLink";
import AnalyzeModal from "@/components/AnalyzeModal";
import ComparePicker from "@/components/ComparePicker";
import PlatformBadge from "@/components/PlatformBadge";
import VideoText from "@/components/VideoText";
import { useProfile } from "@/components/AppShell";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { loadCompareVideo, type CompareVideo } from "@/lib/compare-data";
import { supabase } from "@/lib/supabase";
import VideoRef from "@/components/VideoText";
import { buildComparison, type MetricFormat, type MetricRow } from "@/lib/compare-insights";
import { videoRef } from "@/lib/video-ref";
import { formatCount, formatTime } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { platformName } from "@/lib/platform-capabilities";
import type { Translator } from "@/lib/i18n/translate";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function show(value: number | string | null, format: MetricFormat, t: Translator): string {
  if (value === null) return t("compare.notAvailable");
  if (typeof value === "string") {
    if (format === "date") return new Date(value).toLocaleDateString(t.locale === "he" ? "he-IL" : "en-US", { month: "short", day: "numeric", year: "numeric" });
    return value;
  }
  switch (format) {
    case "count":
      return formatCount(value);
    case "percent":
      return `${Math.round(value)}%`;
    case "seconds":
      return t("compare.seconds", { n: Math.round(value) });
    case "clock":
      return formatTime(value);
    default:
      return value.toFixed(2).replace(/\.?0+$/, "");
  }
}

// Which side wins on a row: only when both numbers exist and are clearly apart.
function leader(row: MetricRow): "a" | "b" | null {
  if (row.better !== "higher" || typeof row.a !== "number" || typeof row.b !== "number") return null;
  const hi = Math.max(row.a, row.b);
  const lo = Math.min(row.a, row.b);
  if (hi <= 0 || (lo > 0 && hi / lo < 1.1)) return null;
  return row.a > row.b ? "a" : "b";
}

function VideoCard({ video, label }: { video: CompareVideo; label: string }) {
  const t = useT();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm">
      <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-blumea-mist to-slate-100">
        {video.thumbnailUrl && <Image src={video.thumbnailUrl} alt="" fill unoptimized sizes="56px" className="object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-blumea-blue">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-blumea-navy">{video.title}</p>
        <div className="mt-1 flex items-center gap-2">
          <PlatformBadge platform={video.platform as "youtube" | "tiktok"} />
        </div>
        <AppLink href={`/analysis/${video.id}`} className="mt-1 inline-block text-xs font-semibold text-blumea-blue hover:opacity-70">
          {t("compare.openAnalysis")}
        </AppLink>
      </div>
    </div>
  );
}

export default function ComparePage({ params }: PageProps<"/compare/[a]/[b]">) {
  const { a: idA, b: idB } = use(params);
  const t = useT();
  const profile = useProfile();
  const unlocked = profile.plan === "pro" || profile.plan === "owner";
  const [videos, setVideos] = useState<{ a: CompareVideo | null; b: CompareVideo | null } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // What Blumea is reading right now so the comparison can say how a video is built, and why a read failed.
  const [reading, setReading] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  // TikTok: the regular comparison uses numbers; "in-depth" also needs both videos read (uploaded once).
  const [deep, setDeep] = useState(false);
  const [uploadFor, setUploadFor] = useState<CompareVideo | null>(null);
  const [version, setVersion] = useState(0);
  const valid = UUID.test(idA) && UUID.test(idB);

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;

    async function run() {
      const [a, b] = await Promise.all([loadCompareVideo(idA), loadCompareVideo(idB)]);
      if (cancelled) return;
      setVideos({ a, b });

      // A YouTube video that was only scanned (numbers, no AI reading) is read now, so the
      // "how they are built" part is complete. Not for a locked preview: that must not
      // spend the creator's analyses. TikTok videos need an upload, so they get a hint.
      if (!unlocked || !a || !b) return;
      const toRead = [a, b].filter((video) => video.platform === "youtube" && video.fields === null);
      if (toRead.length === 0) return;

      const { data: session } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session.session?.access_token ?? ""}`, "Content-Type": "application/json" };
      for (const video of toRead) {
        setReading(video.title);
        const response = await fetch("/api/analyze/youtube", {
          method: "POST",
          headers,
          body: JSON.stringify({ videoId: video.platformVideoId }),
        }).catch(() => null);
        if (cancelled) return;
        if (!response || !response.ok) {
          const body = response ? await response.json().catch(() => null) : null;
          setReadError(t("compare.readFailed", { title: video.title, reason: body?.error ?? "" }));
          setReading(null);
          return;
        }
      }
      const [a2, b2] = await Promise.all([loadCompareVideo(idA), loadCompareVideo(idB)]);
      if (cancelled) return;
      setVideos({ a: a2, b: b2 });
      setReading(null);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [idA, idB, valid, unlocked, t, version]);

  if (!valid) notFound();

  const header = (
    <>
      <AppLink href="/content" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70">
        {t("compare.back")}
      </AppLink>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">{t("compare.title")}</h1>
      <p className="mt-2 text-blumea-slate">{t("compare.subtitle")}</p>
    </>
  );

  if (videos === null) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        {header}
        <p className="mt-8 text-sm text-blumea-slate">{t("compare.loading")}</p>
      </div>
    );
  }

  const { a, b } = videos;
  if (!a || !b) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        {header}
        <p className="mt-8 text-sm text-blumea-slate">{t("compare.notFound")}</p>
      </div>
    );
  }

  const mixed = a.platform !== b.platform;
  const comparison = buildComparison(a, b, t, mixed);
  const tiktokPair = a.platform === "tiktok" || b.platform === "tiktok";
  const bothRead = a.fields !== null && b.fields !== null;
  // YouTube videos are read automatically; a TikTok pair is in-depth once both are read or the creator asks for it.
  const showBuilt = !tiktokPair || bothRead || deep;

  const body = (
    <>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <VideoCard video={a} label={t("compare.videoA")} />
        <VideoCard video={b} label={t("compare.videoB")} />
      </div>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="mt-3 text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
      >
        {t("compare.chooseOther")}
      </button>

      {reading && (
        <p className="mt-4 rounded-2xl border border-blumea-blue/30 bg-blumea-mist px-4 py-3 text-sm leading-6 text-blumea-navy">
          {t("compare.readingNow", { title: `${t.locale === "he" ? "״" : "“"}${reading}${t.locale === "he" ? "״" : "”"}` })}
        </p>
      )}
      {readError && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">{readError}</p>}
      {unlocked && tiktokPair && !bothRead && !deep && (
        <div className="mt-4 rounded-2xl border border-blumea-blue/25 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-blumea-navy">{t("compare.deepTitle")}</p>
          <p className="mt-1 text-sm leading-6 text-blumea-slate">{t("compare.deepBody")}</p>
          <button
            type="button"
            onClick={() => setDeep(true)}
            className="mt-3 rounded-full bg-blumea-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
          >
            {t("compare.deepButton")}
          </button>
        </div>
      )}
      {unlocked &&
        tiktokPair &&
        deep &&
        [a, b]
          .filter((video) => video.fields === null)
          .map((video) => (
            <div key={video.id} className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-3">
              <p className="text-sm leading-6 text-blumea-slate">
                <VideoRef text={t("compare.notReadYet", { title: videoRef(video.id, video.title) })} />
              </p>
              <button
                type="button"
                onClick={() => setUploadFor(video)}
                className="rounded-full bg-blumea-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
              >
                {t("compare.uploadToRead")}
              </button>
            </div>
          ))}

      {mixed && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          {t("compare.mixedNotice", { a: platformName(a.platform, t), b: platformName(b.platform, t) })}
        </p>
      )}

      {(
        <>
          <section className="mt-8">
            <h2 className="text-xl font-semibold tracking-tight text-blumea-navy">{t("compare.numbers")}</h2>
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
              <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blumea-slate">
                <span />
                <span>{t("compare.videoA")}</span>
                <span>{t("compare.videoB")}</span>
              </div>
              {comparison.metrics.map((row) => {
                const win = leader(row);
                const cell = (side: "a" | "b") => (
                  <span className={win === side ? "font-semibold text-blumea-blue" : "text-blumea-navy"}>
                    <span className="ltr-island">{show(row[side], row.format, t)}</span>
                  </span>
                );
                return (
                  <div
                    key={row.key}
                    className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
                  >
                    <span className="text-blumea-slate">{t(row.key)}</span>
                    {cell("a")}
                    {cell("b")}
                  </div>
                );
              })}
            </div>
          </section>

          {showBuilt && comparison.identity.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold tracking-tight text-blumea-navy">{t("compare.built")}</h2>
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
                {comparison.identity.map((row) => (
                  <div
                    key={row.key}
                    className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
                  >
                    <span className="text-blumea-slate">{t(row.key)}</span>
                    <span className="text-blumea-navy">{row.a ?? t("compare.notAnalyzed")}</span>
                    <span className="text-blumea-navy">
                      {row.b ?? t("compare.notAnalyzed")}
                      {row.a !== null && row.b !== null && !row.same && (
                        <span className="ms-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">{t("compare.different")}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-8 pb-6">
            <h2 className="text-xl font-semibold tracking-tight text-blumea-navy">{t("compare.stands")}</h2>
            <div className="mt-3 space-y-3">
              {comparison.statements.map((statement, index) => (
                <p key={index} className="rounded-2xl border border-blumea-blue/25 bg-white p-4 text-sm leading-6 text-blumea-navy shadow-sm">
                  <VideoText text={statement} />
                </p>
              ))}
            </div>
            {unlocked && !showBuilt && (
              <p className="mt-3 rounded-2xl border border-dashed border-blumea-blue/30 bg-blumea-mist/50 p-4 text-sm leading-6 text-blumea-navy">{t("compare.deepMore")}</p>
            )}
            {comparison.notes.map((note) => (
              <p key={note} className="mt-3 text-xs leading-5 text-blumea-slate">
                {note}
              </p>
            ))}
          </section>
        </>
      )}
    </>
  );

  return (
    <div className="mx-auto w-full max-w-4xl">
      {header}

      {unlocked ? (
        body
      ) : (
        <div className="relative">
          {/* Locked preview: the comparison of the creator's own two videos, blurred, under a note about Blumea Pro. */}
          <div aria-hidden className="pointer-events-none select-none blur-[6px]">
            {body}
          </div>
          <div className="absolute inset-x-0 top-24 mx-auto max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blumea-mist text-blumea-blue">
              <Lock size={18} strokeWidth={1.8} />
            </div>
            <h2 className="mt-3 text-lg font-semibold text-blumea-navy">{t("compare.lockedTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-blumea-slate">{t("compare.lockedBody")}</p>
          </div>
        </div>
      )}

      {pickerOpen && <ComparePicker onClose={() => setPickerOpen(false)} />}

      {uploadFor && (
        <AnalyzeModal
          onClose={() => setUploadFor(null)}
          startReal={{ platform: "tiktok", platformVideoId: uploadFor.platformVideoId }}
          onTiktokAnalyzed={() => {
            setUploadFor(null);
            setVersion((current) => current + 1);
          }}
        />
      )}
    </div>
  );
}
