import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { data: account } = await supabaseAdmin
    .from("connected_accounts")
    .select("id, refresh_token_secret_id, access_token_secret_id")
    .eq("profile_id", userData.user.id)
    .eq("platform", "youtube")
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ ok: true });
  }

  const { data: refreshToken } = await supabaseAdmin.rpc("read_oauth_secret", {
    secret_id: account.refresh_token_secret_id,
  });

  if (refreshToken) {
    // Best-effort: Google's docs say this also invalidates the paired access
    // token. Proceed with local cleanup even if the revoke call fails.
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }).catch(() => null);
  }

  await supabaseAdmin.rpc("delete_oauth_secret", { secret_id: account.refresh_token_secret_id });
  await supabaseAdmin.rpc("delete_oauth_secret", { secret_id: account.access_token_secret_id });
  // Disconnecting also removes what was collected through this account: its
  // videos, and with them (cascade) metric snapshots, AI profiles and statements.
  // Account snapshots go with the account row itself (cascade).
  await supabaseAdmin.from("videos").delete().eq("connected_account_id", account.id);
  await supabaseAdmin.from("connected_accounts").delete().eq("id", account.id);

  return NextResponse.json({ ok: true });
}
