import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { syncProfile } from "@/lib/sync";

// Syncs the signed-in creator's own accounts and analyzed videos. The Dashboard
// calls it when the newest snapshot is old; a scheduler can call /api/sync/all.
// An AI analysis can take 20-40 s; give serverless hosting room to finish.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  return NextResponse.json(await syncProfile(data.user.id));
}
