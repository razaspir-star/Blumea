import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// The private beta is by guest list: an email the owner approved (a request from the homepage, or added by
// hand) may use the app. The owner and Pro accounts are always in. The check is made by the server on
// the routes that cost money or connect an account, and by the app shell for the screens.
export async function isApproved(admin: SupabaseClient, userId: string, email: string | null | undefined): Promise<boolean> {
  const { data: profile } = await admin.from("profiles").select("plan").eq("id", userId).maybeSingle();
  if (profile?.plan === "owner" || profile?.plan === "pro") return true;
  if (!email) return false;
  const { data } = await admin.from("access_requests").select("status").ilike("email", email).maybeSingle();
  return data?.status === "approved";
}

// For a route handler: the signed-in, approved user, or the response to send back.
export async function requireApproved(
  admin: SupabaseClient,
  token: string | undefined
): Promise<{ userId: string; email: string | null } | NextResponse> {
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  if (!(await isApproved(admin, data.user.id, data.user.email))) {
    return NextResponse.json({ code: "beta", error: "Blumea is in a private beta. Your access has not been approved yet." }, { status: 403 });
  }
  return { userId: data.user.id, email: data.user.email ?? null };
}
