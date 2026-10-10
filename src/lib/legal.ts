// Shared facts for the public legal pages (/privacy, /terms) and the site footer.
// The contact address comes from the environment so no address is invented in
// code; until it is set, the pages say how to reach Blumea through the product.

export const LEGAL_EFFECTIVE_DATE = "October 10, 2026";

export const CONTACT_EMAIL: string | null = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;
