import type { Dictionary } from "../en";

const history: Dictionary["history"] = {
  title: "הניתוחים וההשוואות שלי",
  subtitle: "הסרטונים ש-Blumea קראה לאחרונה, וההשוואות שפתחת לאחרונה.",
  analysesTitle: "הסרטונים האחרונים שנותחו",
  analysesEmpty: "עוד לא נותח אף סרטון. בחר סרטון ו-Blumea תקרא אותו.",
  analyzeLink: "ניתוח סרטון",
  analyzedOn: "נותח ב-{date}",
  comparisonsTitle: "ההשוואות האחרונות",
  comparisonsEmpty: "עוד לא פתחת השוואה.",
  compareLink: "בחירת סרטונים להשוואה",
  unknownVideo: "סרטון",
  deep: "מעמיקה",
  cmpPair: "{a} מול {b}",
  cmpUsual: "מול הסרטונים האחרים שלך: {title}",
  cmpPlatforms: "פלטפורמה מול פלטפורמה",
  cmpFormats: "פורמט מול פורמט: {a} מול {b} ({platform})",
  cmpHooks: "הוק מול הוק: {a} מול {b} ({platform})",
  cmpBestHook: "איזה הוק עבד הכי טוב ב{format} ({platform})",
  cmpInside: "סרטונים עם ההוק {hook} ({platform})",
};

const historyTexts = { history };
export default historyTexts;
