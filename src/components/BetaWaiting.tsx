"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useAppRouter } from "@/lib/use-app-router";
import LanguageSwitch from "@/components/LanguageSwitch";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n/client";
import { CONTACT_EMAIL } from "@/lib/legal";

// Shown to someone who signed in but is not on the guest list yet.
export default function BetaWaiting() {
  const t = useT();
  const router = useAppRouter();
  const [checking, setChecking] = useState(false);

  // Approval happens on the owner's side, so the screen looks again by itself and lets the creator in the moment it changes.
  const check = useCallback(async () => {
    setChecking(true);
    const { data } = await supabase.auth.getSession();
    const response = await fetch("/api/access/status", { headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` } }).catch(() => null);
    const body = response?.ok ? await response.json().catch(() => null) : null;
    if (body?.approved) window.location.reload();
    else setChecking(false);
  }, []);

  useEffect(() => {
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, [check]);
  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-white to-sky-50 px-6 py-10">
      <div className="flex w-full max-w-md items-center justify-between">
        <Image src="/blumea-logo-v2.png" alt="Blumea" width={56} height={56} />
        <LanguageSwitch />
      </div>
      <div className="mt-10 w-full max-w-md rounded-3xl border border-slate-200/70 bg-white p-7 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-blumea-navy">{t("beta.waitingTitle")}</h1>
        <p className="mt-3 text-sm leading-6 text-blumea-slate">{t("beta.waitingBody")}</p>
        {CONTACT_EMAIL && (
          <p className="mt-3 text-sm text-blumea-slate">
            {t("beta.waitingContact")}{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" className="font-semibold text-blumea-blue">
              {CONTACT_EMAIL}
            </a>
          </p>
        )}
        <button
          type="button"
          onClick={check}
          disabled={checking}
          className="mt-6 rounded-full bg-blumea-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-blumea-blue-hover disabled:opacity-60"
        >
          {t("beta.checkAgain")}
        </button>
        <br />
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/login");
          }}
          className="mt-4 text-sm font-semibold text-blumea-slate hover:opacity-70"
        >
          {t("common.signOut")}
        </button>
      </div>
    </main>
  );
}
