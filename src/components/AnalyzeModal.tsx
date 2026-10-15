"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAppRouter } from "@/lib/use-app-router";
import { Check, ExternalLink, UploadCloud, Zap } from "lucide-react";
import Modal from "@/components/Modal";
import BlumeaFlowerLoader from "@/components/BlumeaFlowerLoader";
import UploadStep from "@/components/UploadStep";
import TiktokUploadStep from "@/components/TiktokUploadStep";
import PlatformBadge, { PlatformIcon } from "@/components/PlatformBadge";
import { useProfile } from "@/components/AppShell";
import { useT } from "@/lib/i18n/client";
import { rich } from "@/lib/i18n/rich";
import type { TextKey } from "@/lib/i18n/translate";
import { supabase } from "@/lib/supabase";
import { useMockStore } from "@/lib/mock-store";
import { formatCount } from "@/lib/format";
import {
  getAnalysisMode,
  getVideo,
  platformCapabilities,
  platformLabels,
  seedAnalyzedIds,
  videos,
  type VideoPlatformId,
} from "@/lib/mock-data";

const analyzingSteps: TextKey[] = [
  "analyzeModal.step0",
  "analyzeModal.step1",
  "analyzeModal.step2",
  "analyzeModal.step3",
  "analyzeModal.step4",
];


type RealVideoSummary = { platformVideoId: string; title: string; thumbnail: string; publishedAt: string };
type RealTiktokVideo = { platformVideoId: string; title: string; thumbnail: string; shareUrl: string; createTime: string };

// "choice" = Lite vs. Upload, offered together on one screen, before analysis
// starts (the locked upload flow). YouTube and Instagram-with-original-sound
// skip straight to "analyzing": there's no upload branch for them.
type Stage = "browse" | "choice" | "upload" | "analyzing";

function stageFor(videoId: string, deepIds: string[]): Stage {
  const video = getVideo(videoId);

  if (!video) {
    return "analyzing";
  }

  return getAnalysisMode(video, deepIds) === "lite" ? "choice" : "analyzing";
}

type AnalyzeModalProps = {
  onClose: () => void;
  // Starting from a specific video (e.g. from Content) skips the platform/video pickers.
  initialVideoId?: string;
  // Real videos (from the First Scan): start straight at a YouTube video, or at a
  // platform's video list.
  startReal?: { platform: "youtube" | "tiktok"; platformVideoId?: string };
};

