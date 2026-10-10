import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getValidYoutubeAccessToken } from "@/lib/youtube-data";
import { FORMATS } from "@/lib/format-library";

// TEMP, dev-only: batch 2 of example candidates -- a FRESH set (new queries,
// excluding every video already in the golden set or in batch 1) meant as a
// held-out test: the definitions were tuned on batch 1, so only videos the
// prompt has never been adjusted against can say how well it really works.
// Labels go to ./.dev-cache/format-labels-2.json. Delete with the rest of
// src/app/api/dev and src/app/(app)/dev.

const QUERIES: Record<string, string[]> = {
  skill_process: ["satisfying restock organizing asmr shorts", "cleaning transformation no talking asmr shorts"],
  caption_clip: ["POV text on screen trending sound relatable shorts", "text on screen funny opinion trending audio shorts"],
  reaction_stitch: ["reacting to viral video stitch shorts"],
  split_screen_reaction: ["duet reaction split screen shorts reaction video"],
  talking_to_camera: ["talking to camera opinion shorts"],
  self_dialogue: ["one man playing all characters skit shorts"],
  podcast_clip: ["podcast highlight clip shorts interview"],
  voiceover_on_activity: ["voiceover storytime while cooking shorts"],
  voiceover_over_background: ["story narration minecraft parkour background shorts", "reddit story narration satisfying video background shorts"],
  reply_to_comment: ["reply to comment video response shorts"],
  green_screen: ["green screen reaction article image behind me shorts"],
  pov_skit: ["pov you are skit acting shorts"],
  trend_dance: ["viral dance challenge choreography shorts"],
  lip_sync: ["lip sync trending audio acting shorts"],
  challenge: ["24 hour challenge shorts", "eating challenge shorts"],
  unboxing_review: ["unboxing review first impressions shorts"],
  music_performance: ["acoustic cover singing guitar shorts", "original song snippet singer songwriter shorts"],
  music_montage: ["cinematic travel montage music beat shorts", "memories montage song edit shorts", "vibes edit clips to the beat shorts"],
  filter_game: ["tiktok filter game guess shorts"],
  transition_edit: ["smooth transition video hand cover shorts"],
  comparison_vs: ["comparing two products which is better shorts", "expectation vs reality shorts"],
  ranking: ["tier list ranking shorts", "ranking every shorts top 10"],
  interview_street: ["asking strangers street interview question shorts"],
  ai_generated: ["ai generated video shorts sora veo"],
  tutorial: ["how to tutorial quick tip shorts"],
  list_tips: ["5 tips list shorts", "things you didn't know list shorts"],
  reveal_before_after: ["before and after transformation reveal shorts"],
  routine_vlog: ["day in my life vlog shorts"],
  meme_edit: ["meme template edit funny shorts"],
  storytelling: ["storytime true story shorts talking"],
  behind_the_scenes: ["behind the scenes making of shorts"],
};

// Second-pass queries for one format at a time (used with ?only=).
const QUERIES_ONLY: Record<string, string[]> = {
  meme_edit: [
    "movie scene edit relatable text memes shorts",
    "funny memes compilation shorts",
    "recreating viral meme trend shorts",
    "edit trending meme caption shorts",
  ],
};

type Candidate = { videoId: string; title: string; channel: string; thumbnail: string };

const CACHE_DIR = path.join(process.cwd(), ".dev-cache");
const CANDIDATES_FILE = path.join(CACHE_DIR, "format-candidates-2.json");
const LABELS_FILE = path.join(CACHE_DIR, "format-labels-2.json");

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse((await readFile(file, "utf8")).replace(/^﻿/, "")) as T;
  } catch {
    return null;
  }
}

// This tool writes files and spends YouTube quota: it exists only in `next dev`.
const notDevelopment = () =>
  process.env.NODE_ENV !== "development" ? NextResponse.json({ error: "Not found" }, { status: 404 }) : null;

async function authedUser(request: NextRequest): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  return error || !data.user ? null : data.user.id;
}

async function searchShorts(accessToken: string, query: string): Promise<Candidate[]> {
  const params = new URLSearchParams({ part: "snippet", type: "video", videoDuration: "short", maxResults: "10", q: query });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? "YouTube search failed");
  return (body.items ?? []).map(
    (item: { id: { videoId: string }; snippet: { title: string; channelTitle: string; thumbnails?: Record<string, { url: string }> } }) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? "",
    })
  );
}

export async function GET(request: NextRequest) {
  const blocked = notDevelopment();
  if (blocked) return blocked;
  const userId = await authedUser(request);
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const labels = (await readJson(LABELS_FILE)) ?? {};
  const cached = await readJson<{ id: string; label: string; candidates: Candidate[] }[]>(CANDIDATES_FILE);
  const only = request.nextUrl.searchParams.get("only");
  if (cached && !only) return NextResponse.json({ formats: cached, labels });

  // Skip every video already in the permanent regression sets.
  const known = new Set<string>();
  for (const file of ["golden-main.json", "golden-heldout.json"]) {
    const golden = await readJson<{ videos: { id: string }[] }>(path.join(process.cwd(), "tests", "format-golden", file));
    golden?.videos.forEach((v) => known.add(v.id));
  }

  let accessToken: string;
  try {
    accessToken = await getValidYoutubeAccessToken(userId);
  } catch (error) {
    return NextResponse.json({ error: String(error instanceof Error ? error.message : error) }, { status: 400 });
  }

  // ?only=<format id>: re-search just that format with the extra queries below
  // and replace its block in the cache (everything else stays as it is).
  const formats: { id: string; label: string; candidates: Candidate[] }[] = only && cached ? [...cached] : [];
  cached?.forEach((block) => block.candidates.forEach((c) => known.add(c.videoId)));
  for (const format of only ? FORMATS.filter((f) => f.id === only) : FORMATS) {
    const queries = only ? QUERIES_ONLY[only] : QUERIES[format.id];
    if (!queries) continue;
    const seen = new Set<string>();
    const candidates: Candidate[] = [];
    for (const query of queries) {
      try {
        for (const candidate of await searchShorts(accessToken, query)) {
          if (known.has(candidate.videoId) || seen.has(candidate.videoId)) continue;
          seen.add(candidate.videoId);
          candidates.push(candidate);
        }
      } catch (error) {
        return NextResponse.json({ error: String(error instanceof Error ? error.message : error), partial: formats }, { status: 502 });
      }
    }
    const block = { id: format.id, label: format.label, candidates: candidates.slice(0, 8) };
    const existing = formats.findIndex((b) => b.id === format.id);
    if (existing >= 0) formats[existing] = block;
    else formats.push(block);
  }

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CANDIDATES_FILE, JSON.stringify(formats, null, 2));
  return NextResponse.json({ formats, labels });
}

export async function POST(request: NextRequest) {
  const blocked = notDevelopment();
  if (blocked) return blocked;
  const userId = await authedUser(request);
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body?.labels || typeof body.labels !== "object") {
    return NextResponse.json({ error: "Expected { labels }" }, { status: 400 });
  }
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(LABELS_FILE, JSON.stringify(body.labels, null, 2));
  return NextResponse.json({ ok: true });
}
