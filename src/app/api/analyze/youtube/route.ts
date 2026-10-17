import { isApproved } from "@/lib/beta-access";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAnalysisUsage, limitMessage } from "@/lib/analysis-limit";
import { analyzeYoutubeForProfile } from "@/lib/analyze-youtube";
import { translatorFor } from "@/lib/i18n/server";

// Real (non-mock) slice of the insight engine: analyzes a YouTube video --
// the one named in the request body, or the owner's most recent upload if
// none is given -- and writes the result to video_ai_profiles (src/lib/analyze-youtube.ts).
// An AI analysis can take 20-40 s; give serverless hosting room to finish.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const t = translatorFor(request);
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  if (!(await isApproved(supabaseAdmin, userData.user.id, userData.user.email))) {
    return NextResponse.json({ code: "beta", error: "Private beta" }, { status: 403 });
  }

  const profileId = userData.user.id;
  // Monthly cap on AI analyses for free creators (src/lib/analysis-limit.ts).
  const usage = await getAnalysisUsage(supabaseAdmin, profileId);
  if (usage.cap !== null && usage.used >= usage.cap) {
    return NextResponse.json(
      { error: limitMessage(usage, t), code: "limit", used: usage.used, cap: usage.cap, resetsOn: usage.resetsOn },
      { status: 402 }
    );
  }
  const requestedVideoId: string | undefined = await request
    .json()
    .then((body) => body?.videoId)
    .catch(() => undefined);

  const result = await analyzeYoutubeForProfile(supabaseAdmin, profileId, requestedVideoId, t);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.body);
}
