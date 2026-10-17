import { isApproved } from "@/lib/beta-access";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { scanProfile } from "@/lib/first-scan";

// First Scan of the signed-in creator's connected accounts (src/lib/first-scan.ts):
// numbers only, no AI. The Dashboard calls it when a creator has an account but no
// videos yet; the Content page offers it as "Refresh my videos".
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  if (!(await isApproved(getSupabaseAdmin(), data.user.id, data.user.email))) return NextResponse.json({ code: "beta", error: "Private beta" }, { status: 403 });

  return NextResponse.json(await scanProfile(data.user.id));
}
