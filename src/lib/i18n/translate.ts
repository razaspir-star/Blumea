import type { Dictionary } from "./dictionaries/en";
import type { Locale } from "./config";

// Every dotted path to a text in the dictionary: "nav.dashboard", "login.title", ...
type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

export type TextKey = Paths<Dictionary>;
export type Params = Record<string, string | number>;

function lookup(dict: Dictionary, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === "string" ? node : undefined;
}

function fill(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

export type Translator = {
  (key: TextKey, params?: Params): string;
  // Pick by number: looks for "<key>_zero" (when count is 0 and it exists), "<key>_one", "<key>_two" (Hebrew), "<key>_other".
  plural: (key: string, count: number, params?: Params) => string;
  locale: Locale;
};

export function makeTranslator(locale: Locale, dict: Dictionary): Translator {
  const rules = new Intl.PluralRules(locale);
  const t = ((key: TextKey, params?: Params) => fill(lookup(dict, key) ?? key, params)) as Translator;
  t.locale = locale;
  t.plural = (key, count, params) => {
    const candidates = [...(count === 0 ? [`${key}_zero`] : []), `${key}_${rules.select(count)}`, `${key}_other`];
    for (const candidate of candidates) {
      const text = lookup(dict, candidate);
      if (text !== undefined) return fill(text, { count, ...params });
    }
    return key;
  };
  return t;
}
