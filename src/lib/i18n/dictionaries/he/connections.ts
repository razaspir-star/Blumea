import type { Dictionary } from "../en";

const connections: Dictionary["connections"] = {
  title: "חיבורים",
  subtitle: "מחברים את החשבונות ש-Blumea תקרא. אפשר להתנתק בכל רגע.",
  youtubeConnected: "YouTube מחובר.",
  tiktokConnected: "TikTok מחובר.",
  errMissing: "החיבור לא הושלם. כדאי לנסות שוב.",
  errExpired: "קישור החיבור פג תוקף. כדאי לנסות שוב.",
  errGoogleToken: "Google לא קיבלה את החיבור. כדאי לנסות שוב.",
  errTiktokToken: "TikTok לא קיבלה את החיבור. כדאי לנסות שוב.",
  errGoogleRefresh: "Google לא העניקה גישה מתמשכת - כדאי לנסות שוב ולאשר את ההרשאות.",
  errTiktokRefresh: "TikTok לא העניקה גישה מתמשכת. כדאי לנסות שוב.",
  errSave: "משהו השתבש בשמירת החיבור. כדאי לנסות שוב.",
  errDenied: "החיבור בוטל.",
  errGeneric: "משהו השתבש.",
  connected: "מחובר",
  needsReconnect: "צריך לחבר מחדש",
  notConnected: "לא מחובר",
  comingLater: "בקרוב",
  reconnect: "חיבור מחדש",
  disconnect: "ניתוק",
  connect: "חיבור",
  connecting: "מתחבר…",
  whatAnalyze: "מה Blumea יכולה לנתח",
  viewerBehavior: "התנהגות הצופים",
  requires: "דרישות",
  youtubeAnalysis: "ניתוח מלא, אוטומטית.",
  youtubeBehavior: "שימור מלא, שנייה אחרי שנייה.",
  tiktokAnalysis: "מעלים סרטון ששמרתם מ-TikTok לניתוח מלא.",
  tiktokBehavior: "TikTok לא משתפת זמן צפייה עם אפליקציות, ולכן Blumea לא יכולה להראות איך הצופים צפו.",
};

const connectionTexts = { connections };
export default connectionTexts;
