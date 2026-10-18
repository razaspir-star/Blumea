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
import errors from "./he/errors";
import compare from "./he/compare";
import compare2 from "./he/compare2";
import idea from "./he/idea";
import beta from "./he/beta";
import admin from "./he/admin";
import historyTexts from "./he/history";
import feedbackTexts from "./he/feedback";

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
  ...errors,
  ...compare,
  ...compare2,
  ...idea,
  ...beta,
  ...admin,
  ...historyTexts,
  ...feedbackTexts,
  common: {
    language: "שפה",
    english: "English",
    hebrew: "עברית",
    signOut: "התנתקות",
    yourAccount: "החשבון שלך",
    loading: "טוען את Blumea...",
  },
  nav: {
    dashboard: "לוח בקרה",
    content: "תכנים",
    history: "ניתוחים",
    insights: "תובנות",
    connections: "חיבורים",
    ideas: "רעיונות",
    admin: "ניהול",
    settings: "הגדרות",
  },
};

export default he;
