"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import AppLink from "@/components/AppLink";
import AnalyzeModal from "@/components/AnalyzeModal";
import ComparePicker from "@/components/ComparePicker";
import Modal from "@/components/Modal";
import WordingCompare from "@/components/WordingCompare";
import { AddNumbers } from "@/components/TiktokViewerCard";
import PlatformBadge from "@/components/PlatformBadge";
import VideoText from "@/components/VideoText";
import { useProfile } from "@/components/AppShell";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { loadCompareVideo, type CompareVideo } from "@/lib/compare-data";
import { supabase } from "@/lib/supabase";
import { buildComparison, type MetricFormat, type MetricRow } from "@/lib/compare-insights";
import { buildDeep } from "@/lib/compare-deep";
import { LockedCard, FreeAllowanceNote } from "@/components/CompareFrame";
import { askCompareAccess, pairKey, useCompareAccess } from "@/lib/use-compare-access";
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
  // Pro and owner may make in-depth comparisons; whether this one may be opened at all is asked of the server below.
  const canDeep = profile.plan === "pro" || profile.plan === "owner";
  const [videos, setVideos] = useState<{ a: CompareVideo | null; b: CompareVideo | null } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // What Blumea is reading right now so the comparison can say how a video is built, and why a read failed.
  const [reading, setReading] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  // TikTok: the regular comparison uses numbers; "in-depth" needs each TikTok video read (uploaded once),
  // then the creator presses "Compare in depth".
  const [deepRun, setDeepRun] = useState(false);
  const [uploadFor, setUploadFor] = useState<CompareVideo | null>(null);
  const [numbersFor, setNumbersFor] = useState<CompareVideo | null>(null);
  const [version, setVersion] = useState(0);
  const valid = UUID.test(idA) && UUID.test(idB);
  const access = useCompareAccess(valid ? pairKey(idA, idB) : "");
  const unlocked = access?.allowed === true;
  const [deepNote, setDeepNote] = useState<string | null>(null);

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;

    async function run() {
      const [a, b] = await Promise.all([loadCompareVideo(idA), loadCompareVideo(idB)]);
      if (cancelled) return;
      setVideos({ a, b });

    }

    run();
    return () => {
      cancelled = true;
    };
  }, [idA, idB, valid, version]);

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

  if (videos === null || access === null) {
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
  const tiktokPair = a.platform === "tiktok" || b.platform === "tiktok";
  const bothRead = a.fields !== null && b.fields !== null;
  // The in-depth part appears only when the creator presses "Compare in depth" (it reads videos and counts).
  const showBuilt = deepRun;
  const comparison = buildComparison(a, b, t, mixed, showBuilt);
  const deepResult = showBuilt && bothRead ? buildDeep(a, b, t, mixed) : null;
  const noGapText = t("compare.noGap");
  const statements = deepResult
    ? [...comparison.statements.filter((statement) => statement !== noGapText), ...deepResult.statements]
    : comparison.statements;
  // In the in-depth view each number and each opening row is shown once, in its own part.
  const viewerKeys = new Set<string>(deepResult?.viewers.map((row) => row.key) ?? []);
  // "Sharpest drop" (YouTube) is the same fact as "viewers stopped most at" in the viewers table.
  if (viewerKeys.has("compare.metricStopped")) viewerKeys.add("compare.metricDrop");
  const openingKeys = new Set<string>(deepResult?.opening.map((row) => row.key) ?? []);
  const metrics = comparison.metrics.filter((row) => !viewerKeys.has(row.key));
  const identity = comparison.identity.filter((row) => !openingKeys.has(row.key));
  const tiktokVideos = [a, b].filter((video) => video.platform === "tiktok");
  const allTiktokRead = tiktokVideos.every((video) => video.fields !== null);

  // A YouTube video that was only scanned (numbers, no AI reading) is read when the creator presses
  // the button; TikTok videos need an upload first, so the button waits for them.
  const youtubeUnread = [a, b].filter((video) => video.platform === "youtube" && video.fields === null);
  const needsAction = [a, b].filter((video) => video.platform === "tiktok" || video.fields === null);

  const deepKey = pairKey(a.id, b.id);

  async function runDeep() {
    setDeepNote(null);
    const deepAccess = await askCompareAccess("deep", deepKey);
    if (!deepAccess || !deepAccess.allowed) {
      const date = deepAccess ? new Date(deepAccess.resetsOn).toLocaleDateString(t.locale === "he" ? "he-IL" : "en-US", { month: "long", day: "numeric", timeZone: "UTC" }) : "";
      setDeepNote(deepAccess ? t("compare.deepCapReached", { cap: deepAccess.cap ?? 0, date }) : t("compare.deepAccessFailed"));
      return;
    }
    if (youtubeUnread.length > 0) {
      setReadError(null);
      const { data: session } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session.session?.access_token ?? ""}`, "Content-Type": "application/json" };
      for (const video of youtubeUnread) {
        setReading(video.title);
        const response = await fetch("/api/analyze/youtube", {
          method: "POST",
          headers,
          body: JSON.stringify({ videoId: video.platformVideoId }),
        }).catch(() => null);
        if (!response || !response.ok) {
          const body = response ? await response.json().catch(() => null) : null;
          setReadError(t("compare.readFailed", { title: video.title, reason: body?.error ?? "" }));
          setReading(null);
          return;
        }
      }
      const [a2, b2] = await Promise.all([loadCompareVideo(idA), loadCompareVideo(idB)]);
      setVideos({ a: a2, b: b2 });
      setReading(null);
    }
    setDeepRun(true);
    setTimeout(() => document.getElementById("deep-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }

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
      {!deepRun && (
        <div className="blumea-step mt-4 rounded-2xl border border-blumea-blue/25 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-blumea-navy">{t("compare.deepTitle")}</p>
          <p className="mt-1 text-sm leading-6 text-blumea-slate">{tiktokPair ? t("compare.deepBody") : t("compare.deepBodyYoutube")}</p>
          {!canDeep && <p className="mt-2 text-sm font-semibold text-blumea-blue">{t("compare.deepProOnly")}</p>}
          {deepNote && <p className="mt-2 text-sm text-rose-700">{deepNote}</p>}

          <div className="mt-3 space-y-2">
            {needsAction.map((video) => (
              <div key={video.id} className="rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-blumea-navy">{video.title}</p>
                {video.platform === "youtube" ? (
                  <p className="mt-1.5 text-xs leading-5 text-blumea-slate">{t("compare.stepYoutubeRead")}</p>
                ) : (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                  {video.fields !== null ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-blumea-success">
                        <Check size={14} strokeWidth={2.4} />
                        {t("compare.stepVideo")}
                      </span>
                      {video.fields.setting === undefined && (
                        <button type="button" onClick={() => setUploadFor(video)} className="font-semibold text-blumea-blue hover:opacity-70">
                          {t("compare.stepReread")}
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setUploadFor(video)}
                      className="rounded-full bg-blumea-navy px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blumea-blue"
                    >
                      {t("compare.stepUploadVideo")}
                    </button>
                  )}
                  <span className="text-blumea-slate">{t("compare.stepNumbers")}:</span>
                  {video.tiktokScreens !== null ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-blumea-success">
                      <Check size={14} strokeWidth={2.4} />
                      {t("compare.stepNumbersHave")}
                    </span>
                  ) : null}
                  <button type="button" onClick={() => setNumbersFor(video)} className="font-semibold text-blumea-blue hover:opacity-70">
                    {t("compare.addNumbers")}
                  </button>
                </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={!canDeep || !allTiktokRead || reading !== null}
            onClick={runDeep}
            className={
              canDeep && allTiktokRead && reading === null
                ? "mt-4 rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
                : "mt-4 cursor-not-allowed rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-400"
            }
          >
            {allTiktokRead ? t("compare.deepGo") : t("compare.deepGoWait")}
          </button>
        </div>
      )}

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
              {metrics.map((row) => {
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

          {showBuilt && deepResult && (
            <div id="deep-results" className="blumea-reveal-down scroll-mt-6">
              <h2 className="mt-10 text-2xl font-semibold tracking-tight text-blumea-navy">{t("compare.deepResultTitle")}</h2>

              {deepResult.opening.length > 0 && (
                <section className="mt-5">
                  <h3 className="text-lg font-semibold tracking-tight text-blumea-navy">{t("compare.deepOpening")}</h3>
                  <WordingCompare idA={a.id} idB={b.id} titleA={a.title} titleB={b.title} hooks={deepResult.hooks} />
                  <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
                    {deepResult.opening.map((row) => (
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

              {(deepResult.viewers.length > 0 || (deepResult.noViewerNumbers.length > 0 && !mixed)) && (
                <section className="mt-6">
                  <h3 className="text-lg font-semibold tracking-tight text-blumea-navy">{t("compare.deepViewers")}</h3>
                  {deepResult.viewers.length > 0 && (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
                      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blumea-slate">
                        <span />
                        <span>{t("compare.videoA")}</span>
                        <span>{t("compare.videoB")}</span>
                      </div>
                      {deepResult.viewers.map((row) => {
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
                  )}
                  <div className="mt-3 space-y-2">
                    {deepResult.noViewerNumbers.map((video) => (
                      <div key={video.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-3">
                        <p className="text-sm leading-6 text-blumea-slate">{t("compare.noViewerNumbers", { title: video.title })}</p>
                        {video.platform === "tiktok" && (
                          <button
                            type="button"
                            onClick={() => setNumbersFor(video)}
                            className="rounded-full bg-blumea-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
                          >
                            {t("compare.addNumbers")}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {showBuilt && identity.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold tracking-tight text-blumea-navy">{t("compare.built")}</h2>
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
                {identity.map((row) => (
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
              {statements.map((statement, index) => (
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
        <>
          <FreeAllowanceNote access={access} />
          {body}
        </>
      ) : (
        <div className="relative">
          {/* Locked preview: the comparison of the creator's own two videos, blurred, under a note about Blumea Pro. */}
          <div aria-hidden className="pointer-events-none select-none blur-[6px]">
            {body}
          </div>
          <LockedCard access={access} />
        </div>
      )}

      {pickerOpen && <ComparePicker onClose={() => setPickerOpen(false)} />}

      {numbersFor && (
        <Modal kicker={t("compare.pickerKicker")} title={t("compare.stepNumbers")} onClose={() => setNumbersFor(null)}>
          <p className="mt-3 truncate text-sm font-semibold text-blumea-navy">{numbersFor.title}</p>
          <AddNumbers
            platformVideoId={numbersFor.platformVideoId}
            label={t("viewerCard.readMine")}
            onDone={() => {
              setNumbersFor(null);
              setVersion((current) => current + 1);
            }}
          />
        </Modal>
      )}

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
