"use client";

import { useCallback, useEffect, useState } from "react";
import AppLink from "@/components/AppLink";
import IdeaButton from "@/components/IdeaButton";
import IdeaTrials from "@/components/IdeaTrials";
import { PlatformIcon } from "@/components/PlatformBadge";
import { useProfile } from "@/components/AppShell";
import { loadDashboardData, type DashboardVideo } from "@/lib/dashboard-data";
import { groupOptions } from "@/lib/compare-groups";
import { FORMATS, formatLabel } from "@/lib/format-library";
import type { TextKey } from "@/lib/i18n/translate";
import { platformName } from "@/lib/platform-capabilities";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n/client";

type SavedIdea = {
  id: string;
  platform: string;
  title: string;
  source: "blumea" | "creative" | "mine";
  format: string | null;
  details: { hook?: string; keep?: string; change?: string };
  created_at: string;
};

const COLUMNS = "id, platform, title, source, format, details, created_at";

// The ideas page: the ideas the creator liked from Blumea Idea (kept for later), the creator's own ideas
// (free text, optionally in one of their formats), and the ideas being tried (the same card as the Dashboard).
export default function IdeasPage() {
  const t = useT();
  const profile = useProfile();
  const [videos, setVideos] = useState<DashboardVideo[] | null>(null);
  const [ideas, setIdeas] = useState<SavedIdea[] | null>(null);
  const [platform, setPlatform] = useState<string>("");
  const [format, setFormat] = useState<string>("");
  const [text, setText] = useState("");
  const [hook, setHook] = useState("");
  const [showOther, setShowOther] = useState(false);
  const [infoFor, setInfoFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("idea_trials").select(COLUMNS).eq("status", "saved").order("created_at", { ascending: false });
    setIdeas((data ?? []) as SavedIdea[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function first() {
      const [{ data }, dashboard] = await Promise.all([
        supabase.from("idea_trials").select(COLUMNS).eq("status", "saved").order("created_at", { ascending: false }),
        loadDashboardData(),
      ]);
      if (cancelled) return;
      setIdeas((data ?? []) as SavedIdea[]);
      setVideos(dashboard.videos);
      setPlatform((current) => current || dashboard.videos[0]?.platform || "youtube");
    }
    first();
    const onChange = () => load();
    window.addEventListener("blumea:idea-saved", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("blumea:idea-saved", onChange);
    };
  }, [load]);

  const platforms = [...new Set((videos ?? []).map((video) => video.platform))];
  const formats = videos && platform ? groupOptions(videos, "format", platform) : [];
  const myFormatIds = new Set(formats.map((item) => item.id));
  const otherFormats = FORMATS.filter((item) => item.id !== "other" && !myFormatIds.has(item.id));
  const liked = (ideas ?? []).filter((idea) => idea.source !== "mine");
  const mine = (ideas ?? []).filter((idea) => idea.source === "mine");

  async function change(id: string, status: "trying" | "dropped") {
    await supabase.from("idea_trials").update({ status }).eq("id", id).eq("profile_id", profile.id);
    await load();
    window.dispatchEvent(new Event("blumea:idea-saved"));
  }

  async function addMine() {
    if (!text.trim() || !platform) return;
    setBusy(true);
    await supabase.from("idea_trials").insert({
      profile_id: profile.id,
      platform,
      title: text.trim().slice(0, 600),
      source: "mine",
      status: "saved",
      format: format || null,
      details: { locale: t.locale, ...(hook.trim() ? { hook: hook.trim().slice(0, 200) } : {}) },
    });
    setText("");
    setHook("");
    setBusy(false);
    await load();
  }

  // A format to choose, with a small "i" that explains it. `count` is how many analyzed videos the creator has in it.
  const formatChip = (id: string, label: string, count: number | null) => (
    <span
      key={id || "none"}
      className={`mt-1.5 inline-flex items-center overflow-hidden rounded-full border text-xs font-semibold transition-colors ${
        format === id ? "border-blumea-blue bg-blumea-mist text-blumea-navy" : "border-slate-200 bg-white text-blumea-navy hover:border-blumea-blue/50"
      }`}
    >
      <button type="button" onClick={() => setFormat(id)} className="px-3 py-1.5">
        {label}
        {count !== null ? <span className="ms-1 font-normal text-blumea-slate">({count})</span> : null}
      </button>
      {id && (
        <button
          type="button"
          aria-label={t("idea.mineInfo")}
          title={t("idea.mineInfo")}
          onClick={() => setInfoFor(infoFor === id ? null : id)}
          className={`me-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] italic ${infoFor === id ? "bg-blumea-blue text-white" : "bg-slate-100 text-blumea-slate hover:bg-blumea-mist"}`}
        >
          i
        </button>
      )}
    </span>
  );

  const card = (idea: SavedIdea) => (
    <article key={idea.id} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-blumea-blue">
          {idea.source === "mine" ? t("idea.fromMine") : idea.source === "creative" ? t("idea.fromCreative") : t("idea.fromBlumea")}
          {idea.format ? ` · ${formatLabel(idea.format, t) ?? idea.format}` : ""}
        </p>
        <PlatformIcon platform={idea.platform as "youtube" | "tiktok"} size={16} />
      </div>
      <p className="mt-1.5 text-sm font-semibold leading-6 text-blumea-navy">{idea.title}</p>
      {idea.details.hook && (
        <p className="mt-1 text-sm leading-6 text-blumea-slate">
          <span className="text-blumea-slate">{t("idea.creativeHook")}: </span>
          {t.locale === "he" ? `״${idea.details.hook}״` : `“${idea.details.hook}”`}
        </p>
      )}
      {idea.details.change && (
        <p className="mt-1 text-sm leading-6 text-blumea-slate">
          <span className="font-semibold text-blumea-navy">{t("idea.change")}: </span>
          {idea.details.change}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => change(idea.id, "trying")} className="rounded-full bg-blumea-navy px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blumea-blue">
          {t("idea.tryNow")}
        </button>
        <button type="button" onClick={() => change(idea.id, "dropped")} className="text-xs font-semibold text-blumea-slate hover:opacity-70">
          {t("idea.removeIdea")}
        </button>
      </div>
    </article>
  );

  return (
    <div className="mx-auto w-full max-w-4xl pb-10">
      <AppLink href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70">
        {t("compare.back")}
      </AppLink>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">{t("idea.pageTitle")}</h1>
          <p className="mt-2 text-blumea-slate">{t("idea.pageSubtitle")}</p>
        </div>
        {videos && <IdeaButton platforms={platforms} />}
      </div>

      <div className="mt-8">{videos && <IdeaTrials videos={videos} />}</div>

      <section className="mt-6">
        <h2 className="text-xl font-semibold tracking-tight text-blumea-navy">{t("idea.likedTitle")}</h2>
        <div className="mt-3 space-y-3">
          {ideas === null ? (
            <p className="text-sm text-blumea-slate">{t("compare.loading")}</p>
          ) : liked.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm leading-6 text-blumea-slate">{t("idea.likedEmpty")}</p>
          ) : (
            liked.map(card)
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight text-blumea-navy">{t("idea.mineTitle")}</h2>
        <p className="mt-1 text-sm text-blumea-slate">{t("idea.mineHelp")}</p>

        <div className="mt-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-blumea-navy">
              {t("idea.minePlatform")}
              <select
                value={platform}
                onChange={(event) => {
                  setPlatform(event.target.value);
                  setFormat("");
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-blumea-navy"
              >
                {platforms.map((item) => (
                  <option key={item} value={item}>
                    {platformName(item, t)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-blumea-navy">{t("idea.mineFormat")}</p>
            {formatChip("", t("idea.mineNoFormat"), null)}
            {formats.length > 0 && <p className="mt-3 text-xs text-blumea-slate">{t("idea.mineMyFormats")}</p>}
            <div className="mt-1.5 flex flex-wrap gap-2">{formats.map((item) => formatChip(item.id, formatLabel(item.id, t) ?? item.id, item.count))}</div>
            <button type="button" onClick={() => setShowOther((current) => !current)} className="mt-3 text-xs font-semibold text-blumea-blue hover:opacity-70">
              {showOther ? "− " : "+ "}
              {t("idea.mineOtherFormats")}
            </button>
            {showOther && (
              <>
                <p className="mt-1 text-xs text-blumea-slate">{t("idea.mineOtherFormatsHelp")}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">{otherFormats.map((item) => formatChip(item.id, formatLabel(item.id, t) ?? item.id, null))}</div>
              </>
            )}
            {infoFor && (
              <p className="mt-3 rounded-xl bg-blumea-mist/60 px-3 py-2 text-xs leading-5 text-blumea-navy">
                <span className="font-semibold">{formatLabel(infoFor, t) ?? infoFor}: </span>
                {t(`idea.fmt_${infoFor}` as TextKey)}
              </p>
            )}
          </div>
          <label className="mt-4 block text-xs font-semibold text-blumea-navy">
            {t("idea.mineHook")}
            <input
              value={hook}
              onChange={(event) => setHook(event.target.value)}
              maxLength={200}
              placeholder={t("idea.mineHookPlaceholder")}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-blumea-navy"
            />
            <span className="mt-1 block text-[11px] font-normal text-blumea-slate">{t("idea.mineHookHelp")}</span>
          </label>
          <label className="mt-3 block text-xs font-semibold text-blumea-navy">
            {t("idea.mineText")}
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={3}
              maxLength={600}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal leading-6 text-blumea-navy"
            />
          </label>
          <button
            type="button"
            disabled={busy || !text.trim()}
            onClick={addMine}
            className={
              text.trim() && !busy
                ? "mt-3 rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
                : "mt-3 cursor-not-allowed rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-400"
            }
          >
            {t("idea.mineSave")}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {ideas !== null && mine.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm leading-6 text-blumea-slate">{t("idea.mineEmpty")}</p>
          ) : (
            mine.map(card)
          )}
        </div>
      </section>
    </div>
  );
}
