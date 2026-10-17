"use client";

import { useState } from "react";
import BlumeaFlowerLoader from "@/components/BlumeaFlowerLoader";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n/client";

type Wording = { differences: { aspect: string; a: string; b: string }[]; suggestion: string | null };

// "Compare the wording": how the words of the two openings differ, and what is worth trying.
// A small AI text call, made only when the creator presses the button.
export default function WordingCompare({ idA, idB, titleA, titleB }: { idA: string; idB: string; titleA: string; titleB: string }) {
  const t = useT();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Wording | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setResult(body as Wording);
    setState("done");
  }

  return (
    <div className="mt-4">
      {(state === "idle" || state === "error") && (
        <div className="rounded-2xl border border-blumea-blue/25 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-blumea-navy">{t("compare.wordingTitle")}</p>
          <p className="mt-1 text-sm leading-6 text-blumea-slate">{t("compare.wordingBody")}</p>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <button
            type="button"
            onClick={run}
            className="mt-3 rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
          >
            {t("compare.wordingButton")}
          </button>
        </div>
      )}

      {state === "loading" && (
        <div className="blumea-step flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
          <BlumeaFlowerLoader size={28} />
          <p className="text-sm text-blumea-slate">{t("compare.wordingLoading")}</p>
        </div>
      )}

      {state === "done" && result && (
        <div className="blumea-reveal-down rounded-2xl border border-blumea-blue/25 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-blumea-navy">{t("compare.wordingTitle")}</p>
          {result.differences.length === 0 ? (
            <p className="mt-2 text-sm leading-6 text-blumea-slate">{t("compare.wordingNone")}</p>
          ) : (
            <div className="mt-3 space-y-3">
              {result.differences.map((item) => (
                <div key={item.aspect} className="rounded-xl bg-slate-50/70 p-3">
                  <p className="text-xs font-semibold text-blumea-blue">{item.aspect}</p>
                  <p className="mt-1.5 text-sm leading-6 text-blumea-navy">
                    <span className="font-semibold">{titleA}:</span> {item.a}
                  </p>
                  <p className="text-sm leading-6 text-blumea-navy">
                    <span className="font-semibold">{titleB}:</span> {item.b}
                  </p>
                </div>
              ))}
            </div>
          )}
          {result.suggestion && (
            <p className="mt-3 rounded-xl border border-blumea-blue/25 bg-blumea-mist/60 p-3 text-sm leading-6 text-blumea-navy">{result.suggestion}</p>
          )}
        </div>
      )}
    </div>
  );
}
