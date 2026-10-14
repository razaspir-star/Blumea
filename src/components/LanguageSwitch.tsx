"use client";

import { useRouter } from "next/navigation";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { useT } from "@/lib/i18n/client";

// English | עברית. The server remembers the choice in a cookie for a year, then the page is refreshed in the new language.
export default function LanguageSwitch({ className = "" }: { className?: string }) {
  const t = useT();
  const router = useRouter();

  async function choose(locale: Locale) {
    if (locale === t.locale) return;
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    router.refresh();
  }

  const label: Record<Locale, string> = { en: t("common.english"), he: t("common.hebrew") };

  return (
    <div
      role="group"
      aria-label={t("common.language")}
      className={`inline-flex rounded-full border border-slate-200 bg-white p-0.5 text-xs font-semibold ${className}`}
    >
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-pressed={locale === t.locale}
          onClick={() => choose(locale)}
          className={`rounded-full px-3 py-1 transition-colors ${
            locale === t.locale ? "bg-blumea-navy text-white" : "text-blumea-slate hover:text-blumea-navy"
          }`}
        >
          {label[locale]}
        </button>
      ))}
    </div>
  );
}
