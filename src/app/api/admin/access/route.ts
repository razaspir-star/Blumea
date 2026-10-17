import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// The owner's guest list: read the requests, approve or decline one, or add an email by hand. Owner only.
async function owner(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const admin = getSupabaseAdmin();
  const { data } = await admin.auth.getUser(token);
  if (!data.user) return null;
  const { data: profile } = await admin.from("profiles").select("plan").eq("id", data.user.id).maybeSingle();
  return profile?.plan === "owner" ? admin : null;
}

export async function GET(request: NextRequest) {
  const admin = await owner(request);
  if (!admin) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { data } = await admin.from("access_requests").select("id, email, platform, handle, niche, note, status, created_at").order("created_at", { ascending: false });
  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(request: NextRequest) {
  const admin = await owner(request);
  if (!admin) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const body = await request.json().catch(() => null);

  if (body?.action === "add" && typeof body.email === "string" && body.email.includes("@")) {
    const email = body.email.trim().toLowerCase().slice(0, 200);
    const { data: existing } = await admin.from("access_requests").select("id").ilike("email", email).maybeSingle();
    if (existing) await admin.from("access_requests").update({ status: "approved", decided_at: new Date().toISOString() }).eq("id", existing.id);
    else await admin.from("access_requests").insert({ email, status: "approved", decided_at: new Date().toISOString(), note: "added by hand" });
    return NextResponse.json({ ok: true });
  }
  if ((body?.action === "approve" || body?.action === "decline") && typeof body.id === "string") {
    await admin
      .from("access_requests")
      .update({ status: body.action === "approve" ? "approved" : "declined", decided_at: new Date().toISOString() })
      .eq("id", body.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
