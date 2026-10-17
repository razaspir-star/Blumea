"use client";

import { useState } from "react";
import BlumeaFlowerLoader from "@/components/BlumeaFlowerLoader";
import { supabase } from "@/lib/supabase";
import { shortTitle } from "@/lib/video-ref";
import VideoText from "@/components/VideoText";
import AppLink from "@/components/AppLink";
import { useT } from "@/lib/i18n/client";
import type { HookText } from "@/lib/compare-deep";

type Analysis = { differences: { aspect: string; a: string; b: string }[]; diffs: string[]; recommendations: string[]; formatCompare: { a: string; b: string } | null };

// The hook of each video (what it writes on screen and says or sings in the first seconds),
// side by side, and a button that analyzes how the two hooks differ and what is worth trying.
// The analysis is a small AI text call, made only when the creator presses the button.
export default function WordingCompare({
  idA,
  idB,
  titleA,
  titleB,
  hooks,
}: {
  idA: string;
  idB: string;
  titleA: string;
  titleB: string;
  hooks: { a: HookText; b: HookText };
}) {
  const t = useT();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const quote = (text: string) => (t.locale === "he" ? `״${text}״` : `“${text}”`);

  async function run() {
    setState("loading");
    setError(null);
    const { data } = await supabase.auth.getSession();
    const response = await fetch("/api/compare/wording", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify({ a: idA, b: idB }),
    }).catch(() => null);
    const body = response ? await response.json().catch(() => null) : null;
    if (!response || !response.ok || !body) {
      setError(body?.error ?? t("compare.wordingFailed"));
      setState("error");
      return;
    }
    setResult(body as Analysis);
    setState("done");
  }

  const hookBlock = (label: string, title: string, hook: HookText) => (
    <div className="rounded-xl bg-slate-50/70 p-3">
      <p className="text-xs font-semibold text-blumea-blue">
        {label} <span className="font-normal text-blumea-slate">· {quote(shortTitle(title, 40))}</span>
      </p>
      {hook.onScreen === null && hook.spoken === null && hook.sung === null ? (
        <p className="mt-1.5 text-sm leading-6 text-blumea-slate">{t("compare.hookEmpty")}</p>
      ) : (
        <div className="mt-1.5 space-y-1 text-sm leading-6 text-blumea-navy">
          {hook.onScreen !== null && (
            <p>
              <span className="text-blumea-slate">{t("compare.hookOnScreen")}: </span>
              {quote(hook.onScreen)}
            </p>
          )}
          {hook.spoken !== null && (
            <p>
              <span className="text-blumea-slate">{t("compare.hookSpoken")}: </span>
              {quote(hook.spoken)}
            </p>
          )}
          {hook.sung !== null && (
            <p>
              <span className="text-blumea-slate">{t("compare.hookSung")}: </span>
              {quote(hook.sung)}
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-4 rounded-2xl border border-blumea-blue/25 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-blumea-navy">{t("compare.wordingTitle")}</p>
      <div className="mt-3 space-y-3">
        {hookBlock(t("compare.videoA"), titleA, hooks.a)}
        {hookBlock(t("compare.videoB"), titleB, hooks.b)}
      </div>
      <p className="mt-2 text-xs leading-5 text-blumea-slate">{t("compare.hookNote")}</p>

      {(state === "idle" || state === "error") && (
        <>
          <p className="mt-4 text-sm leading-6 text-blumea-slate">{t("compare.wordingBody")}</p>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <button
            type="button"
            onClick={run}
            className="mt-3 rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
          >
            {t("compare.wordingButton")}
          </button>
        </>
      )}

      {state === "loading" && (
        <div className="blumea-step mt-4 flex items-center gap-3">
          <BlumeaFlowerLoader size={28} />
          <p className="text-sm text-blumea-slate">{t("compare.wordingLoading")}</p>
        </div>
      )}

      {state === "done" && result && (
        <div className="blumea-reveal-down mt-4">
          <p className="text-sm font-semibold text-blumea-navy">{t("compare.wordingResult")}</p>
          {result.differences.length === 0 ? (
            <p className="mt-2 text-sm leading-6 text-blumea-slate">{t("compare.wordingNone")}</p>
          ) : (
            <ul className="mt-2 space-y-2.5">
              {result.differences.map((item) => (
                <li key={item.aspect} className="text-sm leading-6 text-blumea-navy">
                  <span className="font-semibold">{item.aspect}</span>
                  <p>
                    <span className="text-blumea-slate">{t("compare.videoA")}: </span>
                    {item.a}
                  </p>
                  <p>
                    <span className="text-blumea-slate">{t("compare.videoB")}: </span>
                    {item.b}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {result.diffs.length > 0 && (
            <>
              <p className="mt-4 text-sm font-semibold text-blumea-navy">{t("compare.diffTitle")}</p>
              <ul className="mt-2 space-y-2">
                {result.diffs.map((line) => (
                  <li key={line} className="text-sm leading-6 text-blumea-navy">
                    <VideoText text={line} />
                  </li>
                ))}
              </ul>
            </>
          )}
          {result.recommendations.length > 0 && (
            <>
              <p className="mt-4 text-sm font-semibold text-blumea-navy">{t("compare.recTitle")}</p>
              <div className="mt-2 space-y-2">
                {result.recommendations.map((line) => (
                  <p key={line} className="rounded-xl border border-blumea-blue/25 bg-blumea-mist/60 p-3 text-sm leading-6 text-blumea-navy">
                    <VideoText text={line} />
                  </p>
                ))}
              </div>
              {result.formatCompare && (
                <AppLink
                  href={`/compare/group/format/${result.formatCompare.a}/${result.formatCompare.b}`}
                  className="mt-3 inline-block rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
                >
                  {t("compare.formatLink")}
                </AppLink>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
