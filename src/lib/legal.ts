// Shared facts for the public legal pages (/privacy, /terms) and the site footer.
// The public contact address (a real mailbox, set up 2026-10-18). NEXT_PUBLIC_CONTACT_EMAIL overrides it;
// set it to an empty value to hide the address and fall back to "through the product" wording.

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

export const CONTACT_EMAIL: string | null = (process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@blumea.io").trim() || null;
