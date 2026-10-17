import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { aiRunsToday, DEFAULT_DAILY_AI_CAP } from "@/lib/cost-guard";

// The owner's overview: how many creators, today's AI use against the daily cap, recent problems and feedback.
export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  const admin = getSupabaseAdmin();
  const { data: auth } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  if (!auth.user) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { data: me } = await admin.from("profiles").select("plan").eq("id", auth.user.id).maybeSingle();
  if (me?.plan !== "owner") return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [profiles, events, feedback, runs] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("app_events").select("name, props, created_at").in("name", ["client_error", "analysis_failed", "idea_failed", "daily_cap_hit"]).gte("created_at", since).order("created_at", { ascending: false }).limit(30),
    admin.from("feedback").select("kind, target, rating, note, created_at").order("created_at", { ascending: false }).limit(40),
    aiRunsToday(admin),
  ]);

  return NextResponse.json({
    creators: profiles.count ?? 0,
    aiRunsToday: runs,
    dailyCap: Number(process.env.AI_DAILY_CAP) || DEFAULT_DAILY_AI_CAP,
    problems: events.data ?? [],
    feedback: feedback.data ?? [],
  });
}
