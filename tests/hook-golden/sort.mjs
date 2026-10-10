// Pre-sorts the owner's hook candidates with Gemini, using the DRAFT hook
// definitions in src/lib/hook-library.ts, so the owner only confirms short lists
// instead of watching 130+ videos. The AI's guess is NOT a label: only the
// owner's ticks are (the golden set is built from his ticks).
//
//   node tests/hook-golden/sort.mjs
//
// Reads .dev-cache/hook-candidates.json + hook-labels.json, writes
// .dev-cache/hook-ai-sort.json. Needs GEMINI_API_KEY in .env.local. One call per
// video; say the call count before running (Gemini credit is topped up by hand).
// A rerun skips videos that already have a result.
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const ROOT = new URL("../../", import.meta.url);
const read = (p) => JSON.parse(fs.readFileSync(new URL(p, ROOT), "utf8").replace(/^﻿/, ""));
const env = fs.readFileSync(new URL(".env.local", ROOT), "utf8");
const key = env.match(/^GEMINI_API_KEY=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
if (!key) throw new Error("GEMINI_API_KEY missing");

const { HOOK_TYPES, FAMILIAR_KINDS, hookGuideText } = await import(new URL("src/lib/hook-library.ts", ROOT).href);
const { GoogleGenAI } = await import(pathToFileURL(new URL("node_modules/@google/genai/dist/node/index.mjs", ROOT).pathname.replace(/^\//, "")).href);
const ai = new GoogleGenAI({ apiKey: key });

const PROMPT = `You are labelling how a short-form video OPENS. Only the first 3 seconds matter. \
Return ONLY one JSON object (no markdown) with exactly these keys:
{ "hook": string, "hook_runner_up": string | null, "familiar": string, "opening_quote": string | null, "reason": string }

- hook: exactly one id from this list, in tie-break order (the first that clearly applies wins):
${hookGuideText()}
- hook_runner_up: a second id from the same list only if the opening clearly also fits it, else null.
- familiar: one of ${FAMILIAR_KINDS.map((k) => `"${k.id}"`).join(", ")}. ${FAMILIAR_KINDS.map((k) => `"${k.id}" = ${k.description}`).join(" ")}
- opening_quote: the exact words said or written in the first 3 seconds, in their original language, or null.
- reason: one short sentence saying what the first seconds do.
Rules: judge only the first 3 seconds; describe only what you see and hear; do not describe anyone's appearance.`;

function parse(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
  try { return s !== -1 && e > s ? JSON.parse(cleaned.slice(s, e + 1)) : null; } catch { return null; }
}

const blocks = read(".dev-cache/hook-candidates.json");
const labels = read(".dev-cache/hook-labels.json");
const ids = new Map();
for (const b of blocks) for (const c of b.candidates) ids.set(c.videoId, { searchGroup: b.id, title: c.title });
for (const [group, v] of Object.entries(labels)) for (const id of v.yes ?? []) if (!ids.has(id)) ids.set(id, { searchGroup: group, title: "(owner's own)" });

const OUT = new URL(".dev-cache/hook-ai-sort.json", ROOT);
const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const todo = [...ids.entries()].filter(([id]) => !done[id]);
console.log(`${ids.size} videos, ${todo.length} to run`);

async function one([id, meta]) {
  const call = ai.interactions.create({
    model: "gemini-3.8-flash",
    input: [{ type: "text", text: PROMPT }, { type: "video", uri: `https://www.youtube.com/watch?v=${id}` }],
    generation_config: { thinking_level: "low" },
  });
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout 90s")), 90000));
  try {
    const r = await Promise.race([call, timeout]);
    const parsed = parse(r.output_text ?? "");
    done[id] = parsed ? { ...meta, ai: parsed } : { ...meta, error: "bad json" };
  } catch (e) {
    done[id] = { ...meta, error: String(e).slice(0, 160) };
    if (/402|prepayment|credit/i.test(String(e))) { console.log("OUT OF CREDIT - stopping"); process.exitCode = 2; }
  }
}

let next = 0, stop = false;
async function worker() {
  while (next < todo.length && !stop) {
    const item = todo[next++];
    await one(item);
    if (process.exitCode === 2) stop = true;
    if (next % 10 === 0) console.log(`${next}/${todo.length}`);
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);

const results = Object.values(done);
const errors = results.filter((r) => r.error).length;
// never keep an all-error result
if (results.length > 0 && errors < results.length) {
  const tidy = Object.fromEntries(Object.entries(done).filter(([, v]) => !v.error));
  fs.writeFileSync(OUT, JSON.stringify(tidy, null, 2));
}
console.log(`done: ${results.length - errors} ok, ${errors} errors`);
