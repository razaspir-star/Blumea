import crypto from "crypto";

// Signs the OAuth `state` param so the callback route can trust the profile_id
// (and any provider-specific extra data, e.g. TikTok's PKCE code_verifier) it
// carries, without a server-side session/cookie (this app's Supabase client
// keeps its session in the browser's localStorage, not a cookie the server can
// read). A nonce + expiry stop a captured state value from being replayed.

const STATE_SECRET = process.env.OAUTH_STATE_SECRET!;
const STATE_TTL_MS = 10 * 60 * 1000;

export function signState(profileId: string, extra?: Record<string, string>): string {
  const payload = JSON.stringify({
    profile_id: profileId,
    nonce: crypto.randomUUID(),
    expires_at: Date.now() + STATE_TTL_MS,
    ...extra,
  });
  const base = Buffer.from(payload).toString("base64url");
  const signature = crypto.createHmac("sha256", STATE_SECRET).update(base).digest("base64url");
  return `${base}.${signature}`;
}

export function verifyState(
  state: string
): ({ profileId: string } & Record<string, string>) | null {
  const [base, signature] = state.split(".");
  if (!base || !signature) return null;

  const expected = crypto.createHmac("sha256", STATE_SECRET).update(base).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(base, "base64url").toString());
    if (typeof payload.profile_id !== "string" || payload.expires_at < Date.now()) return null;
    const { profile_id, ...rest } = payload;
    return { profileId: profile_id, ...rest };
  } catch {
    return null;
  }
}
