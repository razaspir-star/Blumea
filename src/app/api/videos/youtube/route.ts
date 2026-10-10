import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getValidYoutubeAccessToken, listRecentVideos } from "@/lib/youtube-data";

// Lists the owner's real recent uploads, for the real Analyze flow's video
// picker (Insight_Engine_Spec.md §13#6). Read-only -- writes nothing.
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
    const accessToken = await getValidYoutubeAccessToken(userData.user.id);
    const videos = await listRecentVideos(accessToken, 12);
    return NextResponse.json({ videos });
  } catch (error) {
    return NextResponse.json({ error: String(error instanceof Error ? error.message : error) }, { status: 400 });
  }
}
