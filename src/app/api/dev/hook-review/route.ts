import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { HOOK_TYPES, FAMILIAR_KINDS } from "@/lib/hook-library";

// TEMP, dev-only: the review step for the draft hook library. Shows the videos
// grouped by what Gemini thought their hook was (tests/hook-golden/sort.mjs ->
// .dev-cache/hook-ai-sort.json); the owner confirms ✓ or marks ✗ ("not sure" /
// "not this hook"). The AI's grouping is a guess, never a label: only the
// owner's ticks (.dev-cache/hook-review-labels.json) become the golden set.
// Same block/label shape as hook-candidates, so DevLabelTool renders it as is.
// 404 outside `next dev`. Delete with the rest of src/app/api/dev.

type Candidate = { videoId: string; title: string; channel: string; thumbnail: string };
type Block = { id: string; label: string; candidates: Candidate[] };
type Sorted = Record<
  string,
  { searchGroup: string; title: string; ai: { hook: string; hook_runner_up: string | null; familiar: string; opening_quote: string | null; reason: string } }
>;

const CACHE_DIR = path.join(process.cwd(), ".dev-cache");
const LABELS_FILE = path.join(CACHE_DIR, "hook-review-labels.json");

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

export async function GET(request: NextRequest) {
  const blocked = notDevelopment();
  if (blocked) return blocked;
  if (!(await authedUser(request))) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const sorted = await readJson<Sorted>(path.join(CACHE_DIR, "hook-ai-sort.json"));
  if (!sorted) return NextResponse.json({ error: "No AI sort yet (run tests/hook-golden/sort.mjs)" }, { status: 404 });

  const tile = (id: string, s: Sorted[string]): Candidate => ({
    videoId: id,
    title: s.ai.reason,
    channel: s.ai.opening_quote ? `“${s.ai.opening_quote.replace(/\s+/g, " ")}”` : s.title,
    thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
  });

  const blocks: Block[] = [];
  for (const hook of HOOK_TYPES) {
    const members = Object.entries(sorted).filter(([, s]) => s.ai.hook === hook.id);
    blocks.push({ id: hook.id, label: `${hook.label} — Gemini thinks (${members.length})`, candidates: members.map(([id, s]) => tile(id, s)) });
  }
  for (const kind of FAMILIAR_KINDS.filter((k) => k.id !== "none")) {
    const members = Object.entries(sorted).filter(([, s]) => s.ai.familiar === kind.id);
    blocks.push({ id: `familiar:${kind.id}`, label: `Familiar moment — ${kind.label} — Gemini thinks (${members.length})`, candidates: members.map(([id, s]) => tile(id, s)) });
  }

  // First visit: pre-tick what the owner already approved in hook-labels.json.
  let labels = await readJson<Record<string, { yes: string[]; no: string[] }>>(LABELS_FILE);
  if (!labels) {
    const earlier = (await readJson<Record<string, { yes: string[]; no: string[] }>>(path.join(CACHE_DIR, "hook-labels.json"))) ?? {};
    labels = {};
    for (const block of blocks) {
      const yes = (earlier[block.id]?.yes ?? []).filter((id) => block.candidates.some((c) => c.videoId === id));
      if (yes.length) labels[block.id] = { yes, no: [] };
    }
  }
  return NextResponse.json({ formats: blocks.filter((b) => b.candidates.length > 0), labels });
}

export async function POST(request: NextRequest) {
  const blocked = notDevelopment();
  if (blocked) return blocked;
  if (!(await authedUser(request))) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body?.labels || typeof body.labels !== "object") {
    return NextResponse.json({ error: "Expected { labels }" }, { status: 400 });
  }
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(LABELS_FILE, JSON.stringify(body.labels, null, 2));
  return NextResponse.json({ ok: true });
}
