import type { Dictionary } from "../en";

const picker: Dictionary["picker"] & Record<string, string> = {
  title: "הוספת המספרים מ-TikTok",
  step1: "ב-TikTok פותחים את הסרטון {profile} (לא מקישור) ולוחצים על {more}.",
  step1Profile: "מהפרופיל",
  step1More: "More insights",
  step2: "מצלמים 3 צילומי מסך ב-{video}:",
  step2Video: "Video analysis",
  shot1: "Overview, בחלק העליון של המסך",
  shot2: "Overview, אחרי גלילה עד הגרף",
  shot3: "לשונית Viewers, בחלק העליון של המסך",
  step3: "חוזרים לכאן ובוחרים את כולם יחד.",
  note: "שניים מספיקים. Blumea קוראת את המספרים ומוחקת את התמונות מיד אחר כך.",
  choose: "בחירת צילומי המסך",
  chosen_one: "נבחר צילום מסך אחד",
  chosen_two: "נבחרו שני צילומי מסך",
  chosen_other: "נבחרו {count} צילומי מסך",
  videoLabel: "אנימציה קצרה: איך לצלם את שלושת צילומי המסך ב-TikTok",
};

const tiktokUpload: Dictionary["tiktokUpload"] = {
  phoneOpenedTitle: "הטלפון שלך פתח את הדף",
  phoneOpenedBody: "יש לבחור שם את הסרטון השמור וללחוץ על Send to Blumea.",
  phoneUploadingTitle: "מעלה מהטלפון",
  phoneUploadingBody: "יש להשאיר את הדף פתוח בטלפון. זה יכול לקחת קצת זמן, תלוי בחיבור.",
  phoneReadingTitle: "Blumea קוראת את הסרטון שלך",
  phoneReadingBody: "בערך דקה. החלון הזה ממשיך מעצמו כשזה מסתיים.",
  uploadingTitle: "מעלה את הסרטון שלך",
  readingTitle: "קוראת את הסרטון שלך",
  uploadingBody: "יש להשאיר את החלון הזה פתוח. הקובץ נשמר רק לצורך הניתוח ונמחק מיד אחריו.",
  readingBody: "זה לוקח בערך דקה.",
  qrAlt: "קוד QR להעלאה מהטלפון",
  easier: "קל יותר מהטלפון",
  qrBody:
    "אפשר לסרוק את הקוד עם מצלמת הטלפון. בדף שייפתח אפשר לפתוח את הסרטון ב-TikTok כדי לשמור אותו, ואז לבחור אותו. החלון הזה מראה מה הטלפון עושה וממשיך מעצמו כשזה מסתיים.",
  drop: "או לגרור לכאן את הסרטון השמור",
  chooseFile: "בחירת קובץ",
  optional: "אופציונלי: איך אנשים צפו בו",
  phoneFailed: "משהו השתבש בהעלאה מהטלפון.",
  analyze: "ניתוח הסרטון",
};

const viewerCard: Dictionary["viewerCard"] = {
  readMine: "לקרוא את צילומי המסך שלי",
  reading: "קוראת את צילומי המסך שלך…",
  avg: "צפייה ממוצעת",
  ofVideo: "מתוך סרטון של {dur} שנ׳{pct}",
  full: "נצפה עד הסוף",
  mostStopped: "הכי הרבה עצרו ב-",
  newFollowers: "עוקבים חדשים",
  saves: "שמירות",
  seconds: "{n} שנ׳",
  fromScreens: "מצילומי המסך שלך מ-TikTok, נקראו ב-{date}.",
  where: "מאיפה הצופים הגיעו",
  followersOthers: "עוקבים ואחרים",
  followersLine: "{a} עוקבים · {b} לא עוקבים אחריך",
  newReturning: "צופים חדשים וחוזרים",
  newLine: "{a} חדשים · {b} חוזרים",
  update: "עדכון עם צילומי מסך חדשים",
  missingTitle: "רוצים תמונה מלאה?",
  missingBody: "מהמסכים האלה עדיין לא נקראו מספרים. כדאי לצלם כל אחד מהם ולהוסיף כאן למטה:",
};

