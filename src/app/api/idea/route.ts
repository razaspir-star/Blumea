import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { translatorFor } from "@/lib/i18n/server";
import { buildIdea, IDEAS_PER_MONTH } from "@/lib/idea";

// Blumea Idea: an idea for the next video, for one platform. Pro and owner only; Pro has a monthly number of
// requests (the owner none). A request counts only when an answer was made.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const t = translatorFor(request);
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  const profileId = userData.user.id;

  const body = await request.json().catch(() => null);
  const platform = body?.platform === "youtube" || body?.platform === "tiktok" ? body.platform : null;
  if (!platform) return NextResponse.json({ error: "Missing platform" }, { status: 400 });

  const { data: profile } = await admin.from("profiles").select("plan").eq("id", profileId).maybeSingle();
  const plan = (profile?.plan as string | undefined) ?? "free";
  if (plan !== "pro" && plan !== "owner") return NextResponse.json({ code: "pro", error: t("idea.proOnly") }, { status: 403 });

  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const resetsOn = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  const cap = plan === "owner" ? null : IDEAS_PER_MONTH;
  const { count } = await admin.from("compare_events").select("id", { count: "exact", head: true }).eq("profile_id", profileId).eq("kind", "idea").eq("month", month);
  const used = count ?? 0;
  if (cap !== null && used >= cap) {
    const date = new Date(resetsOn).toLocaleDateString(t.locale === "he" ? "he-IL" : "en-US", { month: "long", day: "numeric", timeZone: "UTC" });
    return NextResponse.json({ code: "limit", error: t("idea.limit", { cap, date }), used, cap }, { status: 402 });
  }

  const result = await buildIdea(admin, profileId, platform, t);
  if ("error" in result) {
    if (result.error === "not_enough") return NextResponse.json({ code: "not_enough", error: t("idea.notEnough", { count: result.read }), read: result.read }, { status: 422 });
    return NextResponse.json({ code: "failed", error: t("idea.failed") }, { status: 502 });
  }

  await admin.from("compare_events").insert({ profile_id: profileId, kind: "idea", key: `idea:${platform}:${now.toISOString()}`, month });
  return NextResponse.json({ ...result, used: used + 1, cap });
}
