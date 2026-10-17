"use client";

import Image from "next/image";
import { useAppRouter } from "@/lib/use-app-router";
import LanguageSwitch from "@/components/LanguageSwitch";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n/client";

// Shown to someone who signed in but is not on the guest list yet.
export default function BetaWaiting() {
  const t = useT();
  const router = useAppRouter();
  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-white to-sky-50 px-6 py-10">
      <div className="flex w-full max-w-md items-center justify-between">
        <Image src="/blumea-logo-v2.png" alt="Blumea" width={56} height={56} />
        <LanguageSwitch />
      </div>
      <div className="mt-10 w-full max-w-md rounded-3xl border border-slate-200/70 bg-white p-7 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-blumea-navy">{t("beta.waitingTitle")}</h1>
        <p className="mt-3 text-sm leading-6 text-blumea-slate">{t("beta.waitingBody")}</p>
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/login");
          }}
          className="mt-6 text-sm font-semibold text-blumea-blue hover:opacity-70"
        >
          {t("common.signOut")}
        </button>
      </div>
    </main>
  );
}
