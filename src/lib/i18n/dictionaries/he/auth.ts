import type { Dictionary } from "../en";

export const auth: Dictionary["auth"] = {
  email: "אימייל",
  password: "סיסמה",
  emailPlaceholder: "you@example.com",
};

export const legal: Dictionary["legal"] = {
  privacy: "מדיניות פרטיות",
  terms: "תנאי שימוש",
  termsShort: "תנאי השימוש",
};

export const login: Dictionary["login"] = {
  title: "ברוך שובך",
  invalid: "האימייל או הסיסמה לא נכונים.",
  profileError: "לא הצלחנו לטעון את הפרופיל שלך ב-Blumea.",
  submit: "כניסה",
  submitting: "נכנס...",
  newHere: "חדש ב-Blumea?",
  createAccount: "פתיחת חשבון",
};

export const register: Dictionary["register"] = {
  title: "פתיחת חשבון",
  subtitle: "מתחילים להבין מה עובד בתוכן שלך.",
  or: "או",
  fullName: "שם מלא",
  fullNamePlaceholder: "השם שלך",
  passwordPlaceholder: "בחר סיסמה",
  passwordHint: "לפחות 8 תווים, עם אותיות ומספרים.",
  confirmPassword: "אימות סיסמה",
  confirmPlaceholder: "הקלד את הסיסמה שוב",
  showPassword: "הצגת הסיסמה",
  hidePassword: "הסתרת הסיסמה",
  agreePrefix: "אני מסכים ל",
  agreeAnd: "ול",
  marketing: "אשמח לקבל עדכונים, טיפים וחדשות מ-Blumea.",
  submit: "פתיחת חשבון",
  haveAccount: "כבר יש לך חשבון?",
  logIn: "כניסה",
  errName: "נא להזין שם מלא.",
  errNameInvalid: "נא להזין שם תקין.",
  errEmail: "נא להזין אימייל.",
  errEmailInvalid: "נא להזין כתובת אימייל תקינה.",
  errPasswordShort: "הסיסמה צריכה להכיל לפחות 8 תווים.",
  errPasswordWeak: "הסיסמה צריכה להכיל גם אותיות וגם מספרים.",
  errConfirm: "נא לאמת את הסיסמה.",
  errMismatch: "הסיסמאות לא זהות.",
  errTerms: "יש לאשר את תנאי השימוש ואת מדיניות הפרטיות.",
  errRateLimit: "נשלחו יותר מדי מיילי אימות. נא להמתין מעט ולנסות שוב.",
  checkEmail: "בדוק את המייל",
  sentTo: "שלחנו קישור אימות אל",
  verifyToContinue: "אמת את האימייל כדי להמשיך להקים את החשבון שלך ב-Blumea.",
  noEmail: "לא הגיע מייל?",
  resendIn: "אפשר לשלוח שוב בעוד {seconds} שניות",
  resend: "שליחת מייל אימות מחדש",
  resent: "✓ מייל האימות נשלח",
};

const authTexts = { auth, legal, login, register };
export default authTexts;
