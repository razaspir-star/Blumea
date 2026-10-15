import type { Dictionary } from "../en";

const errors: Dictionary["errors"] = {
  limit: "ניצלת את {cap} הניתוחים החינמיים שלך החודש. הם מתחילים מחדש ב-{date}. המספרים שלך ממשיכים להתעדכן, ועוד ניתוחים יגיעו עם Blumea Pro.",
  notOwnChannel: "אפשר לנתח רק סרטונים מהערוץ שלך.",
  linkExpired: "הקישור הזה פג תוקף. יש לפתוח את Blumea במחשב ולסרוק קוד חדש.",
  linkExpiredTry: "הקישור הזה פג תוקף. יש לפתוח את Blumea במחשב ולנסות שוב.",
  couldNotPrepare: "לא הצלחנו להכין את ההעלאה.",
  missingUpload: "חסר הסרטון או ההעלאה שלו.",
  notYours: "ההעלאה הזו לא שייכת לך.",
  uploadMissing: "ההעלאה לא הגיעה. כדאי לנסות שוב.",
  saveVideo: "לא הצלחנו לשמור את הסרטון.",
  saveAnalysis: "לא הצלחנו לשמור את הניתוח.",
  analysisFailed: "Blumea לא הצליחה להשלים את הניתוח הפעם. כדאי לנסות שוב בעוד רגע.",
  videoFetchFailed: "Blumea לא הצליחה להגיע לסרטון הזה בפלטפורמה. כדאי לבדוק את החיבור בדף החיבורים ולנסות שוב.",
  screensMissing: "צילומי המסך לא הגיעו. כדאי לנסות שוב.",
  screensNoNumbers:
    "Blumea לא מצאה בתמונות האלה את המספרים של הסרטון ב-TikTok. כדאי לנסות את המסכים Overview ו-Viewers באנליטיקס של הסרטון.",
  screensFailed: "Blumea לא הצליחה לקרוא את צילומי המסך. כדאי לנסות שוב.",
  missingScreens: "חסר הסרטון או צילומי המסך שלו.",
  yourVideo: "סרטון ה-TikTok שלך",
  videoUnknown: "ל-Blumea אין עדיין את הסרטון הזה. קודם יש לרענן את הסרטונים.",
};

const errorTexts = { errors };
export default errorTexts;
