"use client";

import type { ReactNode } from "react";
import AppLink from "@/components/AppLink";
import { useProfile } from "@/components/AppShell";
import { Lock } from "lucide-react";
import { useT } from "@/lib/i18n/client";

// The shell of a comparison page: title, then the comparison itself. Creators on the
// free plan see their own comparison blurred under a note about Blumea Pro (a locked
// preview); Pro and the owner see it in full.
export default function CompareFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const t = useT();
  const profile = useProfile();
  const unlocked = profile.plan === "pro" || profile.plan === "owner";

  return (
    <div className="mx-auto w-full max-w-4xl">
      <AppLink href="/content" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70">
        {t("compare.back")}
      </AppLink>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">{title}</h1>
      <p className="mt-2 text-blumea-slate">{subtitle}</p>

      {unlocked ? (
        children
      ) : (
        <div className="relative">
          <div aria-hidden className="pointer-events-none select-none blur-[6px]">
            {children}
          </div>
          <div className="absolute inset-x-0 top-24 mx-auto max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blumea-mist text-blumea-blue">
              <Lock size={18} strokeWidth={1.8} />
            </div>
            <h2 className="mt-3 text-lg font-semibold text-blumea-navy">{t("compare.lockedTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-blumea-slate">{t("compare.lockedBody")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
