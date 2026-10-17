import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { registerComparison, type CompareKind } from "@/lib/compare-access";

// Asks whether the signed-in creator may open this comparison (kind "regular") or make it in depth
// (kind "deep") under their plan this month, and counts it when it is new. See src/lib/compare-access.ts.
export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const kind: CompareKind | null = body?.kind === "regular" || body?.kind === "deep" ? body.kind : null;
  const key = typeof body?.key === "string" ? body.key.slice(0, 200) : "";
  if (!kind || !key) return NextResponse.json({ error: "Missing comparison" }, { status: 400 });

  return NextResponse.json(await registerComparison(admin, data.user.id, kind, key));
}
