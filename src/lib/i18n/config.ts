// Languages the product speaks. The language is a choice of the person using it, kept in a
// cookie (so server pages, route handlers and client components all read the same thing);
// the first visit follows the browser's language.
export const LOCALES = ["en", "he"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "blumea_lang";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return locale === "he" ? "rtl" : "ltr";
}

// "he-IL,he;q=0.9,en;q=0.8" -> "he"; anything we do not speak -> default
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase().split("-")[0];
    if (tag === "iw") return "he";
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}
