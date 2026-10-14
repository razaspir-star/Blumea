// English texts. This file defines the shape: Hebrew (he.ts) must have exactly the same keys.
// Texts live in one module per area (en/*.ts); add a module, then spread it here and in he.ts.
import auth from "./en/auth";
import onboarding from "./en/onboarding";
import dashboard from "./en/dashboard";
import analysis from "./en/analysis";

const en = {
  ...auth,
  ...onboarding,
  ...dashboard,
  ...analysis,
  common: {
    language: "Language",
    english: "English",
    hebrew: "עברית",
    signOut: "Sign out",
    yourAccount: "Your account",
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
