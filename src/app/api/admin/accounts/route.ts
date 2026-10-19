import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// The owner's list of accounts: who is in, on which plan, how much they use Blumea, and a switch between Free and Pro
// (every beta creator gets Pro by hand). Owner only; the owner's own plan cannot be changed here.
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

  const [users, profiles, videos, analyses, connections] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from("profiles").select("id, plan, created_at"),
    admin.from("videos").select("profile_id"),
    admin.from("video_ai_profiles").select("videos!inner(profile_id)").eq("is_current", true),
    admin.from("connected_accounts").select("profile_id, platform, needs_reconnect"),
  ]);

  const count = (rows: { profile_id?: string }[] | null, id: string) => (rows ?? []).filter((row) => row.profile_id === id).length;
  const analysisRows = ((analyses.data ?? []) as unknown as { videos: { profile_id: string } | { profile_id: string }[] }[]).map((row) => ({
    profile_id: Array.isArray(row.videos) ? row.videos[0]?.profile_id : row.videos?.profile_id,
  }));

  const accounts = (users.data?.users ?? []).map((user) => {
    const profile = (profiles.data ?? []).find((row) => row.id === user.id);
    const platforms = (connections.data ?? []).filter((row) => row.profile_id === user.id);
    return {
      id: user.id,
      email: user.email ?? "",
      plan: (profile?.plan as string | undefined) ?? "free",
      createdAt: user.created_at,
      lastSignIn: user.last_sign_in_at ?? null,
      videos: count(videos.data, user.id),
      analyses: count(analysisRows, user.id),
      platforms: platforms.map((row) => row.platform as string),
      needsReconnect: platforms.some((row) => row.needs_reconnect),
    };
  });
  accounts.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  return NextResponse.json({ accounts });
}

export async function POST(request: NextRequest) {
  const admin = await owner(request);
  if (!admin) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string" || (body?.plan !== "pro" && body?.plan !== "free")) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { data: target } = await admin.from("profiles").select("plan").eq("id", body.id).maybeSingle();
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.plan === "owner") return NextResponse.json({ error: "The owner plan cannot be changed" }, { status: 400 });

  await admin.from("profiles").update({ plan: body.plan }).eq("id", body.id);
  return NextResponse.json({ ok: true });
}
