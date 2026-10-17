import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyState } from "@/lib/oauth-state";

function redirectToConnections(request: NextRequest, param: string) {
  return NextResponse.redirect(new URL(`/connections?${param}`, request.url));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) return redirectToConnections(request, `youtube_error=${oauthError}`);
  if (!code || !state) return redirectToConnections(request, "youtube_error=missing_params");

  const verified = verifyState(state);
  if (!verified) return redirectToConnections(request, "youtube_error=invalid_state");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) return redirectToConnections(request, "youtube_error=token_exchange_failed");

  const tokens = await tokenResponse.json();
  // Google only sends a refresh_token on first consent — prompt=consent (set in
  // the authorize route) forces that on every connect, including reconnects.
  if (!tokens.refresh_token) return redirectToConnections(request, "youtube_error=no_refresh_token");

  const channelResponse = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  const channelData = await channelResponse.json();
  const handle: string = channelData.items?.[0]?.snippet?.title ?? "YouTube channel";

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
    return redirectToConnections(request, "youtube_error=secret_storage_failed");
  }

  const { error: upsertError } = await supabaseAdmin.from("connected_accounts").upsert(
    {
      profile_id: verified.profileId,
      platform: "youtube",
      handle,
      access_token_secret_id: accessSecretId,
      refresh_token_secret_id: refreshSecretId,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      needs_reconnect: false,
      scopes: tokens.scope ? tokens.scope.split(" ") : [],
    },
    { onConflict: "profile_id,platform" }
  );

  if (upsertError) return redirectToConnections(request, "youtube_error=save_failed");

  return redirectToConnections(request, "youtube_connected=1");
}
