import type { Dictionary } from "./en";
import auth from "./he/auth";

// Hebrew texts, same keys as en.ts. Plain, short, spoken-style Hebrew; platform names (YouTube, TikTok)
// and the product name stay in English.
const he: Dictionary = {
  ...auth,
  common: {
    language: "שפה",
    english: "English",
    hebrew: "עברית",
    signOut: "התנתקות",
    yourAccount: "החשבון שלך",
  },
  nav: {
    dashboard: "לוח בקרה",
    content: "תכנים",
    insights: "תובנות",
    connections: "חיבורים",
    settings: "הגדרות",
  },
};

export default he;
