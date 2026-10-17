import type { Dictionary } from "../en";

const feedback: Dictionary["feedback"] = {
  reconnectBanner: "החיבור שלך ל-{platform} פג, ולכן Blumea לא יכולה לקרוא מספרים חדשים. התחבר מחדש כדי שהסרטונים יישארו מעודכנים.",
  reconnectAction: "התחברות מחדש",
  button: "משוב",
  kicker: "בטא",
  title: "ספר לנו מה דעתך",
  help: "משהו מבלבל, שגוי או חסר? כל מה שתכתוב כאן מגיע אלינו ישירות.",
  send: "שליחה",
  thanks: "תודה. אנחנו קוראים כל הודעה.",
  error: "לא הצלחנו לשלוח. נסה שוב.",
  cardAsk: "זה היה נכון?",
  cardThanks: "תודה, נרשם.",
  yes: "כן, זה היה נכון",
  no: "לא, זה לא היה מדויק",
};

const feedbackTexts = { feedback };
export default feedbackTexts;
