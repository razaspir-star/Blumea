"use client";

import { useState } from "react";
import { useAppRouter } from "@/lib/use-app-router";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/components/AppShell";
import LanguageSwitch from "@/components/LanguageSwitch";
import { useT } from "@/lib/i18n/client";
import type { TextKey } from "@/lib/i18n/translate";

const PLATFORM_NAMES: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
};

// What the person picked at onboarding: goals and categories come from the dictionaries by id,
// platform names stay as they are.
function Chips({ ids, group }: { ids: string[] | null; group: "goal" | "category" | "platform" }) {
  const t = useT();

  if (!ids || ids.length === 0) {
    return <p className="mt-2 text-sm text-blumea-slate">{t("settings.nothing")}</p>;
  }

  const label = (id: string) => {
    if (group === "platform") return PLATFORM_NAMES[id] ?? id;
    const key = `onboarding.${group}.${id}`;
    return t.has(key) ? t(key as TextKey) : id;
  };

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {ids.map((id) => (
        <span key={id} className="rounded-full bg-blumea-mist px-3 py-1.5 text-sm font-medium text-blumea-navy">
          {label(id)}
        </span>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const t = useT();
  const router = useAppRouter();
  const profile = useProfile();

  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setDeleting(false);
      setDeleteError(t("settings.notSignedIn"));
      return;
    }

    const response = await fetch("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE" }),
    });

    if (!response.ok) {
      setDeleting(false);
      setDeleteError(t("settings.wrong"));
      return;
    }

    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">
        {t("settings.title")}
      </h1>

      <p className="mt-2 text-blumea-slate">{t("settings.subtitle")}</p>

      <section className="mt-8 space-y-4 pb-6">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-blumea-navy">{t("settings.profile")}</h2>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-blumea-slate">
            {t("settings.name")}
          </p>

          <p className="mt-1 text-sm text-blumea-navy">{profile.full_name?.trim() || t("settings.notSet")}</p>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-blumea-navy">{t("settings.setup")}</h2>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-blumea-slate">
            {t("settings.goals")}
          </p>

          <Chips ids={profile.goals} group="goal" />

          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-blumea-slate">
            {t("settings.categories")}
          </p>

          <Chips ids={profile.content_categories} group="category" />

          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-blumea-slate">
            {t("settings.platforms")}
          </p>

          <Chips ids={profile.platforms} group="platform" />

          <p className="mt-5 text-xs text-blumea-slate">{t("settings.editingSoon")}</p>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-blumea-navy">{t("settings.language")}</h2>

          <p className="mt-2 text-sm text-blumea-slate">{t("settings.languageNote")}</p>

          <LanguageSwitch className="mt-3" />
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-blumea-navy">{t("settings.data")}</h2>

          <p className="mt-2 text-sm leading-6 text-blumea-slate">{t("settings.dataBody1")}</p>

          <p className="mt-3 text-sm leading-6 text-blumea-slate">{t("settings.dataBody2")}</p>

          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="mt-4 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              {t("settings.deleteBtn")}
            </button>
          ) : (
            <div className="mt-4 rounded-2xl bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">{t("settings.cannotUndo")}</p>

              <p className="mt-1 text-sm text-red-700">{t("settings.typeDelete")}</p>

              <input
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                aria-label={t("settings.typeDeleteLabel")}
                dir="ltr"
                className="mt-3 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm"
              />

              {deleteError && <p className="mt-2 text-sm text-red-700">{deleteError}</p>}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={confirmText !== "DELETE" || deleting}
                  onClick={handleDelete}
                  className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                >
                  {deleting ? t("settings.deleting") : t("settings.deleteEverything")}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    setConfirmText("");
                    setDeleteError(null);
                  }}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-blumea-navy"
                >
                  {t("settings.cancel")}
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-blumea-navy transition-colors hover:border-blumea-blue hover:text-blumea-blue"
        >
          {t("common.signOut")}
        </button>
      </section>
    </div>
  );
}
