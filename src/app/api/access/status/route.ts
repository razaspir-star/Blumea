import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isApproved } from "@/lib/beta-access";

// Whether the signed-in person is on the guest list (the app shell asks on every start).
export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  return NextResponse.json({ approved: await isApproved(admin, data.user.id, data.user.email) });
}