export default function AnalyzeModal({ onClose, initialVideoId, startReal }: AnalyzeModalProps) {
  const t = useT();
  const router = useAppRouter();
  const profile = useProfile();
  const { analyzedIds, deepIds, markAnalyzed } = useMockStore(seedAnalyzedIds);

  const [platform, setPlatform] = useState<VideoPlatformId | null>(
    startReal ? startReal.platform : initialVideoId ? (getVideo(initialVideoId)?.platform ?? null) : null
  );
  const [selectedId, setSelectedId] = useState<string | null>(initialVideoId ?? null);
  const [stage, setStage] = useState<Stage>(() =>
    startReal?.platform === "youtube" && startReal.platformVideoId
      ? "analyzing"
      : initialVideoId
        ? stageFor(initialVideoId, deepIds)
        : "browse"
  );
  const [step, setStep] = useState(0);

  // Real YouTube video list + real analysis run (Insight_Engine_Spec.md §13#6).
  // Instagram still browses the mock `videos` list below.
  const [realVideos, setRealVideos] = useState<RealVideoSummary[] | null>(null);
  const [realLoading, setRealLoading] = useState(false);
  const [realListError, setRealListError] = useState<string | null>(null);
  const [realSelectedId, setRealSelectedId] = useState<string | null>(
    startReal?.platform === "youtube" ? (startReal.platformVideoId ?? null) : null
  );
  const [realResult, setRealResult] = useState<{ id: string } | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // realLoading is deliberately not part of this effect's guard/deps: setting
  // it as the first thing load() does would re-trigger this same effect,
  // whose cleanup then cancels the very request that was just kicked off.
  useEffect(() => {
    if (platform !== "youtube" || realVideos !== null) return;
    let cancelled = false;

    async function load() {
      setRealLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (!cancelled) {
          setRealListError(t("analyzeModal.notSignedIn"));
          setRealLoading(false);
        }
        return;
      }

      const response = await fetch("/api/videos/youtube", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await response.json();

      if (cancelled) return;
      if (!response.ok) {
        setRealListError(body.error ?? t("analyzeModal.couldNotLoad"));
      } else {
        setRealVideos(body.videos);
      }
      setRealLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [platform, realVideos, t]);

  // Real TikTok video list. TikTok's API never gives us the video file
  // (doc/CLAUDE.md §5), so picking one doesn't analyze -- it opens the
  // "save from TikTok, then upload" screen below. The real upload pipeline
  // itself is a separate, not-yet-built piece (Insight_Engine_Spec.md §13#6).
  const [tiktokVideos, setTiktokVideos] = useState<RealTiktokVideo[] | null>(null);
  const [tiktokListError, setTiktokListError] = useState<string | null>(null);
  const [tiktokSelected, setTiktokSelected] = useState<RealTiktokVideo | null>(null);

  useEffect(() => {
    if (platform !== "tiktok" || tiktokVideos !== null) return;
    let cancelled = false;

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (!cancelled) setTiktokListError(t("analyzeModal.notSignedIn"));
        return;
      }

      const response = await fetch("/api/videos/tiktok", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await response.json();

      if (cancelled) return;
      if (!response.ok) {
        setTiktokListError(body.error ?? t("analyzeModal.couldNotLoadTiktok"));
      } else {
        setTiktokVideos(body.videos);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [platform, tiktokVideos, t]);

  // Kicks off the real analysis once the animated "analyzing" stage starts for
  // a real video. The step animation below is cosmetic; navigation waits for
  // this to actually finish.
  useEffect(() => {
    if (stage !== "analyzing" || !realSelectedId || realResult || analyzeError) return;
    let cancelled = false;

    async function run() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (!cancelled) setAnalyzeError(t("analyzeModal.notSignedIn"));
        return;
      }

      const response = await fetch("/api/analyze/youtube", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: realSelectedId }),
      });
      const body = await response.json();

      if (cancelled) return;
      if (!response.ok) {
        setAnalyzeError(body.error ?? t("analyzeModal.analysisFailed"));
      } else {
        setRealResult({ id: body.video.id });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [stage, realSelectedId, realResult, analyzeError, t]);

  // Real connections (currently youtube/tiktok) union with the onboarding
  // platform preference -- that preference alone can miss a platform the
  // creator connected for real after onboarding.
  const [reallyConnected, setReallyConnected] = useState<VideoPlatformId[]>([]);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("connected_accounts")
      .select("platform")
      .then(({ data }) => {
        if (cancelled || !data) return;
        setReallyConnected(data.map((row) => row.platform as VideoPlatformId));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const connected = Array.from(
    new Set([
      ...(profile.platforms ?? []).filter((id): id is VideoPlatformId => id !== "facebook"),
      ...reallyConnected,
    ])
  );
  // Only platforms with a real integration are offered (Instagram is not built).
  const REAL_PLATFORMS: VideoPlatformId[] = ["youtube", "tiktok"];
  const realConnected = connected.filter((id) => REAL_PLATFORMS.includes(id));
  const platforms = realConnected.length > 0 ? realConnected : REAL_PLATFORMS;

  useEffect(() => {
    if (stage !== "analyzing") {
      return;
    }

    // Real video: the step animation is cosmetic; only navigate once the real
    // analysis call has actually finished (or stop animating on error).
    if (realSelectedId) {
      if (analyzeError) return;

      if (step >= analyzingSteps.length) {
        if (!realResult) return;

        const finish = setTimeout(() => router.push(`/analysis/${realResult.id}`), 500);
        return () => clearTimeout(finish);
      }

      const next = setTimeout(() => setStep((current) => current + 1), 900);
      return () => clearTimeout(next);
    }

    if (!selectedId) {
      return;
    }

    if (step >= analyzingSteps.length) {
      const finish = setTimeout(() => {
        markAnalyzed(selectedId);
        router.push(`/analysis/${selectedId}`);
      }, 700);

      return () => clearTimeout(finish);
    }

    const next = setTimeout(() => setStep((current) => current + 1), 900);

    return () => clearTimeout(next);
  }, [stage, step, selectedId, realSelectedId, realResult, analyzeError, markAnalyzed, router]);

  function selectRealVideoForAnalysis(videoId: string) {
    setRealSelectedId(videoId);
    setRealResult(null);
    setAnalyzeError(null);
    setStep(0);
    setStage("analyzing");
  }

  function selectForAnalysis(videoId: string) {
    setSelectedId(videoId);

    if (analyzedIds.includes(videoId)) {
      router.push(`/analysis/${videoId}`);
      return;
    }

    setStep(0);
    setStage(stageFor(videoId, deepIds));
  }

  function beginLite() {
    setStep(0);
    setStage("analyzing");
  }

  function handleUploadDone(uploadedIds: string[]) {
    const target = (selectedId && uploadedIds.includes(selectedId) ? selectedId : uploadedIds[0]) ?? null;

    if (target) {
      router.push(`/analysis/${target}`);
      return;
    }

    onClose();
  }

  const selectedVideo = selectedId ? getVideo(selectedId) : undefined;
  const platformVideos = videos.filter((video) => video.platform === platform);
  const capability = platformCapabilities.find((item) => item.id === platform);

  return (
    <Modal
      kicker={t("analyzeModal.kicker")}
      title={t("analyzeModal.title")}
      description={stage === "browse" ? t("analyzeModal.description") : undefined}
      onClose={onClose}
    >
      {stage === "analyzing" && realSelectedId && analyzeError && (
        <div className="blumea-expand mt-8">
          <div className="flex flex-col items-center py-6 text-center">
            <h3 className="text-xl font-semibold text-blumea-navy">{t("analyzeModal.failed")}</h3>

            <p className="mt-2 max-w-sm text-sm text-blumea-slate">{analyzeError}</p>

            <button
              type="button"
              onClick={() => {
                setStage("browse");
                setRealSelectedId(null);
                setAnalyzeError(null);
              }}
              className="mt-5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-blumea-navy transition-colors hover:border-blumea-blue"
            >
              {t("analyzeModal.back")}
            </button>
          </div>
        </div>
      )}

      {stage === "analyzing" && !(realSelectedId && analyzeError) && (
        <div className="blumea-expand mt-8">
          <div className="flex flex-col items-center py-6 text-center">
            <BlumeaFlowerLoader size={64} />

            <h3 className="mt-6 text-xl font-semibold text-blumea-navy">{t("analyzeModal.analyzingTitle")}</h3>

            <p className="mt-2 max-w-sm text-sm text-blumea-slate">
              {t("analyzeModal.analyzingBody")}
            </p>

            <div className="mt-7 w-full max-w-sm space-y-3 text-start">
              {analyzingSteps.map((label, index) => {
                const completed = index < step;
                const active = index === step;

                return (
                  <div
                    key={label}
                    className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                      completed || active ? "text-blumea-navy" : "text-blumea-slate"
                    }`}
                  >
                    {completed ? (
                      <Check size={16} strokeWidth={2.2} className="text-blumea-success" />
                    ) : active ? (
                      <span className="h-2 w-2 animate-pulse rounded-full bg-blumea-blue" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-slate-200" />
                    )}

                    <span className={active ? "font-medium" : ""}>{t(label)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {stage === "choice" && selectedVideo && (
        <div className="blumea-expand mt-7">
          <div>
            <button
              type="button"
              onClick={() => {
                setStage("browse");
                setSelectedId(null);
              }}
              className="text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
            >
              ← Back
            </button>

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                <Image
                  src={selectedVideo.thumbnail}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-blumea-navy">
                  {selectedVideo.title}
                </p>

                <PlatformBadge platform={selectedVideo.platform} />
              </div>
            </div>

            <h3 className="mt-6 text-lg font-semibold text-blumea-navy">
              How should Blumea analyze this one?
            </h3>

            <p className="mt-1 text-sm text-blumea-slate">
              {platformLabels[selectedVideo.platform]} doesn&apos;t share the video file for this
              one, so choose how deep to go. You can always upload it later from the result.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={beginLite}
                className="flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-blumea-blue hover:shadow-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blumea-mist text-blumea-blue">
                  <Zap size={18} strokeWidth={1.8} />
                </div>

                <p className="mt-3 text-sm font-semibold text-blumea-navy">Analyze now</p>

                <p className="mt-1 text-xs leading-5 text-blumea-slate">
                  Instant, from the title, caption, cover and metrics. No upload needed.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStage("upload")}
                className="flex flex-col items-start rounded-2xl border-2 border-blumea-blue bg-blumea-mist p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blumea-blue">
                  <UploadCloud size={18} strokeWidth={1.8} />
                </div>

                <p className="mt-3 text-sm font-semibold text-blumea-navy">Upload the video</p>

                <p className="mt-1 text-xs leading-5 text-blumea-slate">
                  Adds your visual hook, sound and exact key moments. Used only for this analysis,
                  never stored.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === "upload" && selectedVideo && (
        <div className="blumea-expand mt-7">
          <div>
            <button
              type="button"
              onClick={() => setStage("choice")}
              className="text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
            >
              ← Back
            </button>

            <div className="mt-4">
              <UploadStep video={selectedVideo} onDone={handleUploadDone} />
            </div>
          </div>
        </div>
      )}

      {stage === "browse" && !platform && (
        <div className="blumea-expand mt-7">
          <div>
          <p className="mt-6 text-sm font-semibold text-blumea-navy">{t("analyzeModal.choosePlatform")}</p>

            <p className="mt-1 text-sm text-blumea-slate">
              {t("analyzeModal.wherePlatform")}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {platforms.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlatform(id)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-blumea-navy transition-all hover:-translate-y-0.5 hover:border-blumea-blue hover:shadow-sm"
                >
                  <PlatformIcon platform={id} size={18} />
                  {platformLabels[id]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {stage === "browse" && platform && (
        <div className="blumea-expand mt-7">
          <div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setPlatform(null);
                  setSelectedId(null);
                  setRealVideos(null);
                  setRealListError(null);
                  setTiktokVideos(null);
                  setTiktokListError(null);
                  setTiktokSelected(null);
                }}
                className="text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
              >
                {t("analyzeModal.back")}
              </button>

              <PlatformBadge platform={platform} />
            </div>

            <div className="mt-5">
              <h3 className="text-lg font-semibold text-blumea-navy">
                {platform === "tiktok" && tiktokSelected ? t("analyzeModal.saveUpload") : t("analyzeModal.chooseVideo")}
              </h3>

              {capability && !(platform === "tiktok" && tiktokSelected) && (
                <p className="mt-1 text-sm text-blumea-slate">
                  {platform === "youtube" ? t("analyzeModal.capYoutube") : platform === "tiktok" ? t("analyzeModal.capTiktok") : capability.analysis}
                </p>
              )}
            </div>

            {platform === "tiktok" && tiktokSelected ? (
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setTiktokSelected(null)}
                  className="text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
                >
                  {t("analyzeModal.chooseDifferent")}
                </button>

                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    <Image
                      src={tiktokSelected.thumbnail}
                      alt={tiktokSelected.title}
                      fill
                      unoptimized
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>

                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-blumea-navy">
                    {tiktokSelected.title}
                  </p>
                </div>

                <p className="mt-4 text-sm leading-6 text-blumea-slate">
                  {rich(t("analyzeModal.tiktokNoShare"), {
                    phone: <span className="font-medium text-blumea-navy">{t("analyzeModal.tiktokPhone")}</span>,
                  })}
                </p>

                <a
                  href={tiktokSelected.shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-blumea-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
                >
                  <ExternalLink size={16} />
                  {t("analyzeModal.openToSave")}
                </a>

                <p className="mt-4 text-xs leading-5 text-blumea-slate">
                  {t("analyzeModal.computerNote")}
                </p>

                <TiktokUploadStep video={tiktokSelected} onDone={(id) => router.push(`/analysis/${id}`)} />
              </div>
            ) : platform === "tiktok" ? (
              <>
                {tiktokListError && (
                  <p className="mt-5 text-sm text-red-500">{tiktokListError}</p>
                )}

                {!tiktokListError && tiktokVideos && tiktokVideos.length === 0 && (
                  <p className="mt-5 text-sm text-blumea-slate">{t("analyzeModal.noVideosTiktok")}</p>
                )}

                {!tiktokListError && tiktokVideos === null && (
                  <p className="mt-5 text-sm text-blumea-slate">{t("content.loading")}</p>
                )}

                {tiktokVideos && tiktokVideos.length > 0 && (
                  <div className="mt-5 grid max-h-[400px] grid-cols-2 gap-3 overflow-y-auto pe-1 sm:grid-cols-3">
                    {tiktokVideos.map((video) => (
                      <button
                        key={video.platformVideoId}
                        type="button"
                        onClick={() => setTiktokSelected(video)}
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-start shadow-sm transition-all hover:-translate-y-0.5 hover:border-blumea-blue/40 hover:shadow-md"
                      >
                        <div className="relative aspect-[9/16] overflow-hidden bg-slate-100">
                          <Image
                            src={video.thumbnail}
                            alt={video.title}
                            fill
                            unoptimized
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>

                        <div className="p-3">
                          <p className="truncate text-sm font-semibold text-blumea-navy">
                            {video.title}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : platform === "youtube" ? (
              <>
                {realLoading && (
                  <p className="mt-5 text-sm text-blumea-slate">Loading your videos…</p>
                )}

                {realListError && (
                  <p className="mt-5 text-sm text-red-500">{realListError}</p>
                )}

                {!realLoading && !realListError && realVideos && realVideos.length === 0 && (
                  <p className="mt-5 text-sm text-blumea-slate">{t("analyzeModal.noVideosYoutube")}</p>
                )}

                {realVideos && realVideos.length > 0 && (
                  <div className="mt-5 grid max-h-[400px] grid-cols-2 gap-3 overflow-y-auto pe-1 sm:grid-cols-3">
                    {realVideos.map((video) => (
                      <button
                        key={video.platformVideoId}
                        type="button"
                        onClick={() => selectRealVideoForAnalysis(video.platformVideoId)}
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-start shadow-sm transition-all hover:-translate-y-0.5 hover:border-blumea-blue/40 hover:shadow-md"
                      >
                        <div className="relative aspect-[9/16] overflow-hidden bg-slate-100">
                          {/* unoptimized: the maxresdefault.jpg source is already sharp and
                              correctly sized -- Next's own resize/recompress pass was
                              softening it further, for no benefit here (at most 12 images). */}
                          <Image
                            src={video.thumbnail}
                            alt={video.title}
                            fill
                            unoptimized
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>

                        <div className="p-3">
                          <p className="truncate text-sm font-semibold text-blumea-navy">
                            {video.title}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mt-5 grid max-h-[400px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
                  {platformVideos.map((video) => {
                    const isSelected = selectedId === video.id;
                    const isAnalyzed = analyzedIds.includes(video.id);

                    return (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => setSelectedId(video.id)}
                        className={`group overflow-hidden rounded-2xl bg-white text-left transition-all ${
                          isSelected
                            ? "border-2 border-blumea-blue shadow-md"
                            : "border border-slate-200 shadow-sm hover:border-blumea-blue/40 hover:shadow-md"
                        }`}
                      >
                        <div className="relative aspect-[9/16] overflow-hidden bg-slate-100">
                          <Image
                            src={video.thumbnail}
                            alt={video.title}
                            fill
                            sizes="200px"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />

                          {isSelected && (
                            <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-blumea-blue text-white shadow-sm">
                              <Check size={15} strokeWidth={2.2} />
                            </div>
                          )}

                          {isAnalyzed && (
                            <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-blumea-success shadow-sm">
                              Analyzed
                            </span>
                          )}
                        </div>

                        <div className="p-3">
                          <p className="truncate text-sm font-semibold text-blumea-navy">
                            {video.title}
                          </p>

                          <p className="mt-1 text-xs text-blumea-slate">
                            {formatCount(video.metrics.views)} views
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    disabled={!selectedId}
                    onClick={() => selectedId && selectForAnalysis(selectedId)}
                    className={
                      selectedId
                        ? "rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blumea-blue"
                        : "cursor-not-allowed rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-400"
                    }
                  >
                    {selectedId && analyzedIds.includes(selectedId) ? "View analysis" : "Continue"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
