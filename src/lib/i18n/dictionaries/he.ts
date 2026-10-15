import type { Dictionary } from "./en";
import auth from "./he/auth";
import onboarding from "./he/onboarding";
import dashboard from "./he/dashboard";
import analysis from "./he/analysis";
import library from "./he/library";
import insights from "./he/insights";
import insightsUi from "./he/insights-ui";
import pages from "./he/pages";
import tiktok from "./he/tiktok";
import connections from "./he/connections";
import home from "./he/home";

// Hebrew texts, same keys as en.ts. Plain, short, spoken-style Hebrew; platform names (YouTube, TikTok)
// and the product name stay in English.
const he: Dictionary = {
  ...auth,
  ...onboarding,
  ...dashboard,
  ...analysis,
  ...library,
  ...insights,
  ...insightsUi,
  ...pages,
  ...tiktok,
  ...connections,
  ...home,
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
