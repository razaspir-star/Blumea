import type { Dictionary } from "../en";

const content: Dictionary["content"] = {
  title: "תכנים",
  subtitle: "הסרטונים שלך, עם המספרים שכל פלטפורמה מדווחת. אפשר לנתח סרטון כדי לראות מה Blumea הבינה.",
  usageUsedAll: "ניצלת את כל {cap} הניתוחים החינמיים החודש. הם מתחילים מחדש ב-{date}.",
  usageSome: "נוצלו {used} מתוך {cap} ניתוחים חינמיים החודש.",
  freeScan: "Blumea מציגה את 20 הסרטונים האחרונים שלך בכל פלטפורמה. Blumea Pro קוראת יותר.",
  refresh: "רענון הסרטונים שלי",
  refreshing: "מחפש…",
  analyze: "ניתוח סרטון",
  filterAll: "כל הפלטפורמות",
  loading: "טוען את הסרטונים שלך…",
  views: "{count} צפיות",
  likes: "{count} לייקים",
  numbersOnly: "מספרים בלבד",
  viewAnalysis: "לניתוח ←",
  analyzeThis: "לנתח את הסרטון ←",
  emptyNone: "אין עדיין סרטונים.",
  emptyPlatform: "אין עדיין סרטונים בפלטפורמה הזו.",
  emptyHint: "יש לחבר חשבון בדף החיבורים, ואז ללחוץ על ״רענון הסרטונים שלי״, או לבחור סרטון לניתוח.",
};

const analyzePage: Dictionary["analyzePage"] = {
  title: "ניתוח",
  subtitle: "להבין מה גורם לתוכן שלך לעבוד.",
  analyze: "ניתוח",
  understand: "להבין סרטון",
  compare: "השוואה",
  compareSoon: "חלק מ-Blumea Pro, בקרוב",
  already: "כבר נותחו",
  jumpBack: "לחזור לסרטונים שכבר נותחו.",
  none: "עדיין לא נותח כלום. אפשר לבחור סרטון למעלה כדי להתחיל.",
  viewAnalysis: "לניתוח",
};

const settings: Dictionary["settings"] = {
  title: "הגדרות",
  subtitle: "הפרופיל שלך ומה ש-Blumea יודעת עליך.",
  profile: "פרופיל",
  name: "שם",
  notSet: "לא הוגדר",
  setup: "ההגדרות שלך",
  goals: "מטרות",
  categories: "קטגוריות תוכן",
  platforms: "פלטפורמות",
  nothing: "לא נבחר כלום.",
  editingSoon: "עריכה של אלה מההגדרות בדרך. Blumea גם מדייקת את הקטגוריות ככל שהיא לומדת מהתוכן שלך.",
  language: "שפה",
  languageNote: "Blumea מדברת אנגלית ועברית. הבחירה נשמרת במכשיר הזה.",
  data: "הנתונים שלך",
  dataBody1:
    "Blumea שומרת את המספרים שהחשבונות המחוברים שלך מדווחים ואת תוצאות הניתוח. סרטונים מלאים משמשים לניתוח רק באופן זמני ולא נשמרים. ניתוק חשבון מבטל את הגישה של Blumea אליו ומוחק את הסרטונים והניתוחים שנאספו דרכו.",
  dataBody2: "אפשר גם למחוק את החשבון שלך ב-Blumea. זה מנתק כל חשבון ומוחק לצמיתות כל מה ש-Blumea מחזיקה עליך.",
  deleteBtn: "מחיקת החשבון והנתונים שלי",
  cannotUndo: "אי אפשר לבטל את זה.",
  typeDelete: "יש להקליד DELETE לאישור.",
  typeDeleteLabel: "יש להקליד DELETE לאישור",
  deleting: "מוחק…",
  deleteEverything: "מחיקת הכול",
  cancel: "ביטול",
  notSignedIn: "לא מחובר/ת.",
  wrong: "משהו השתבש. כדאי לנסות שוב.",
};

const pageTexts = { content, analyzePage, settings };
export default pageTexts;
