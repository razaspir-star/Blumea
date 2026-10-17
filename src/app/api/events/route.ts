import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logEvent } from "@/lib/events";

// What the browser may report: only these names, so the log stays small and clean.
const ALLOWED = new Set(["client_error", "page_view"]);

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: true });
  const admin = getSupabaseAdmin();
  const { data } = await admin.auth.getUser(token);
  if (!data.user) return NextResponse.json({ ok: true });

  const body = await request.json().catch(() => null);
  if (typeof body?.name !== "string" || !ALLOWED.has(body.name)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const props: Record<string, unknown> = {};
  if (typeof body.message === "string") props.message = body.message.slice(0, 300);
  if (typeof body.path === "string") props.path = body.path.slice(0, 200);
  await logEvent(admin, data.user.id, body.name, props);
  return NextResponse.json({ ok: true });
}
