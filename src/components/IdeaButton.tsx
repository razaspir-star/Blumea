"use client";

import { useState } from "react";
import { Lightbulb, Lock } from "lucide-react";
import AppLink from "@/components/AppLink";
import BlumeaFlowerLoader from "@/components/BlumeaFlowerLoader";
import Modal from "@/components/Modal";
import { PlatformIcon } from "@/components/PlatformBadge";
import { useProfile } from "@/components/AppShell";
import { useAppRouter } from "@/lib/use-app-router";
import { supabase } from "@/lib/supabase";
import { platformName } from "@/lib/platform-capabilities";
import { useT } from "@/lib/i18n/client";
import type { IdeaResult } from "@/lib/idea";

type Answer = IdeaResult & { used: number; cap: number | null };
type Failure = { code: string; message: string };

// The "Blumea Idea" button (a light bulb) and its window: pick a platform, get ideas for the next video that
// say what they rest on, then a separate creative part (hook lines) that says it is not from the data.
export default function IdeaButton({ platforms }: { platforms: string[] }) {
  const t = useT();
  const router = useAppRouter();
  const profile = useProfile();
  const pro = profile.plan === "pro" || profile.plan === "owner";
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  // The ideas the creator chose to try in this window.
  const [saved, setSaved] = useState<Record<string, { id: string; mode: "try" | "later" }>>({});

  async function ask(chosen: string) {
    setPlatform(chosen);
    setAnswer(null);
    setFailure(null);
    setSaved({});
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    const response = await fetch("/api/idea", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify({ platform: chosen }),
    }).catch(() => null);
    const body = response ? await response.json().catch(() => null) : null;
    setLoading(false);
    if (!response || !response.ok || !body) {
      setFailure({ code: body?.code ?? "failed", message: body?.error ?? t("idea.failed") });
      return;
    }
    setAnswer(body as Answer);
  }

  // Saves an idea of this window: to try now (status trying) or to keep for later (status saved).
  async function save(key: string, mode: "try" | "later", payload: { source: "blumea" | "creative"; title: string; details: Record<string, unknown> }) {
    if (!answer || saved[key]) return;
    setSaved((current) => ({ ...current, [key]: { id: "", mode } }));
    const { data } = await supabase
      .from("idea_trials")
      .insert({
        profile_id: profile.id,
        platform: answer.platform,
        title: payload.title,
        source: payload.source,
        status: mode === "try" ? "trying" : "saved",
        details: { ...payload.details, locale: t.locale },
      })
      .select("id")
      .single();
    setSaved((current) => ({ ...current, [key]: { id: (data?.id as string | undefined) ?? "", mode } }));
    window.dispatchEvent(new Event("blumea:idea-saved"));
  }

  // The video is already posted: close the window and let the Dashboard look for it.
  function postedIt(id: string) {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("blumea:idea-posted", { detail: id }));
  }

  function reset() {
    setSaved({});
    setPlatform(null);
    setAnswer(null);
    setFailure(null);
  }

  const saveButtons = (key: string, payload: { source: "blumea" | "creative"; title: string; details: Record<string, unknown> }) => (
    <div className="mt-3">
      {saved[key] ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-blumea-success">{saved[key].mode === "try" ? t("idea.savedNote") : t("idea.likedNote")}</p>
          {saved[key].mode === "try" && saved[key].id && (
            <button type="button" onClick={() => postedIt(saved[key].id)} className="rounded-full bg-blumea-navy px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blumea-blue">
              {t("idea.iPosted")}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => save(key, "try", payload)} className="rounded-full border border-blumea-navy px-4 py-2 text-xs font-semibold text-blumea-navy transition-colors hover:bg-blumea-navy hover:text-white">
            {t("idea.tryIt")}
          </button>
          <button type="button" onClick={() => save(key, "later", payload)} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-blumea-slate transition-colors hover:border-blumea-blue hover:text-blumea-navy">
            {t("idea.likeIt")}
          </button>
        </div>
      )}
    </div>
  );

  const quote = (text: string) => (t.locale === "he" ? `״${text}״` : `“${text}”`);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-blumea-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
      >
        <Lightbulb size={17} strokeWidth={1.9} />
        {t("idea.button")}
      </button>

      {open && (
        <Modal kicker={t("idea.button")} title={t("idea.title")} onClose={() => setOpen(false)}>
          {!pro ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blumea-mist text-blumea-blue">
                <Lock size={18} strokeWidth={1.8} />
              </div>
              <p className="mt-3 text-base font-semibold text-blumea-navy">{t("idea.proOnly")}</p>
              <p className="mt-1 text-sm leading-6 text-blumea-slate">{t("idea.proBody")}</p>
            </div>
          ) : loading ? (
            <div className="blumea-step mt-8 flex flex-col items-center py-6 text-center">
              <BlumeaFlowerLoader size={52} />
              <p className="mt-4 text-sm text-blumea-slate">{t("idea.loading")}</p>
            </div>
          ) : failure ? (
            <div className="blumea-step mt-6">
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">{failure.message}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {failure.code === "not_enough" && (
                  <button type="button" onClick={() => router.push("/analyze")} className="rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue">
                    {t("idea.analyzeMore")}
                  </button>
                )}
                <button type="button" onClick={reset} className="text-sm font-semibold text-blumea-blue hover:opacity-70">
                  {t("idea.changePlatform")}
                </button>
              </div>
            </div>
          ) : answer ? (
            <div className="blumea-step mt-4 space-y-4">
              {answer.unread.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">{t("idea.unreadTitle")}</p>
                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    {t("idea.unreadBody", { list: answer.unread.map((video) => `${quote(video.title)} (${video.views.toLocaleString()})`).join(", ") })}
                  </p>
                  <button type="button" onClick={() => router.push("/analyze")} className="mt-2 text-sm font-semibold text-amber-900 underline-offset-2 hover:underline">
                    {t("idea.analyzeMore")}
                  </button>
                </div>
              )}

              {answer.ideas.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm leading-6 text-blumea-slate">{t("idea.noIdeas")}</p>}

              {answer.ideas.map((item, index) => (
                <article key={index} className="rounded-2xl border border-blumea-blue/25 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blumea-blue">{t("idea.ideaN", { n: index + 1 })}</p>
                  <p className="mt-1 text-base font-semibold leading-6 text-blumea-navy">{item.idea}</p>

                  <p className="mt-3 text-xs font-semibold text-blumea-navy">{t("idea.basedOn")}</p>
                  <ul className="mt-1 space-y-1.5">
                    {item.evidence.map((evidence) => (
                      <li key={evidence.id} className="rounded-xl bg-slate-50/70 px-3 py-2 text-xs leading-5 text-blumea-slate">
                        {evidence.text}
                        {evidence.videoId && (
                          <AppLink href={`/analysis/${evidence.videoId}`} className="ms-2 font-semibold text-blumea-blue hover:opacity-70">
                            {t("compare.openAnalysis")}
                          </AppLink>
                        )}
                      </li>
                    ))}
                  </ul>

                  <dl className="mt-3 space-y-1.5 text-sm leading-6 text-blumea-slate">
                    {[
                      [t("idea.keep"), item.keep],
                      [t("idea.change"), item.change],
                      [t("idea.howKnow"), item.howToKnow],
                      [t("idea.limitLabel"), item.limit],
                    ].map(([label, value]) =>
                      value ? (
                        <div key={label}>
                          <dt className="inline font-semibold text-blumea-navy">{label}: </dt>
                          <dd className="inline">{value}</dd>
                        </div>
                      ) : null
                    )}
                  </dl>
                  {saveButtons(`idea-${index}`, { source: "blumea", title: item.idea, details: { keep: item.keep, change: item.change, howToKnow: item.howToKnow, limit: item.limit, evidence: item.evidence } })}
                </article>
              ))}

              {answer.creative && (
                <article className="rounded-2xl border border-dashed border-blumea-blue/40 bg-blumea-mist/40 p-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb size={16} className="text-blumea-blue" />
                    <p className="text-sm font-semibold text-blumea-navy">{t("idea.creativeTitle")}</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-blumea-blue">{t("idea.creativeLabel")}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-blumea-slate">{t("idea.creativeIntro")}</p>
                  <ul className="mt-3 space-y-3">
                    {answer.creative.ideas.map((item, index) => (
                      <li key={index} className="rounded-xl bg-white p-3 text-sm leading-6 text-blumea-navy">
                        <p>
                          <span className="text-blumea-slate">{t("idea.creativeHook")}: </span>
                          <span className="font-semibold">{quote(item.hook)}</span>
                          <span className="ms-2 rounded-full bg-blumea-mist px-2 py-0.5 text-[10px] font-semibold text-blumea-blue">{item.typeLabel}</span>
                        </p>
                        <p className="mt-1">
                          <span className="text-blumea-slate">{t("idea.creativeTodo")}: </span>
                          {item.todo}
                        </p>
                        {item.fits && <p className="mt-0.5 text-xs leading-5 text-blumea-slate">{item.fits}</p>}
                        {saveButtons(`creative-${index}`, { source: "creative", title: item.todo, details: { hook: item.hook, type: item.type, fits: item.fits } })}
                      </li>
                    ))}
                  </ul>
                </article>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-xs text-blumea-slate">{answer.cap !== null ? t("idea.usedOf", { used: answer.used, cap: answer.cap }) : ""}</p>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={reset} className="text-sm font-semibold text-blumea-blue hover:opacity-70">
                    {t("idea.changePlatform")}
                  </button>
                  <button type="button" onClick={() => platform && ask(platform)} className="rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue">
                    {t("idea.another")}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="blumea-step mt-4">
              <p className="text-sm leading-6 text-blumea-slate">{t("idea.subtitle")}</p>
              <p className="mt-4 text-sm font-semibold text-blumea-navy">{t("idea.pickPlatform")}</p>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {platforms.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => ask(item)}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-blumea-navy transition-all hover:-translate-y-0.5 hover:border-blumea-blue hover:shadow-sm"
                  >
                    <PlatformIcon platform={item as "youtube" | "tiktok"} size={18} />
                    {platformName(item, t)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
