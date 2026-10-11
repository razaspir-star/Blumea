import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAnalysisUsage } from "@/lib/analysis-limit";

// How many AI analyses the signed-in creator has used this month, against their cap.
export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  return NextResponse.json(await getAnalysisUsage(admin, data.user.id));
}
