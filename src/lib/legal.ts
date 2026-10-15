// Shared facts for the public legal pages (/privacy, /terms) and the site footer.
// The contact address comes from the environment so no address is invented in
// code; until it is set, the pages say how to reach Blumea through the product.

export const LEGAL_EFFECTIVE_DATE = "October 10, 2026";

// The same date, formatted in the reader's language.
export function legalEffectiveDate(locale: string): string {
  return new Date("2026-10-10T12:00:00Z").toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export const CONTACT_EMAIL: string | null = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;
