import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getValidTiktokAccessToken, listRecentVideos } from "@/lib/tiktok-data";

// Lists the owner's real recent TikTok uploads, for the real Analyze flow's
// video picker -- mirrors src/app/api/videos/youtube/route.ts.
export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: userData, error: userError } = await getSupabaseAdmin().auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  try {
    const accessToken = await getValidTiktokAccessToken(userData.user.id);
    const videos = await listRecentVideos(accessToken, 12);
    return NextResponse.json({ videos });
  } catch (error) {
    return NextResponse.json({ error: String(error instanceof Error ? error.message : error) }, { status: 400 });
  }
}
