import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// The homepage "Request access" form: anyone may ask; the owner decides (/admin). Nothing is revealed about who is
// already on the list: the answer is the same.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  // A hidden field real people never fill in: a robot that does is told "ok" and ignored.
  if (typeof body?.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true });

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "email" }, { status: 400 });
  const clean = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);

  const admin = getSupabaseAdmin();
  const { data: existing } = await admin.from("access_requests").select("id").ilike("email", email).maybeSingle();
  if (!existing) {
    await admin.from("access_requests").insert({
      email,
      platform: clean(body?.platform, 40),
      handle: clean(body?.handle, 120),
      niche: clean(body?.niche, 120),
      note: clean(body?.note, 500),
    });
  }
  return NextResponse.json({ ok: true });
}
