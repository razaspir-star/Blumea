"use client";

import { useCallback, useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import AppLink from "@/components/AppLink";
import AnalyzeModal from "@/components/AnalyzeModal";
import { PlatformIcon } from "@/components/PlatformBadge";
import { useProfile } from "@/components/AppShell";
import { loadDashboardData, type DashboardVideo } from "@/lib/dashboard-data";
import { median } from "@/lib/insight-patterns";
import { formatCount } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n/client";

type Trial = {
  id: string;
  platform: string;
  title: string;
  details: { howToKnow?: string };
  status: "trying" | "posted" | "dropped";
  video_id: string | null;
  posted_at: string | null;
  created_at: string;
  analyze_at: string | null;
  auto: "scheduled" | "reminder" | "done" | "failed" | null;
};

const COLUMNS = "id, platform, title, details, status, video_id, posted_at, created_at, analyze_at, auto";
const DAY = 86_400_000;
const DAY_OPTIONS = [3, 5, 7];
// A helper outside the component: reading the clock inside an event handler.
const nowMs = () => Date.now();

// The ideas the creator decided to try. Blumea asks whether the video was posted (and can look for it right
// away), links it, and asks when to analyze it: YouTube videos are then analyzed automatically on that day;
// a TikTok video can't be read without the file, so Blumea reminds the creator to upload it and the
// screenshots. Afterwards it shows how the video did against the creator's typical video.
export default function IdeaTrials({ videos }: { videos: DashboardVideo[] }) {
  const t = useT();
  const profile = useProfile();
  const [trials, setTrials] = useState<Trial[] | null>(null);
  const [fresh, setFresh] = useState<DashboardVideo[] | null>(null);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [pending, setPending] = useState<{ trialId: string; video: DashboardVideo } | null>(null);
  const [analyzeFor, setAnalyzeFor] = useState<DashboardVideo | null>(null);
  const [now] = useState(() => Date.now());
  const all = fresh ?? videos;

  const load = useCallback(async () => {
    const { data } = await supabase.from("idea_trials").select(COLUMNS).in("status", ["trying", "posted"]).order("created_at", { ascending: false });
    setTrials((data ?? []) as Trial[]);
  }, []);

  // Looks for the video the creator just posted: refreshes the creator's videos (numbers only, no AI), then offers them.
  const startChoosing = useCallback(async (trialId: string) => {
    setChoosing(trialId);
    setPending(null);
    setLooking(true);
    const { data } = await supabase.auth.getSession();
    await fetch("/api/scan", { method: "POST", headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` } }).catch(() => null);
    const loaded = await loadDashboardData().catch(() => null);
    if (loaded) setFresh(loaded.videos);
    setLooking(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function first() {
      const { data } = await supabase.from("idea_trials").select(COLUMNS).in("status", ["trying", "posted"]).order("created_at", { ascending: false });
      if (!cancelled) setTrials((data ?? []) as Trial[]);
    }
    first();
    const onSaved = () => load();
    const onPosted = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      load().then(() => {
        startChoosing(id);
        setTimeout(() => document.getElementById("idea-trials")?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
      });
    };
    window.addEventListener("blumea:idea-saved", onSaved);
    window.addEventListener("blumea:idea-posted", onPosted);
    return () => {
      cancelled = true;
      window.removeEventListener("blumea:idea-saved", onSaved);
      window.removeEventListener("blumea:idea-posted", onPosted);
    };
  }, [load, startChoosing]);

  if (!trials || trials.length === 0) return null;

  const linked = new Set(trials.map((trial) => trial.video_id).filter(Boolean));
  const typicalOf = (platform: string) => {
    const views = all.filter((video) => video.platform === platform && video.views !== null && video.views > 0).map((video) => video.views as number);
    return views.length >= 5 ? median(views) : null;
  };
  const dateText = (iso: string) => new Date(iso).toLocaleDateString(t.locale === "he" ? "he-IL" : "en-US", { month: "long", day: "numeric" });

  async function update(id: string, patch: Record<string, unknown>) {
    await supabase.from("idea_trials").update(patch).eq("id", id).eq("profile_id", profile.id);
    setChoosing(null);
    setPending(null);
    await load();
  }

  // The video is chosen: link it and schedule its analysis (days = null: the creator does it).
  async function link(trial: Trial, video: DashboardVideo, days: number | null) {
    const publishedMs = video.publishedAt ? new Date(video.publishedAt).getTime() : nowMs();
    const analyzeAt = days === null ? null : new Date(Math.max(nowMs(), publishedMs + days * DAY)).toISOString();
    await update(trial.id, {
      status: "posted",
      video_id: video.id,
      posted_at: video.publishedAt,
      analyze_at: analyzeAt,
      auto: days === null ? null : trial.platform === "youtube" ? "scheduled" : "reminder",
    });
  }

  return (
    <div id="idea-trials" className="mb-5 rounded-3xl border border-blumea-blue/25 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Lightbulb size={17} className="text-blumea-blue" />
        <h3 className="text-base font-semibold text-blumea-navy">{t("idea.trialsTitle")}</h3>
      </div>

      <div className="mt-3 space-y-3">
        {trials.map((trial) => {
          const video = trial.video_id ? all.find((item) => item.id === trial.video_id) ?? null : null;
          const candidates = all
            .filter((item) => item.platform === trial.platform && item.publishedAt && new Date(item.publishedAt).getTime() >= new Date(trial.created_at).getTime() - DAY && !linked.has(item.id))
            .sort((x, y) => (y.publishedAt ?? "").localeCompare(x.publishedAt ?? ""))
            .slice(0, 5);

          const dueMs = trial.analyze_at ? new Date(trial.analyze_at).getTime() : null;
          const due = dueMs !== null && dueMs <= now;
          const typical = typicalOf(trial.platform);
          const ratio = video && video.views && typical ? video.views / typical : null;
          const tiktok = trial.platform === "tiktok";

          return (
            <article key={trial.id} className="rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold leading-6 text-blumea-navy">{trial.title}</p>
                <PlatformIcon platform={trial.platform as "youtube" | "tiktok"} size={16} />
              </div>

              {trial.status === "trying" ? (
                <>
                  <p className="mt-2 text-sm leading-6 text-blumea-slate">{t("idea.postedQuestion")}</p>

                  {choosing === trial.id && (
                    <div className="mt-2 space-y-1.5">
                      {looking ? (
                        <p className="text-sm text-blumea-slate">{t("idea.looking")}</p>
                      ) : pending && pending.trialId === trial.id ? (
                        <div className="rounded-xl border border-blumea-blue/25 bg-white p-3">
                          <p className="text-sm font-semibold text-blumea-navy">{pending.video.title}</p>
                          <p className="mt-2 text-xs font-semibold text-blumea-navy">{tiktok ? t("idea.whenRemind") : t("idea.whenAnalyze")}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {DAY_OPTIONS.map((days) => (
                              <button
                                key={days}
                                type="button"
                                onClick={() => link(trial, pending.video, days)}
                                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${days === 3 ? "bg-blumea-navy text-white hover:bg-blumea-blue" : "border border-slate-300 text-blumea-navy hover:border-blumea-blue"}`}
                              >
                                {t(days === 3 ? "idea.inDaysRec" : "idea.inDays", { n: days })}
                              </button>
                            ))}
                            <button type="button" onClick={() => link(trial, pending.video, null)} className="rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-blumea-slate hover:border-blumea-blue">
                              {t("idea.self")}
                            </button>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-blumea-slate">{tiktok ? t("idea.tiktokNote") : t("idea.autoNote")}</p>
                        </div>
                      ) : candidates.length === 0 ? (
                        <p className="text-sm leading-6 text-blumea-slate">{t("idea.noNewVideo")}</p>
                      ) : (
                        <>
                          <p className="text-xs font-semibold text-blumea-navy">{t("idea.pickVideo")}</p>
                          {candidates.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setPending({ trialId: trial.id, video: item })}
                              className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-start text-sm text-blumea-navy transition-all hover:border-blumea-blue"
                            >
                              <span className="min-w-0 truncate font-semibold">{item.title}</span>
                              <span className="shrink-0 text-xs text-blumea-slate">{item.publishedAt?.slice(0, 10)}</span>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                    <button type="button" onClick={() => (choosing === trial.id ? setChoosing(null) : startChoosing(trial.id))} className="rounded-full bg-blumea-navy px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blumea-blue">
                      {t("idea.iPosted")}
                    </button>
                    <button type="button" onClick={() => update(trial.id, { status: "dropped" })} className="text-xs font-semibold text-blumea-slate hover:opacity-70">
                      {t("idea.drop")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {video ? (
                    <p className="mt-2 text-sm leading-6 text-blumea-slate">
                      {t("idea.linkedTo")}{" "}
                      <AppLink href={`/analysis/${video.id}`} className="font-semibold text-blumea-blue hover:opacity-70">
                        {video.title}
                      </AppLink>
                    </p>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-blumea-slate">{t("idea.videoGone")}</p>
                  )}

                  {/* what is planned or what happened */}
                  {video && trial.auto === "scheduled" && !due && <p className="mt-1 text-sm leading-6 text-blumea-slate">{t("idea.autoWillOn", { date: dateText(trial.analyze_at as string) })}</p>}
                  {video && trial.auto === "scheduled" && due && !video.analyzed && <p className="mt-1 text-sm leading-6 text-blumea-slate">{t("idea.autoWaiting")}</p>}
                  {video && trial.auto === "done" && <p className="mt-1 text-sm leading-6 text-blumea-slate">{t("idea.autoDone")}</p>}
                  {video && trial.auto === "failed" && <p className="mt-1 text-sm leading-6 text-rose-700">{t("idea.autoFailed")}</p>}
                  {video && trial.auto === "reminder" && !due && <p className="mt-1 text-sm leading-6 text-blumea-slate">{t("idea.reminderOn", { date: dateText(trial.analyze_at as string) })}</p>}
                  {video && trial.auto === "reminder" && due && !video.analyzed && (
                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-sm leading-6 text-amber-800">{t("idea.reminderDue")}</p>
                      <button type="button" onClick={() => setAnalyzeFor(video)} className="mt-2 rounded-full bg-blumea-navy px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blumea-blue">
                        {t("idea.uploadNow")}
                      </button>
                    </div>
                  )}
                  {video && !trial.auto && trial.analyze_at === null && !video.analyzed && <p className="mt-1 text-sm leading-6 text-blumea-slate">{t("idea.analyzeMeWhen")}</p>}

                  {/* the result, once there are numbers to speak of */}
                  {video && video.views !== null && (due || video.analyzed || !trial.auto) && (
                    <p className="mt-1 text-sm leading-6 text-blumea-navy">
                      {ratio !== null ? t("idea.result", { views: formatCount(video.views), x: ratio.toFixed(1).replace(/\.0$/, "") }) : t("idea.resultViews", { views: formatCount(video.views) })}
                      {trial.details.howToKnow ? ` ${t("idea.youWanted", { text: trial.details.howToKnow })}` : ""}
                    </p>
                  )}

                  {video && (video.analyzed || trial.auto === "failed" || (trial.auto === "scheduled" && due) || !trial.auto) && (
                    <div className="mt-3">
                      {video.analyzed ? (
                        <AppLink href={`/analysis/${video.id}`} className="rounded-full bg-blumea-navy px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blumea-blue">
                          {t("idea.openAnalysis")}
                        </AppLink>
                      ) : (
                        <button type="button" onClick={() => setAnalyzeFor(video)} className="rounded-full bg-blumea-navy px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blumea-blue">
                          {t("idea.analyzeNow")}
                        </button>
                      )}
                    </div>
                  )}

                  <button type="button" onClick={() => update(trial.id, { status: "dropped" })} className="mt-3 text-xs font-semibold text-blumea-slate hover:opacity-70">
                    {t("idea.remove")}
                  </button>
                </>
              )}
            </article>
          );
        })}
      </div>

      {analyzeFor && (
        <AnalyzeModal
          onClose={() => setAnalyzeFor(null)}
          startReal={{ platform: analyzeFor.platform as "youtube" | "tiktok", platformVideoId: analyzeFor.platformVideoId }}
          onTiktokAnalyzed={() => window.location.reload()}
        />
      )}
    </div>
  );
}
