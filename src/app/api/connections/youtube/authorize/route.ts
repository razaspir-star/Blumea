import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { signState } from "@/lib/oauth-state";
import { requireApproved } from "@/lib/beta-access";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

export async function GET(request: NextRequest) {
  const approved = await requireApproved(getSupabaseAdmin(), request.headers.get("authorization")?.replace("Bearer ", ""));
  if (approved instanceof NextResponse) return approved;
  const data = { user: { id: approved.userId } };

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES.join(" "),
    state: signState(data.user.id),
  });

  // Returns the URL rather than redirecting directly: a top-level browser
  // navigation can't carry the Authorization header this route needs, so the
  // client fetches this first, then navigates itself with window.location.
  return NextResponse.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
}
