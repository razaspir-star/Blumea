import crypto from "crypto";

// One-time-ish link for the "scan the QR code with your phone" upload (TikTok
// gives us no video file, so the creator saves the video on their phone and
// uploads it there). The phone is usually not signed in to Blumea, so the link
// itself carries the permission: signed, tied to ONE creator and ONE TikTok
// video, valid for 15 minutes, and good for nothing else. It uses its own key
// (derived from the OAuth secret) so it can never be mistaken for an OAuth state.

const KEY = () => crypto.createHash("sha256").update(`${process.env.OAUTH_STATE_SECRET!}:tiktok-handoff`).digest();
const TTL_MS = 15 * 60 * 1000;

export function signHandoff(profileId: string, platformVideoId: string): string {
  const payload = JSON.stringify({ p: profileId, v: platformVideoId, e: Date.now() + TTL_MS, n: crypto.randomUUID() });
  const base = Buffer.from(payload).toString("base64url");
  const signature = crypto.createHmac("sha256", KEY()).update(base).digest("base64url");
  return `${base}.${signature}`;
}

export function verifyHandoff(token: string | null | undefined): { profileId: string; platformVideoId: string } | null {
  if (!token) return null;
  const [base, signature] = token.split(".");
  if (!base || !signature) return null;

  const expected = crypto.createHmac("sha256", KEY()).update(base).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(base, "base64url").toString());
    if (typeof payload.p !== "string" || typeof payload.v !== "string" || payload.e < Date.now()) return null;
    return { profileId: payload.p, platformVideoId: payload.v };
  } catch {
    return null;
  }
}
