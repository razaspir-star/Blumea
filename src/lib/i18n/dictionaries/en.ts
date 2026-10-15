// English texts. This file defines the shape: Hebrew (he.ts) must have exactly the same keys.
// Texts live in one module per area (en/*.ts); add a module, then spread it here and in he.ts.
import auth from "./en/auth";
import onboarding from "./en/onboarding";
import dashboard from "./en/dashboard";
import analysis from "./en/analysis";
import library from "./en/library";
import insights from "./en/insights";
import insightsUi from "./en/insights-ui";
import pages from "./en/pages";
import tiktok from "./en/tiktok";
import connections from "./en/connections";
import home from "./en/home";
import errors from "./en/errors";

const en = {
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
  common: {
    language: "Language",
    english: "English",
    hebrew: "עברית",
    signOut: "Sign out",
    yourAccount: "Your account",
    loading: "Loading Blumea...",
  },
  nav: {
    dashboard: "Dashboard",
    content: "Content",
    insights: "Insights",
    connections: "Connections",
    settings: "Settings",
  },
};

export type Dictionary = typeof en;
export default en;
