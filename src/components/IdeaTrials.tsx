"use client";

import { useCallback, useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import AppLink from "@/components/AppLink";
import AnalyzeModal from "@/components/AnalyzeModal";
import { PlatformIcon } from "@/components/PlatformBadge";
import { useProfile } from "@/components/AppShell";
import type { DashboardVideo } from "@/lib/dashboard-data";
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
};

// Blumea recommends analyzing a video a few days after it is posted, when its numbers have come in.
const ANALYZE_AFTER_DAYS = 3;
const DAY = 86_400_000;

// The ideas the creator decided to try: Blumea asks whether the video was posted, links it, and says when it is
// worth analyzing (three days after posting), then how it did against the creator's typical video.
export default function IdeaTrials({ videos }: { videos: DashboardVideo[] }) {
  const t = useT();
  const profile = useProfile();
  const [trials, setTrials] = useState<Trial[] | null>(null);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [analyzeFor, setAnalyzeFor] = useState<DashboardVideo | null>(null);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    const { data } = await supabase.from("idea_trials").select("id, platform, title, details, status, video_id, posted_at, created_at").neq("status", "dropped").order("created_at", { ascending: false });
    setTrials((data ?? []) as Trial[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function first() {
      const { data } = await supabase.from("idea_trials").select("id, platform, title, details, status, video_id, posted_at, created_at").neq("status", "dropped").order("created_at", { ascending: false });
      if (!cancelled) setTrials((data ?? []) as Trial[]);
    }
    first();
    const onSaved = () => load();
    window.addEventListener("blumea:idea-saved", onSaved);
    return () => {
      cancelled = true;
      window.removeEventListener("blumea:idea-saved", onSaved);
    };
  }, [load]);

  if (!trials || trials.length === 0) return null;

  const linked = new Set(trials.map((trial) => trial.video_id).filter(Boolean));
  const typicalOf = (platform: string) => {
    const views = videos.filter((video) => video.platform === platform && video.views !== null && video.views > 0).map((video) => video.views as number);
    return views.length >= 5 ? median(views) : null;
  };

  async function update(id: string, patch: Record<string, unknown>) {
    await supabase.from("idea_trials").update(patch).eq("id", id).eq("profile_id", profile.id);
    setChoosing(null);
    await load();
  }

  return (
    <div className="mb-5 rounded-3xl border border-blumea-blue/25 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Lightbulb size={17} className="text-blumea-blue" />
        <h3 className="text-base font-semibold text-blumea-navy">{t("idea.trialsTitle")}</h3>
      </div>

      <div className="mt-3 space-y-3">
        {trials.map((trial) => {
          const video = trial.video_id ? videos.find((item) => item.id === trial.video_id) ?? null : null;
          const candidates = videos
            .filter((item) => item.platform === trial.platform && item.publishedAt && new Date(item.publishedAt).getTime() >= new Date(trial.created_at).getTime() - DAY && !linked.has(item.id))
            .sort((x, y) => (y.publishedAt ?? "").localeCompare(x.publishedAt ?? ""))
            .slice(0, 5);

          const publishedMs = video?.publishedAt ? new Date(video.publishedAt).getTime() : trial.posted_at ? new Date(trial.posted_at).getTime() : null;
          const daysLeft = publishedMs ? Math.ceil((publishedMs + ANALYZE_AFTER_DAYS * DAY - now) / DAY) : null;
          const typical = typicalOf(trial.platform);
          const ratio = video && video.views && typical ? video.views / typical : null;

          return (
            <article key={trial.id} className="rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold leading-6 text-blumea-navy">{trial.title}</p>
                <PlatformIcon platform={trial.platform as "youtube" | "tiktok"} size={16} />
              </div>

              {trial.status === "trying" ? (
                <>
                  <p className="mt-2 text-sm leading-6 text-blumea-slate">{candidates.length > 0 ? t("idea.postedQuestionSeen") : t("idea.postedQuestion")}</p>
                  {choosing === trial.id ? (
                    <div className="mt-2 space-y-1.5">
                      {candidates.length === 0 ? (
                        <p className="text-sm leading-6 text-blumea-slate">
                          {t("idea.noNewVideo")}{" "}
                          <AppLink href="/content" className="font-semibold text-blumea-blue hover:opacity-70">
                            {t("idea.refreshVideos")}
                          </AppLink>
                        </p>
                      ) : (
                        candidates.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => update(trial.id, { status: "posted", video_id: item.id, posted_at: item.publishedAt })}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-start text-sm text-blumea-navy transition-all hover:border-blumea-blue"
                          >
                            <span className="min-w-0 truncate font-semibold">{item.title}</span>
                            <span className="shrink-0 text-xs text-blumea-slate">{item.publishedAt?.slice(0, 10)}</span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                    <button type="button" onClick={() => setChoosing(choosing === trial.id ? null : trial.id)} className="rounded-full bg-blumea-navy px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blumea-blue">
                      {t("idea.yesPosted")}
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
                  {video && daysLeft !== null && daysLeft > 0 && (
                    <p className="mt-1 text-sm leading-6 text-blumea-slate">{t("idea.analyzeIn", { days: daysLeft, count: ANALYZE_AFTER_DAYS })}</p>
                  )}
                  {video && daysLeft !== null && daysLeft <= 0 && (
                    <>
                      {video.views !== null && (
                        <p className="mt-1 text-sm leading-6 text-blumea-navy">
                          {ratio !== null ? t("idea.result", { views: formatCount(video.views), x: ratio.toFixed(1).replace(/\.0$/, "") }) : t("idea.resultViews", { views: formatCount(video.views) })}
                          {trial.details.howToKnow ? ` ${t("idea.youWanted", { text: trial.details.howToKnow })}` : ""}
                        </p>
                      )}
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
                    </>
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
