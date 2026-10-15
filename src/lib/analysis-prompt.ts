// The production analysis prompt, kept as plain code with relative imports so the
// Node regression runners (tests/format-golden, tests/hook-golden) can import
// and run exactly what ships. Used by gemini-analysis.ts.
//
// v8 (2026-10-10): adds `hook_type` (the hook library, src/lib/hook-library.ts)
// and `familiar_moment`. `hook_style` is kept for now so existing screens keep
// working. `hooks: false` builds the v7-equivalent prompt, used only to compare
// v7 and v8 on the golden sets.

// @ts-expect-error TS5097: explicit .ts extension so the plain-Node test runners can load this file.
import { formatGuideText, layoutGuideText, HOOK_STYLES, SPEECH_KINDS, SOUND_ROLES } from "./format-library.ts";
// @ts-expect-error TS5097: explicit .ts extension so the plain-Node test runners can load this file.
import { hookGuideText, FAMILIAR_KINDS } from "./hook-library.ts";

export const CATEGORIES = [
  "food", "music", "gaming", "fitness_wellness", "fashion_beauty", "tech", "travel",
  "business_finance", "education", "entertainment_comedy", "lifestyle", "sports",
  "automotive", "art_creative", "other",
];

export const SOUND_KINDS = ["original_speech", "speech_over_music", "music", "sound_effects_only", "silent"];

export const CTA_TYPES = ["comment_question", "comment_invite", "follow", "like_or_share", "tag_friend", "link_or_buy", "other"];

