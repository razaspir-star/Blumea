import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getValidYoutubeAccessToken } from "@/lib/youtube-data";
import { HOOK_TYPES, FAMILIAR_KINDS } from "@/lib/hook-library";

// TEMP, dev-only: example candidates for the DRAFT hook library
// (src/lib/hook-library.ts). Same idea as format-candidates-2: search YouTube
// Shorts per hook type, the owner ticks the clear examples in /dev/hooks, the
// ticks become the golden set in tests/hook-golden/. A hook lives in the first
// seconds, so the owner has to open each video, not judge by thumbnail.
// Labels go to ./.dev-cache/hook-labels.json. Delete with the rest of
// src/app/api/dev and src/app/(app)/dev. 404 outside `next dev`.

const QUERIES: Record<string, string[]> = {
  preview_then_start: [
    "finished result first then how I made it shorts",
    "podcast clip hook line then conversation shorts",
    "teaser of the end then back to the start shorts",
    "recipe final dish first then ingredients shorts",
  ],
  provocative_claim: [
    "why you should never do this shorts",
    "unpopular opinion nobody wants to hear shorts",
    "stop doing this immediately shorts",
    "למה אסור לכם shorts",
  ],
  open_question: [
    "would you rather shorts",
    "which one would you choose shorts",
    "did you know question shorts",
    "מה אתם הייתם עושים shorts",
  ],
  personal_address: [
    "comment your name and I will shorts",
    "if you are one of these people watch this shorts",
    "shoutout to my followers names in the video shorts",
    "תגיבו ואזכור אתכם shorts",
  ],
  visual_action: [
    "putting the camera down walking away shorts",
    "cinematic camera movement opening shot shorts",
    "sudden zoom close up opening shorts",
    "covering the lens transition into scene shorts",
  ],
  text_statement: [
    "relatable text on screen sad song shorts",
    "caption feeling quote trending sound shorts",
  ],
  setup_cutaway: ["hidden camera prank then cut to me shorts", "raw clip then cut to creator reaction shorts"],
  straight_in: ["acoustic cover singing guitar shorts", "cooking no intro just start shorts", "starts talking about the topic immediately shorts"],
};

// Separate tag: what the opening is tied to that viewers already recognise.
const FAMILIAR_QUERIES: Record<string, string[]> = {
  season_or_holiday: ["rosh hashana apple honey shorts", "shavuot cheese cake shorts", "winter treat krembo shorts"],
  everyday_experience: ["mcdonalds meal eating shorts", "morning commute relatable shorts"],
  trend: ["new trend this week shorts", "viral trend everyone is doing shorts"],
};

type Candidate = { videoId: string; title: string; channel: string; thumbnail: string };
type Block = { id: string; label: string; candidates: Candidate[] };

const CACHE_DIR = path.join(process.cwd(), ".dev-cache");
const CANDIDATES_FILE = path.join(CACHE_DIR, "hook-candidates.json");
const LABELS_FILE = path.join(CACHE_DIR, "hook-labels.json");

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse((await readFile(file, "utf8")).replace(/^﻿/, "")) as T;
  } catch {
    return null;
  }
}

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
  const cached = await readJson<Block[]>(CANDIDATES_FILE);
  if (cached) return NextResponse.json({ formats: cached, labels });

  let accessToken: string;
  try {
    accessToken = await getValidYoutubeAccessToken(userId);
  } catch (error) {
    return NextResponse.json({ error: String(error instanceof Error ? error.message : error) }, { status: 400 });
  }

  const known = new Set<string>();
  const blocks: Block[] = [];
  const groups: { id: string; label: string; queries: string[] }[] = [
    ...HOOK_TYPES.filter((hook) => QUERIES[hook.id]).map((hook) => ({ id: hook.id, label: hook.label, queries: QUERIES[hook.id] })),
    ...FAMILIAR_KINDS.filter((kind) => FAMILIAR_QUERIES[kind.id]).map((kind) => ({
      id: `familiar:${kind.id}`,
      label: `Familiar moment — ${kind.label}`,
      queries: FAMILIAR_QUERIES[kind.id],
    })),
  ];
  for (const group of groups) {
    const candidates: Candidate[] = [];
    for (const query of group.queries) {
      try {
        for (const candidate of await searchShorts(accessToken, query)) {
          if (known.has(candidate.videoId)) continue;
          known.add(candidate.videoId);
          candidates.push(candidate);
        }
      } catch (error) {
        return NextResponse.json({ error: String(error instanceof Error ? error.message : error), partial: blocks }, { status: 502 });
      }
    }
    blocks.push({ id: group.id, label: group.label, candidates: candidates.slice(0, 12) });
  }

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CANDIDATES_FILE, JSON.stringify(blocks, null, 2));
  return NextResponse.json({ formats: blocks, labels });
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
