import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localeFromAcceptLanguage, type Locale } from "./config";
import en from "./dictionaries/en";
import he from "./dictionaries/he";
import { makeTranslator } from "./translate";

export const dictionaries = { en, he };

// The language of this request: the saved choice, else the browser's language.
export async function getLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return localeFromAcceptLanguage((await headers()).get("accept-language"));
}

// For server components: const t = await getT();
export async function getT() {
  const locale = await getLocale();
  return makeTranslator(locale, dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE]);
}

// For route handlers, which only have the request's cookie header.
export function localeFromRequest(request: Request): Locale {
  const match = /(?:^|;\s*)blumea_lang=([^;]+)/.exec(request.headers.get("cookie") ?? "");
  if (match && isLocale(match[1])) return match[1];
  return localeFromAcceptLanguage(request.headers.get("accept-language"));
}
