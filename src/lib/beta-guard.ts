import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isApproved } from "@/lib/beta-access";

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
