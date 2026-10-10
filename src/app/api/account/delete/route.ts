import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// "Delete my account and all my data" (Settings). Revokes every connected
// platform token, deletes the stored token secrets, then deletes the auth user.
// Deleting the auth user cascades to the profile and, through it, to connected
// accounts, videos, metric snapshots, AI profiles, statements and baselines
// (verified against the foreign keys, 2026-10-10). The token secrets live in
// Vault with no foreign key, so they are deleted explicitly first.
//
// Requires the caller to send { confirm: "DELETE" }; the Settings screen asks the
// creator to type it. Irreversible by design.
export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (body?.confirm !== "DELETE") {
    return NextResponse.json({ error: "Confirmation missing" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
  const userId = userData.user.id;

  const { data: accounts } = await supabaseAdmin
    .from("connected_accounts")
    .select("id, platform, refresh_token_secret_id, access_token_secret_id")
    .eq("profile_id", userId);

  for (const account of accounts ?? []) {
    // Revoking is best-effort: an already-expired token must not block deletion.
    if (account.platform === "youtube") {
      const { data: refreshToken } = await supabaseAdmin.rpc("read_oauth_secret", { secret_id: account.refresh_token_secret_id });
      if (refreshToken) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }).catch(() => null);
      }
    }
    if (account.platform === "tiktok") {
      const { data: accessToken } = await supabaseAdmin.rpc("read_oauth_secret", { secret_id: account.access_token_secret_id });
      if (accessToken) {
        await fetch("https://open.tiktokapis.com/v2/oauth/revoke/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_KEY!,
            client_secret: process.env.TIKTOK_CLIENT_SECRET!,
            token: accessToken,
          }),
        }).catch(() => null);
      }
    }
    await supabaseAdmin.rpc("delete_oauth_secret", { secret_id: account.refresh_token_secret_id });
    await supabaseAdmin.rpc("delete_oauth_secret", { secret_id: account.access_token_secret_id });
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return NextResponse.json({ error: "Could not delete the account. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