// `language` only changes which language the free-text descriptions are written in; the English
// prompt (the one the golden sets measured) is exactly the same as before.
export function buildAnalysisPrompt({ hooks = true, language = "en" }: { hooks?: boolean; language?: "en" | "he" } = {}): string {
  return `You are analyzing a short-form social video to build a "Content Identity" profile for it. \
Watch the video and return ONLY one JSON object (no markdown fences, no commentary) with exactly these keys:

{
  "topic": string,
  "categories": string[],
  "format": string,
  "format_secondary": string | null,
  "layout": string,
  "hook_style": string,${hooks ? `
  "hook_type": string,
  "hook_type_runner_up": string | null,
  "familiar_moment": string,` : ""}
  "subtitles_detected": boolean,
  "on_screen_texts": [ { "text": string, "role": "label" | "caption" | "title" | "card" | "scene" | "other" } ],
  "spoken_hook_text": string | null,
  "sung_hook_lyrics": string | null,
  "visual_hook": string,
  "sound_kind": string,
  "speech": string,
  "speaker_visible": boolean | null,
  "sound_role": string,
  "speech_language": string | null,
  "music_description": string | null,
  "sound_candidate": string | null,
  "known_format_or_trend": string | null,
  "subject_specific": string | null,
  "key_moments": [ { "at_seconds": number, "type": "hook" | "reveal" | "peak" | "transition" | "other", "what_happens": string } ],
  "call_to_action": { "type": string, "text": string, "where": "on_screen_text" | "spoken" | "sung", "at_seconds": number } | null
}

What each key means:
- topic: what the video is about, at most 12 words.
- categories: 1 or 2 ids, ONLY from this list: ${CATEGORIES.join(", ")}.
- format: the PURPOSE of the video - what it is for (not its topic and not how it is shown). Exactly one id from this list:
${formatGuideText()}
- format_secondary: a second purpose id from the same list ONLY if the video clearly also fits another purpose; otherwise null. Never repeat the primary.
- layout: HOW the video is shown. Exactly one id from this list:
${layoutGuideText()}
- hook_style: how the first seconds work. One of: ${HOOK_STYLES.map((s) => `"${s}"`).join(", ")}. "text_led_message" = a caption carrying an insight, feeling or question is the hook; "cutaway_setup" = a raw/staged/hidden-camera-looking clip, then a cut to the creator or a clean shot.${hooks ? `
- hook_type: how the OPENING of the video (the first sentence, about the first 3 to 6 seconds) makes a viewer stay. Exactly one id from this list, in tie-break order (the first that clearly applies wins):
${hookGuideText()}
- hook_type_runner_up: a second id from the same list only if the opening clearly also fits it, else null.
- familiar_moment: what the opening is tied to that viewers already recognise. One of ${FAMILIAR_KINDS.map((k) => `"${k.id}"`).join(", ")}. ${FAMILIAR_KINDS.map((k) => `"${k.id}" = ${k.description}`).join(" ")}` : ""}
- subtitles_detected: true only if burned-in captions or subtitles are visible.
- on_screen_texts: EVERY distinct piece of text visible on screen during roughly the first 3 seconds \
(a label above a person, a card, a title, a caption). One entry per piece of text, with its role. Text that is \
part of the surroundings, such as a shop sign or a poster, gets the role "scene". Empty list if none.
- spoken_hook_text: the words SPOKEN (not sung) in roughly the first 3 seconds, or null.
- sung_hook_lyrics: the first sung line, if the video starts with singing, or null.
- visual_hook: one sentence on what happens visually in roughly the first 3 seconds.
- sound_kind: exactly one of: ${SOUND_KINDS.join(", ")}.
- speech: one of ${SPEECH_KINDS.map((s) => `"${s}"`).join(", ")}.
- speaker_visible: true if the person speaking or singing is visible on screen, false if only heard, null if nobody speaks or sings.
- sound_role: one of ${SOUND_ROLES.map((s) => `"${s}"`).join(", ")}. "asmr_natural" = natural sounds ARE the content (a knife, crunching); "music_background" = a song laid under footage; "trending_sound" = a known sound/song used for a dance, lip-sync or trend.
- speech_language: the language of the SPOKEN words, as its English name (for example Hebrew), \
or null if nobody speaks. Singing does not count as speech.
- music_description: coarse only: vocal or instrumental, the language of the lyrics, mood or genre. \
Do NOT name any instrument.
- sound_candidate: your best guess at the NAME of a specific song or a known viral/meme sound, if you \
have a real candidate. It is shown to the user as an unverified guess, so an uncertain candidate is \
allowed, but never invent one; use null if you have none.
- known_format_or_trend: a specific named meme format, challenge or trend, only if you truly recognize it.
- subject_specific: a specific product, game, dish, song, place and so on, if there is one.
- key_moments: 1 to 3 moments, seconds from the start. Describe only what happens, no interpretation.
- call_to_action: the ONE clearest thing the video itself asks viewers to do, or null if it asks nothing. Only an explicit ask shown or said in the video counts, in ANY part of it, including the end - not a hope you infer. type is one of: ${CTA_TYPES.map((s) => `"${s}"`).join(", ")}. "comment_question" = asks viewers for an opinion or an answer, including a question, a poll or "tell me if I should continue" ("what do you think?", "which one?"); "comment_invite" = ONLY when commenting is invited together with a personal promise or reward in return (for example "comment and I will remember you", "write your name and I will reply") - a plain question is never comment_invite; "follow" = follow or subscribe; "like_or_share" = like, share or save; "tag_friend" = tag or send to someone; "link_or_buy" = visit a link or buy; "other" = any other explicit ask. text = the exact words, in their original language; where = how the ask appears; at_seconds = when it first appears.

Rules:
- Quote text EXACTLY as written, in its original language and spelling. Do not correct, translate, add or drop letters.
- Do NOT describe any person's age, gender, ethnicity, body or appearance. Say "a person" or "the creator" and describe only what they do.
- Use null (or an empty list) for anything that is absent.
- Describe only what you can actually see or hear.${language === "he" ? `
- Language: write these free-text descriptions in Hebrew: topic, visual_hook, music_description, subject_specific, and each key moment's what_happens. Everything else stays exactly as specified above (ids in English, quoted text in its original language, speech_language as its English name).` : ""}`;
}

export function parseJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
