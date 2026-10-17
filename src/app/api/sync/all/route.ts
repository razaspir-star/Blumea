import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { syncProfile } from "@/lib/sync";
import { cleanupStaleUploads } from "@/lib/upload-cleanup";
import { runDueIdeaAnalyses } from "@/lib/idea-auto";

// Syncing many creators in one call can take a while.
// The scheduled analyses of videos posted for an idea (a few, one after another) need room.
export const maxDuration = 300;

// For a scheduler: syncs every creator with a connected account. Protected by
// CRON_SECRET; without that env var set, it answers 404. Two ways in:
//  - POST with the secret in the `x-cron-secret` header (GitHub Actions, pg_cron...)
//  - GET with `Authorization: Bearer <secret>` (what Vercel Cron sends when a
//    CRON_SECRET env var is set)
function authorized(request: NextRequest, secret: string): boolean {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const given = Buffer.from(request.headers.get("x-cron-secret") ?? bearer ?? "");
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function run(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!authorized(request, secret)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: accounts } = await getSupabaseAdmin().from("connected_accounts").select("profile_id");
  const profileIds = [...new Set((accounts ?? []).map((account) => account.profile_id as string))];

  const results: Record<string, unknown> = {};
  for (const profileId of profileIds) {
    results[profileId] = await syncProfile(profileId).catch((error) => ({ error: String(error) }));
  }
  // Also sweep any uploaded video that was left behind (normally none).
  const uploadsRemoved = await cleanupStaleUploads(getSupabaseAdmin()).catch(() => -1);
  // The videos creators posted for an idea and asked to have analyzed on this day (YouTube).
  const ideas = await runDueIdeaAnalyses(getSupabaseAdmin(), 200_000).catch(() => null);
  return NextResponse.json({ profiles: profileIds.length, uploadsRemoved, ideas, results });
}

export const POST = run;
export const GET = run;
