import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyState } from "@/lib/oauth-state";

function redirectToConnections(request: NextRequest, param: string) {
  // Built from TIKTOK_REDIRECT_URI's origin, not request.url: when this route
  // runs behind a tunnel (cloudflared, for local https testing), the proxy
  // rewrites the Host header to the local target (localhost:3000), which
  // would otherwise send the browser to a plain-http localhost URL it can't
  // reach the same way it reached this page.
  const origin = new URL(process.env.TIKTOK_REDIRECT_URI!).origin;
  return NextResponse.redirect(new URL(`/connections?${param}`, origin));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) return redirectToConnections(request, `tiktok_error=${oauthError}`);
  if (!code || !state) return redirectToConnections(request, "tiktok_error=missing_params");

  const verified = verifyState(state);
  if (!verified || typeof verified.code_verifier !== "string") {
    return redirectToConnections(request, "tiktok_error=invalid_state");
  }

  const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
      code_verifier: verified.code_verifier,
    }),
  });

  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok || !tokens.access_token) {
    return redirectToConnections(request, "tiktok_error=token_exchange_failed");
  }
  // TikTok v2 always returns a refresh_token alongside the access_token (no
  // separate consent-prompt requirement the way Google's does).
  if (!tokens.refresh_token) {
    return redirectToConnections(request, "tiktok_error=no_refresh_token");
  }

  const userInfoResponse = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=display_name",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  const userInfo = await userInfoResponse.json();
  const handle: string = userInfo?.data?.user?.display_name ?? "TikTok account";

  const supabaseAdmin = getSupabaseAdmin();

  const { data: accessSecretId, error: accessSecretError } = await supabaseAdmin.rpc(
    "store_oauth_secret",
    { secret: tokens.access_token }
  );
  const { data: refreshSecretId, error: refreshSecretError } = await supabaseAdmin.rpc(
    "store_oauth_secret",
    { secret: tokens.refresh_token }
  );

  if (accessSecretError || refreshSecretError) {
    return redirectToConnections(request, "tiktok_error=secret_storage_failed");
  }

  const { error: upsertError } = await supabaseAdmin.from("connected_accounts").upsert(
    {
      profile_id: verified.profileId,
      platform: "tiktok",
      handle,
      access_token_secret_id: accessSecretId,
      refresh_token_secret_id: refreshSecretId,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scopes: tokens.scope ? tokens.scope.split(",") : [],
    },
    { onConflict: "profile_id,platform" }
  );

  if (upsertError) return redirectToConnections(request, "tiktok_error=save_failed");

  return redirectToConnections(request, "tiktok_connected=1");
}
