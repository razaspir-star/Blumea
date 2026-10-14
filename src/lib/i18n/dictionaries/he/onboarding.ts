import type { Dictionary } from "../en";

const goal: Dictionary["onboarding"]["goal"] = {
  get_more_views: "להגדיל צפיות",
  gain_followers: "להרוויח עוד עוקבים",
  understand_content: "להבין את התוכן שלי",
  improve_engagement: "לשפר מעורבות",
  find_uniqueness: "למצוא מה מייחד אותי",
  improve_content: "לשפר את התוכן שלי",
  no_specific_goal: "רק רוצה להתרשם",
};

const category: Dictionary["onboarding"]["category"] = {
  food: "אוכל",
  food_desc: "בישול, מתכונים, ביקורות ועוד",
  music: "מוזיקה",
  music_desc: "שירה, כלים, הפקה ועוד",
  gaming: "גיימינג",
  gaming_desc: "משחקים, סטרימינג, ספורט אלקטרוני ועוד",
  fitness_wellness: "כושר ובריאות",
  fitness_wellness_desc: "אימונים, תזונה, בריאות ועוד",
  fashion_beauty: "אופנה ויופי",
  fashion_beauty_desc: "אופנה, איפור, טיפוח העור ועוד",
  tech: "טכנולוגיה",
  tech_desc: "גאדג'טים, תוכנה, AI ועוד",
  travel: "טיולים",
  travel_desc: "יעדים, הרפתקאות, טיפים לטיולים ועוד",
  business_finance: "עסקים וכסף",
  business_finance_desc: "עסקים, השקעות, יזמות ועוד",
  education: "לימוד והדרכה",
  education_desc: "הדרכות, הסברים, למידה ועוד",
  entertainment_comedy: "בידור וקומדיה",
  entertainment_comedy_desc: "קומדיה, סקצ'ים, תגובות ועוד",
  lifestyle: "סגנון חיים",
  lifestyle_desc: "חיי היום־יום, שגרות, בית ועוד",
  sports: "ספורט",
  sports_desc: "ספורט, אימונים, פרשנות ועוד",
  automotive: "רכב",
  automotive_desc: "מכוניות, אופנועים, ביקורות ועוד",
  art_creative: "אמנות ויצירה",
  art_creative_desc: "עיצוב, צילום, ציור ועוד",
  other: "אחר",
  other_desc: "משהו אחר? זו האפשרות בשבילך",
};

const onboarding: Dictionary["onboarding"] = {
  goal,
  category,
  goalsTitle: "מה המטרות שלך?",
  goalsSubtitle: "בחר במה אתה רוצה ש-Blumea תעזור לך.",
  categoriesTitle: "איזה תוכן אתה יוצר?",
  categoriesSubtitle: "אפשר לבחור כמה שמתאים. את השאר Blumea תלמד מהתוכן שלך.",
  platformsTitle: "איפה אתה יוצר?",
  platformsSubtitle: "בחר את כל הפלטפורמות שבהן אתה פעיל היום.",
  connectTitle: "חיבור החשבונות",
  connectSubtitle: "חבר חשבון כדי ש-Blumea תוכל לקרוא את הסרטונים שלך. אפשר גם לעשות את זה אחר כך, בדף החיבורים.",
  continue: "המשך",
  back: "חזרה",
  connect: "חיבור",
  connected: "מחובר ✓",
  comingLater: "בקרוב",
  goToDashboard: "לדשבורד שלי",
};

const onboardingTexts = { onboarding };
export default onboardingTexts;