const handoff: Dictionary["handoff"] = {
  expiredTitle: "הקישור הזה פג תוקף",
  expiredBody: "יש לפתוח את Blumea במחשב ולסרוק קוד חדש.",
  doneTitle: "מוכן",
  doneBody:
    "הסרטון שלך נקרא. אפשר לחזור למחשב, שם Blumea מראה מה היא הבינה. הקבצים נמחקו.",
  keepPage: "יש להשאיר את הדף פתוח.",
  takes: "זה לוקח בערך דקה.",
  heading: "העלאת סרטון TikTok",
  forVideo: "עבור: {title}",
  loading: "טוען…",
  step1: "שלב 1 · להשיג את הסרטון",
  openIn: "פתיחת הסרטון ב-TikTok",
  step1Body:
    "ב-TikTok לוחצים על Share ואז על Save video, ואז חוזרים לדף הזה. אם הסרטון כבר שמור בטלפון, אפשר לדלג לשלב 2. (את האנליטיקס בשלב 3 מוצאים דרך הפרופיל, לא דרך הקישור הזה.)",
  step2: "שלב 2 · לבחור את הסרטון",
  chooseSaved: "בחירת הסרטון השמור",
  step3: "שלב 3 · המספרים של TikTok (אופציונלי)",
  send: "שליחה ל-Blumea",
  heldNote: "הסרטון נשמר רק בזמן ש-Blumea קוראת אותו, ונמחק מיד אחר כך.",
};

const uploadErrors: Dictionary["uploadErrors"] = {
  tooBig: "{name} שוקל {mb} MB. המגבלה היא {limit} MB.",
  aFile: "קובץ",
  couldNotStart: "לא הצלחנו להתחיל את ההעלאה.",
  uploadFailed: "ההעלאה לא הצליחה. כדאי לנסות שוב.",
  notSignedIn: "לא מחובר/ת.",
  analysisFailed: "הניתוח נכשל.",
  screensFailed: "Blumea לא הצליחה לקרוא את צילומי המסך.",
};

const analyzeModal: Dictionary["analyzeModal"] = {
  kicker: "ניתוח",
  title: "ניתוח סרטון",
  description: "Blumea קוראת את הסרטון, איך הצופים צפו בו, ומה כדאי לנסות הלאה.",
  step0: "קוראת את תוכן הסרטון",
  step1: "מבינה טקסט וכתוביות",
  step2: "מזהה פתיחים ורגעי מפתח",
  step3: "מנתחת את התנהגות הצופים",
  step4: "מחפשת דפוסים שימושיים",
  failed: "הניתוח נכשל",
  back: "→ חזרה",
  analyzingTitle: "מנתחת את הסרטון שלך",
  analyzingBody: "Blumea מבינה את התוכן שלך ואיך הצופים הגיבו אליו.",
  choosePlatform: "בחירת פלטפורמה",
  wherePlatform: "איפה נמצא הסרטון שרוצים לנתח?",
  chooseVideo: "בחירת סרטון",
  saveUpload: "שמירה והעלאה",
  capYoutube: "ניתוח מלא, אוטומטית.",
  capTiktok: "מעלים סרטון ששמרתם מ-TikTok לניתוח מלא.",
  chooseDifferent: "→ לבחור סרטון אחר",
  tiktokNoShare:
    "TikTok לא משתפת איתנו את קובץ הסרטון ישירות. {phone} - אפשרות Save video שלה (אם הפעלת אותה לסרטון הזה) לא זמינה במחשב.",
  tiktokPhone: "יש לפתוח את זה בטלפון, באפליקציית TikTok",
  openToSave: "פתיחה ב-TikTok לשמירה",
  computerNote:
    "עובדים מהמחשב? אפשר להעביר אליו את הסרטון השמור בכל דרך שנוחה - AirDrop, גיבוי התמונות של הטלפון בענן, או שליחה לעצמך - ואז להעלות אותו למטה.",
  noVideosTiktok: "לא נמצאו סרטונים בחשבון הזה.",
  noVideosYoutube: "לא נמצאו סרטונים בערוץ הזה.",
  notSignedIn: "לא מחובר.",
  couldNotLoad: "לא הצלחנו לטעון את הסרטונים שלך.",
  couldNotLoadTiktok: "לא הצלחנו לטעון את סרטוני ה-TikTok שלך.",
  analysisFailed: "הניתוח נכשל.",
};

const modalCommon: Dictionary["modalCommon"] = { close: "סגירה" };

const tiktokTexts = { picker, tiktokUpload, viewerCard, handoff, uploadErrors, analyzeModal, modalCommon };
export default tiktokTexts;
