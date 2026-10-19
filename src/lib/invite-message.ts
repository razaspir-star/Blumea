// The message the owner sends when someone is approved: a rich version (with the sign-up link as words, and the
// logo beside the signature) for pasting into an email, and a plain one for chats. Written in both languages
// whatever the language of the admin screen, because the owner picks the one that fits the creator.
export type InviteLanguage = "he" | "en";

// The beta group. Only in the invitation, never on a public page: it is for approved creators.
const WHATSAPP_URL = "https://chat.whatsapp.com/I4oASvPyTxyEgj3Wf08JO5";

const COPY = {
  he: {
    dir: "rtl",
    greeting: "היי, איזה כיף, הבקשה שלך להירשם ל-Blumea אושרה.",
    body: "כדי להשלים את ההרשמה, יש להירשם דרך הקישור המצורף:",
    link: "קישור לטופס ההרשמה",
    same: "נא להשתמש באותו אימייל שבו ביקשת גישה.",
    group: "וכדי שנוכל לשמוע ממך ולעזור מהר, מוזמנים להצטרף לקבוצת הבטא בוואטסאפ:",
    groupLink: "קישור לקבוצה",
    signature: "בברכה,<br>צוות Blumea",
    signatureText: "בברכה,\nצוות Blumea",
  },
  en: {
    dir: "ltr",
    greeting: "Hi, great news, your request to join Blumea has been approved.",
    body: "To complete your sign-up, please register through the link below:",
    link: "Sign-up form link",
    same: "Please use the same email you used when you asked for access.",
    group: "And so we can hear from you and help quickly, you are welcome to join the beta group on WhatsApp:",
    groupLink: "Group link",
    signature: "Best regards,<br>The Blumea Team",
    signatureText: "Best regards,\nThe Blumea Team",
  },
} as const;

export function inviteMessage(language: InviteLanguage, origin: string): { html: string; text: string } {
  const c = COPY[language];
  const url = `${origin}/register`;
  const side = c.dir === "rtl" ? "left" : "right";
  const html = `<div dir="${c.dir}" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0f2a43">
<p>${c.greeting}</p>
<p>${c.body} <a href="${url}">${c.link}</a></p>
<p>${c.same}</p>
<p>${c.group} <a href="${WHATSAPP_URL}">${c.groupLink}</a></p>
<table dir="${c.dir}" style="border-collapse:collapse;margin-top:18px"><tr>
<td style="padding-${side}:12px;vertical-align:middle"><img src="${origin}/blumea-logo-v2.png" alt="Blumea" width="48" height="48" style="display:block"></td>
<td style="vertical-align:middle;font-size:14px;line-height:1.5">${c.signature}</td>
</tr></table>
</div>`;
  const text = `${c.greeting}\n\n${c.body}\n${url}\n\n${c.same}\n\n${c.group}\n${WHATSAPP_URL}\n\n${c.signatureText}`;
  return { html, text };
}

export async function copyInvite(language: InviteLanguage, origin: string): Promise<void> {
  const { html, text } = inviteMessage(language, origin);
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
    await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]);
  } else {
    await navigator.clipboard.writeText(text);
  }
}
