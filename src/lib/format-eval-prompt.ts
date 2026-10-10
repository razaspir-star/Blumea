// The lean format-only prompt used by the format regression test
// (tests/format-golden/). It is built from the same format library and layout
// list as the production prompt in gemini-analysis.ts, so a run measures what
// ships. Kept as plain code so the Node test runner can import it directly.

// @ts-expect-error TS5097: explicit .ts extension so the plain-Node test runner can load this file.
import { formatGuideText, layoutGuideText } from "./format-library.ts";

export const FORMAT_EVAL_PROMPT = `You are classifying a short-form social video on two independent axes - its PURPOSE (what the video is for) and its LAYOUT (how it is shown) - not its topic. Watch the video and return ONLY one JSON object (no markdown, no commentary):

{
  "format": string,
  "format_secondary": string | null,
  "layout": string,
  "hook_style": string,
  "speech": string,
  "speaker_visible": boolean | null,
  "sound_role": string,
  "other_description": string | null
}

- format: the PURPOSE of the video - what it is for (not its topic and not how it is shown). Exactly one id from this list:
${formatGuideText()}
- format_secondary: a second purpose id from the same list ONLY if the video clearly also fits another purpose; otherwise null. Never repeat the primary.
- layout: HOW the video is shown. Exactly one id from this list:
${layoutGuideText()}
- hook_style: how the first seconds work. One of: "text_led_message", "cutaway_setup", "other", "none".
- speech: one of "none", "on_camera", "voiceover", "text_to_speech", "dialogue", "sung".
- speaker_visible: true if the person speaking or singing is visible on screen, false if only heard, null if nobody speaks or sings.
- sound_role: one of "asmr_natural", "music_background", "speech_led", "sung_by_creator", "trending_sound", "other".
- other_description: if format is "other", one sentence describing how the video is built; otherwise null.

Judge by structure. Do not describe any person's age, gender, ethnicity or appearance.`;

export function parseJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}
