"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";

// "Request access" on the homepage: the private beta is by guest list.
export default function AccessRequestForm() {
  const t = useT();
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("sending");
    const response = await fetch("/api/access/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    }).catch(() => null);
    setState(response?.ok ? "done" : "error");
  }

  const field = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-blumea-navy";

  return (
    <div id="request-access" className="rounded-3xl border border-slate-200/70 bg-white p-7 shadow-sm">
      <h2 className="text-2xl font-semibold text-blumea-navy">{t("beta.formTitle")}</h2>
      <p className="mt-2 text-sm leading-6 text-blumea-slate">{t("beta.formBody")}</p>

      {state === "done" ? (
        <p className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">{t("beta.formDone")}</p>
      ) : (
        <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-blumea-navy sm:col-span-2">
            {t("beta.fieldEmail")}
            <input name="email" type="email" required maxLength={200} className={field} />
          </label>
          <label className="text-xs font-semibold text-blumea-navy">
            {t("beta.fieldPlatform")}
            <select name="platform" defaultValue="both" className={field}>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="both">YouTube + TikTok</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-blumea-navy">
            {t("beta.fieldHandle")}
            <input name="handle" maxLength={120} className={field} />
          </label>
          <label className="text-xs font-semibold text-blumea-navy sm:col-span-2">
            {t("beta.fieldNiche")}
            <input name="niche" maxLength={120} className={field} />
          </label>
          {/* a field only robots fill in */}
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          <div className="sm:col-span-2">
            {state === "error" && <p className="mb-3 text-sm text-rose-700">{t("beta.formError")}</p>}
            <button
              type="submit"
              disabled={state === "sending"}
              className="rounded-full bg-blumea-blue px-6 py-3 text-sm font-semibold text-white transition hover:bg-blumea-blue-hover disabled:opacity-60"
            >
              {t("beta.formSend")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
