"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";
import { makeTranslator, type Translator } from "./translate";

const I18nContext = createContext<Translator | null>(null);

// The server layout reads the language once and hands the matching texts to every client component.
export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dictionary; children: ReactNode }) {
  const t = useMemo(() => makeTranslator(locale, dict), [locale, dict]);
  return <I18nContext.Provider value={t}>{children}</I18nContext.Provider>;
}

// const t = useT();  t("nav.dashboard")  t.plural("videos", 3)  t.locale
export function useT(): Translator {
  const t = useContext(I18nContext);
  if (!t) throw new Error("useT must be used inside I18nProvider");
  return t;
}
