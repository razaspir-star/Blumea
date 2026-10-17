"use client";

import type { ReactNode } from "react";
import AppLink from "@/components/AppLink";
import { Lock } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { useCompareAccess } from "@/lib/use-compare-access";
import type { CompareAccess } from "@/lib/compare-access";

// What a creator who cannot open a comparison is told: the free allowance is used up, or it is part of Pro.
export function lockedText(access: CompareAccess, t: ReturnType<typeof useT>) {
  const free = access.cap !== null && access.cap > 0 && access.used >= access.cap;
  if (!free) return { title: t("compare.lockedTitle"), body: t("compare.lockedBody") };
  const date = new Date(access.resetsOn).toLocaleDateString(t.locale === "he" ? "he-IL" : "en-US", { month: "long", day: "numeric", timeZone: "UTC" });
  return { title: t("compare.freeUsedTitle"), body: t("compare.freeUsedBody", { cap: access.cap ?? 0, date }) };
}

export function LockedCard({ access }: { access: CompareAccess }) {
  const t = useT();
  const text = lockedText(access, t);
  return (
    <div className="absolute inset-x-0 top-24 mx-auto max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blumea-mist text-blumea-blue">
        <Lock size={18} strokeWidth={1.8} />
      </div>
      <h2 className="mt-3 text-lg font-semibold text-blumea-navy">{text.title}</h2>
      <p className="mt-2 text-sm leading-6 text-blumea-slate">{text.body}</p>
    </div>
  );
}

// A free creator's note on how many free comparisons they have used this month.
export function FreeAllowanceNote({ access }: { access: CompareAccess }) {
  const t = useT();
  if (access.plan !== "free" || access.cap === null || access.cap <= 0) return null;
  return <p className="mt-2 text-xs text-blumea-slate">{t("compare.freeUsed", { used: access.used, cap: access.cap })}</p>;
}

// The shell of a comparison page: title, then the comparison itself. A creator who may not open it (free
// allowance used up) sees their own comparison blurred under a note; everyone else sees it in full.
export default function CompareFrame({ title, subtitle, accessKey, children }: { title: string; subtitle: string; accessKey: string; children: ReactNode }) {
  const t = useT();
  const access = useCompareAccess(accessKey);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <AppLink href="/content" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70">
        {t("compare.back")}
      </AppLink>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">{title}</h1>
      <p className="mt-2 text-blumea-slate">{subtitle}</p>

      {access === null ? (
        <p className="mt-8 text-sm text-blumea-slate">{t("compare.loading")}</p>
      ) : access.allowed ? (
        <>
          <FreeAllowanceNote access={access} />
          {children}
        </>
      ) : (
        <div className="relative">
          <div aria-hidden className="pointer-events-none select-none blur-[6px]">
            {children}
          </div>
          <LockedCard access={access} />
        </div>
      )}
    </div>
  );
}
