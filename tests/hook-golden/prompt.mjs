// Shared by sort.mjs and run.mjs: the hook-labelling prompt, built from the DRAFT
// hook definitions in src/lib/hook-library.ts, and a tolerant JSON parser.
import fs from "node:fs";
import { pathToFileURL } from "node:url";

export const ROOT = new URL("../../", import.meta.url);

const { FAMILIAR_KINDS, hookGuideText } = await import(new URL("src/lib/hook-library.ts", ROOT).href);

export const PROMPT = `You are labelling how a short-form video OPENS. Only the opening matters: the first sentence, about the first 3 to 6 seconds. \
Return ONLY one JSON object (no markdown) with exactly these keys:
{ "hook": string, "hook_runner_up": string | null, "familiar": string, "opening_quote": string | null, "reason": string }

- hook: exactly one id from this list, in tie-break order (the first that clearly applies wins):
${hookGuideText()}
- hook_runner_up: a second id from the same list only if the opening clearly also fits it, else null.
- familiar: one of ${FAMILIAR_KINDS.map((k) => `"${k.id}"`).join(", ")}. ${FAMILIAR_KINDS.map((k) => `"${k.id}" = ${k.description}`).join(" ")}
- opening_quote: the exact words said or written in the first 3 seconds, in their original language, or null.
- reason: one short sentence saying what the first seconds do.
Rules: judge only the opening (the first sentence); describe only what you see and hear; do not describe anyone's appearance.`;

export function parse(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
  try { return s !== -1 && e > s ? JSON.parse(cleaned.slice(s, e + 1)) : null; } catch { return null; }
}

export async function makeClient() {
  const env = fs.readFileSync(new URL(".env.local", ROOT), "utf8");
  const key = env.match(/^GEMINI_API_KEY=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const { GoogleGenAI } = await import(pathToFileURL(new URL("node_modules/@google/genai/dist/node/index.mjs", ROOT).pathname.replace(/^\//, "")).href);
  return new GoogleGenAI({ apiKey: key });
}

export async function labelVideo(ai, id) {
  const call = ai.interactions.create({
    model: "gemini-3.8-flash",
    input: [{ type: "text", text: PROMPT }, { type: "video", uri: `https://www.youtube.com/watch?v=${id}` }],
    generation_config: { thinking_level: "low" },
  });
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout 90s")), 90000));
  const r = await Promise.race([call, timeout]);
  const parsed = parse(r.output_text ?? "");
  if (!parsed) throw new Error("bad json");
  return parsed;
}
