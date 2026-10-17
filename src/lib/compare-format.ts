import { formatCount, formatTime } from "@/lib/format";
import type { MetricFormat } from "@/lib/compare-insights";
import type { Translator } from "@/lib/i18n/translate";

// How a number from a comparison is written, in the reader's language.
export function show(value: number | string | null, format: MetricFormat, t: Translator): string {
  if (value === null) return t("compare.notAvailable");
  if (typeof value === "string") {
    if (format === "date") return new Date(value).toLocaleDateString(t.locale === "he" ? "he-IL" : "en-US", { month: "short", day: "numeric", year: "numeric" });
    return value;
  }
  switch (format) {
    case "count":
      return formatCount(value);
    case "percent":
      return `${Math.round(value)}%`;
    case "seconds":
      return t("compare.seconds", { n: Math.round(value) });
    case "clock":
      return formatTime(value);
    default:
      return value.toFixed(2).replace(/\.?0+$/, "");
  }
}

// Which side wins on a row: only when both numbers exist and are clearly apart.
export function leader(a: number | string | null, b: number | string | null, higherIsBetter = true): "a" | "b" | null {
  if (!higherIsBetter || typeof a !== "number" || typeof b !== "number") return null;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi <= 0 || (lo > 0 && hi / lo < 1.1)) return null;
  return a > b ? "a" : "b";
}
