import { GoogleGenAI } from "@google/genai";
import { buildAnalysisPrompt, parseJson } from "@/lib/analysis-prompt";

// Ported from the validated standalone script (scratchpad/ai-validation/run-v4.mjs,
// prompt v4) -- see "AI validation findings" in doc/CLAUDE.md §13 for what was
// tested. Production runs this ONCE per video (no repeat runs, no judge, no
// self-test/CLI machinery); confidence per field comes from its fixed tier
// (doc/Insight_Engine_Spec.md §3.2), not from cross-run agreement.
// The prompt text itself lives in analysis-prompt.ts so the test runners can
// import the very same one.

export const MODEL = "gemini-3.8-flash";
// v5 (2026-10-04): `format` draws on the owner-approved format library
// (src/lib/format-library.ts, Insight_Engine_Spec.md §3.5) with an optional
// secondary format, plus hook_style / speech / speaker_visible / sound_role.
// v6 (2026-10-06): two axes -- `format` is now the PURPOSE of the video and a
// new `layout` field says how it is shown. Both tested on hand-labelled sets
// (doc/CLAUDE.md) before shipping.
// v7 (2026-10-09): adds `call_to_action` (what the video itself asks viewers to
// do), for the CTA-type comparison. Added at the end so the other answers are
// asked for exactly as before; checked on the owner's own videos.
// v8 (2026-10-10): adds `hook_type` (+ runner-up) from the hook library and the
// `familiar_moment` tag. `hook_style` stays for now.
// v9 (2026-10-17): adds `setting` (place, background and light), so Compare can notice when two
// videos were filmed differently. Added at the end, so the other answers are asked for as before.
export const PROMPT_VERSION = "v9";
export const THINKING_LEVEL = "low";

// One prompt per language of the free-text descriptions (English is the measured one).
const PROMPTS = { en: buildAnalysisPrompt(), he: buildAnalysisPrompt({ language: "he" }) };
export type AnalysisLanguage = keyof typeof PROMPTS;

// kind: fact or inferred (fixed here, never set by the model). cap: highest
// confidence the field may ever show (high/medium/low), regardless of kind.
export const FIELD_META: Record<string, { kind: "fact" | "inferred"; cap?: "high" | "medium" | "low" }> = {
  topic: { kind: "inferred" },
  categories: { kind: "inferred" },
  format: { kind: "inferred" },
  format_secondary: { kind: "inferred" },
  layout: { kind: "inferred" },
  hook_style: { kind: "inferred" },
  hook_type: { kind: "inferred" },
  hook_type_runner_up: { kind: "inferred" },
  familiar_moment: { kind: "inferred" },
  subtitles_detected: { kind: "fact" },
  on_screen_texts: { kind: "fact" },
  spoken_hook_text: { kind: "fact" },
  sung_hook_lyrics: { kind: "fact" },
  visual_hook: { kind: "fact" },
  sound_kind: { kind: "fact", cap: "medium" },
  speech: { kind: "fact", cap: "medium" },
  speaker_visible: { kind: "fact" },
  sound_role: { kind: "inferred" },
  speech_language: { kind: "fact" },
  music_description: { kind: "inferred", cap: "low" },
  sound_candidate: { kind: "inferred", cap: "low" },
  known_format_or_trend: { kind: "inferred", cap: "low" },
  subject_specific: { kind: "inferred" },
  key_moments: { kind: "fact" },
  call_to_action: { kind: "fact" },
  setting: { kind: "inferred" },
};

export function confidenceOf(field: string): "high" | "medium" | "low" {
  const meta = FIELD_META[field];
  const base = meta.kind === "fact" ? "high" : "medium";
  if (!meta.cap) return base;
  const rank = { high: 3, medium: 2, low: 1 };
  return rank[meta.cap] < rank[base] ? meta.cap : base;
}

export type AnalyzedField = { value: unknown; kind: "fact" | "inferred"; confidence: "high" | "medium" | "low" };
export type AnalysisResult = {
  fields: Record<string, AnalyzedField>;
  model: string;
  promptVersion: string;
  thinkingLevel: string;
};

// Lazy, not module-scope: Next.js evaluates this module while collecting page
// data for every route at build time (see the same fix in supabase-admin.ts),
// so constructing this eagerly would fail the whole build whenever
// GEMINI_API_KEY isn't set yet, not just the routes that actually need it.
let cachedClient: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return cachedClient;
}

async function runAnalysis(
  videoPart: { type: "video"; uri: string; mime_type?: string },
  language: AnalysisLanguage
): Promise<AnalysisResult> {
  const ai = getClient();
  const interaction = await ai.interactions.create({
    model: MODEL,
    input: [{ type: "text", text: PROMPTS[language] }, videoPart],
    generation_config: { thinking_level: THINKING_LEVEL },
  });

  const parsed = parseJson(interaction.output_text ?? "");
  if (!parsed) {
    throw new Error("Gemini did not return valid JSON.");
  }

  const fields: Record<string, AnalyzedField> = {};
  for (const field of Object.keys(FIELD_META)) {
    fields[field] = {
      value: parsed[field] ?? null,
      kind: FIELD_META[field].kind,
      confidence: confidenceOf(field),
    };
  }

  return { fields, model: MODEL, promptVersion: PROMPT_VERSION, thinkingLevel: THINKING_LEVEL };
}

export async function analyzeYoutubeVideo(youtubeUrl: string, language: AnalysisLanguage = "en"): Promise<AnalysisResult> {
  return runAnalysis({ type: "video", uri: youtubeUrl }, language);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Deep upload (TikTok, and later Instagram-with-music): the creator's own file,
// uploaded to Gemini's Files API, analyzed, then deleted right after -- full
// videos are never kept (doc/CLAUDE.md §8). Mirrors the large-file branch of
// the validated scratchpad script (run-v4.mjs's buildInput).
export async function analyzeUploadedVideo(file: Blob, mimeType: string, language: AnalysisLanguage = "en"): Promise<AnalysisResult> {
  const ai = getClient();
  const uploaded = await ai.files.upload({ file, config: { mimeType } });
  let current = uploaded;

  try {
    while (current.state === "PROCESSING") {
      await sleep(2000);
      current = await ai.files.get({ name: uploaded.name! });
    }

    if (current.state === "FAILED" || !current.uri) {
      throw new Error("Gemini could not process the uploaded file.");
    }

    return await runAnalysis({ type: "video", uri: current.uri, mime_type: mimeType }, language);
  } finally {
    await ai.files.delete({ name: uploaded.name! }).catch(() => null);
  }
}
