import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { signState } from "@/lib/oauth-state";

const SCOPES = ["user.info.basic", "user.info.stats", "video.list"];

function base64url(input: Buffer) {
  return input.toString("base64url");
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  // TikTok's v2 Login Kit requires PKCE. The verifier has to survive the round
  // trip to TikTok and back, so — same trick as profile_id — it rides inside
  // the signed state instead of a server-side session.
  const codeVerifier = base64url(crypto.randomBytes(64)).slice(0, 128);
  const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());

  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
    response_type: "code",
    scope: SCOPES.join(","),
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state: signState(data.user.id, { code_verifier: codeVerifier }),
  });

  return NextResponse.json({ url: `https://www.tiktok.com/v2/auth/authorize/?${params}` });
}
