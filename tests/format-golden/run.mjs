// Format regression test: runs the format prompt on every video of a golden set,
// 3 runs each, and stores the answers. Usage (from the project root):
//   node tests/format-golden/run.mjs <golden-file> <results-dir>
//   e.g. node tests/format-golden/run.mjs golden-main.json results-main
// Costs about 0.15 agorot per call (~₪1 for both sets, 600 calls) -- the owner
// tops up the Gemini credit by hand, so say the number of calls first.
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import { FORMAT_EVAL_PROMPT, parseJson } from "../../src/lib/format-eval-prompt.ts";
import { buildAnalysisPrompt } from "../../src/lib/analysis-prompt.ts";

const MODEL = "gemini-3.8-flash"; // keep equal to MODEL in src/lib/gemini-analysis.ts
// PROMPT_MODE: "lean" (default, the format-only prompt), "prod" (the shipped
// analysis prompt, hooks included) or "prod-v7" (the same without the hook
// fields, to tell prompt-size effects from hook effects). RUNS: calls per video.
const MODE = process.env.PROMPT_MODE ?? "lean";
const PROMPT = MODE === "prod" ? buildAnalysisPrompt() : MODE === "prod-v7" ? buildAnalysisPrompt({ hooks: false }) : FORMAT_EVAL_PROMPT;
const RUNS = Number(process.env.RUNS ?? 3);
const CONCURRENCY = 2;
const CALL_TIMEOUT_MS = 90_000;

const here = path.dirname(fileURLToPath(import.meta.url));
const envText = await readFile(path.join(here, "..", "..", ".env.local"), "utf8");
const apiKey = envText.match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
if (!apiKey) throw new Error("GEMINI_API_KEY missing in .env.local");

const ai = new GoogleGenAI({ apiKey });
const golden = JSON.parse((await readFile(path.join(here, process.argv[2]), "utf8")).replace(/^﻿/, ""));
const outDir = path.join(here, process.argv[3]);
await mkdir(outDir, { recursive: true });

async function runOnce(videoId) {
  // A call can hang without ever failing (seen once); cap it so the run resumes.
  const timeout = new Promise((resolve) => setTimeout(() => resolve({ error: "timeout" }), CALL_TIMEOUT_MS));
  const call = (async () => {
    try {
      const interaction = await ai.interactions.create({
        model: MODEL,
        input: [
          { type: "text", text: PROMPT },
          { type: "video", uri: `https://www.youtube.com/watch?v=${videoId}` },
        ],
        generation_config: { thinking_level: "low" },
      });
      return parseJson(interaction.output_text ?? "") ?? { error: "invalid json" };
    } catch (error) {
      return { error: String(error?.message ?? error) };
    }
  })();
  return Promise.race([call, timeout]);
}

const queue = golden.videos.map((v) => v.id);
let done = 0;
async function worker() {
  while (queue.length) {
    const id = queue.shift();
    const file = path.join(outDir, `${id}.json`);
    const exists = await access(file).then(() => true, () => false);
    if (!exists) {
      const results = await Promise.all(Array.from({ length: RUNS }, () => runOnce(id)));
      // Never keep an all-error result (e.g. 402 out of credit) -- a re-run must redo it.
      if (results.some((r) => !r.error)) await writeFile(file, JSON.stringify({ videoId: id, results }, null, 2));
      else console.log("all calls failed for", id, results[0]?.error);
    }
    done += 1;
    if (done % 10 === 0) console.log(`${done}/${golden.videos.length}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log("DONE", done);
