// The format library (doc/Insight_Engine_Spec.md §3.5): how a video is BUILT,
// independent of its niche. One source of truth for the AI prompt, the labels
// shown to creators, and the norms rules use to decide where they apply.
// Labels shown to creators come from the dictionaries when a translator is passed (Hebrew/English);
// the English labels below stay for the AI prompt and for scripts that run without a language.
import type { Translator, TextKey } from "@/lib/i18n/translate";

function localized(t: Translator | undefined, key: string, fallback: string | null): string | null {
  return t && t.has(key) ? t(key as TextKey) : fallback;
}

// A format joins this list only when the owner approves it (§3.5, "learning
// over time, with a gate").
//
// Two independent axes (owner decision 2026-10-06, after the purpose x layout
// experiment in doc/CLAUDE.md):
//   format = the PURPOSE of the video (what it is for)
//   layout = how it is SHOWN (to camera, narration over..., split screen...)
// plus, from other fields, a few style tags (ASMR, song as the sound...).
// A video can fit two purposes ("also fits"); singing is a sound attribute, not
// a layout, so cover singers are not judged differently from original ones.

// textNorm: is on-screen text a normal part of this format?
//   "common"   -> yes; a missing text hook is worth a look (rules may fire)
//   "optional" -> works fine either way; rules must stay silent about text
export type FormatDef = {
  id: string;
  label: string;
  description: string;
  textNorm: "common" | "optional";
};

export const FORMATS: FormatDef[] = [
  { id: "skill_process", label: "Skill / process", textNorm: "optional", description: "no speech; the footage shows a skill or process being done - cooking, cleaning, building, restocking, crafting (any subject, not only food) - and the process itself is what holds attention. Natural sounds (ASMR) or a song may play." },
  { id: "caption_clip", label: "Sound + caption", textNorm: "common", description: "no speech; one on-screen sentence (an opinion, feeling, question or insight) is the message, laid over incidental footage - a person doing an everyday action, or singing/miming a song in the background - with a song or sound playing. No skill or process is being shown, and the miming itself is not the point (that would be lip_sync)." },
  { id: "reaction_stitch", label: "Reaction", textNorm: "optional", description: "a clip (someone else's video or found footage), then a cut/stitch of the creator reacting, silently (a face) or by speaking; also a reaction shown in a split screen. Several stitches may answer line by line." },
  { id: "chat_opinion", label: "Opinion / chat", textNorm: "common", description: "the default for a person simply talking - an opinion, a chat, a personal update, a funny remark - when it is NOT more specifically a story (storytelling), a how-to (tutorial), a counted list (list_tips), a comparison, a reaction or a reply. When a more specific purpose fits, use that one." },
  { id: "self_dialogue", label: "Talking to self / characters", textNorm: "common", description: "one person plays several characters or asks and answers themself, usually with cuts between characters." },
  { id: "podcast_clip", label: "Podcast clip", textNorm: "common", description: "a conversation clip in a podcast/interview setting (hosts, mics); the other person may be visible or not." },
  { id: "reply_to_comment", label: "Reply to a comment", textNorm: "common", description: "the creator answers a viewer's comment or question that is shown on screen (includes question-and-answer style)." },
  { id: "pov_skit", label: "POV skit", textNorm: "common", description: "an acted first-person scenario, often captioned \"POV\"." },
  { id: "trend_dance", label: "Trend / dance", textNorm: "optional", description: "dancing or joining a known trend/choreography; the movement is the point. (If the point is teaching the steps, it is a tutorial.)" },
  { id: "lip_sync", label: "Lip-sync", textNorm: "optional", description: "mouthing/miming to a sound or song - alone, while doing something else (walking, running), or alternating with silent question-and-answer captions. Wins over caption_clip when the mouthing is the main visible action." },
  { id: "challenge", label: "Challenge", textNorm: "optional", description: "performing a challenge or dare, including videos framed as one (#challenge, 'try not to laugh', eating/food challenges). The challenge framing wins over the activity itself (cooking, eating)." },
  { id: "unboxing_review", label: "Unboxing / review", textNorm: "optional", description: "opening, testing or reviewing a product." },
  { id: "music_performance", label: "Music performance", textNorm: "optional", description: "the creator sings or plays an instrument to the camera (an original song or a cover - not distinguished)." },
  { id: "music_montage", label: "Music montage", textNorm: "optional", description: "several short clips cut to the beat of a song; no speech, no numbered or listed items, and no single point - a vibe." },
  { id: "filter_game", label: "Filter game", textNorm: "optional", description: "playing a game built on a camera effect/filter." },
  { id: "transition_edit", label: "Transition", textNorm: "optional", description: "the creator pauses/covers the lens/cuts and the scene or outfit changes." },
  { id: "comparison_vs", label: "Comparison", textNorm: "common", description: "two or more things set against each other - this vs that, expectation vs reality, which of several is best; scores may appear inside the comparison." },
  { id: "ranking", label: "Ranking", textNorm: "common", description: "rating or ranking several things: 'top N' countdowns, items given scores, tiers or places, one after another - even when a person talks over it (this is not a podcast)." },
  { id: "interview_street", label: "Interview", textNorm: "common", description: "questions put to people in the street or to a guest." },
  { id: "ai_generated", label: "AI-generated", textNorm: "optional", description: "made with AI (avatar, AI voice, AI-generated footage)." },
  { id: "tutorial", label: "Tutorial", textNorm: "optional", description: "teaches how to do something, step by step, including dance tutorials and instructional tips ('how to...'). Wins over trend_dance when the point is learning the steps, and over list_tips when the tips are explained as a method rather than counted." },
  { id: "list_tips", label: "List / tips", textNorm: "common", description: "an enumerated list: numbered or counted items ('8 things to do in X', '5 tips'), even when laid over footage or clips." },
  { id: "reveal_before_after", label: "Before / after reveal", textNorm: "optional", description: "a before/after or a final reveal of a RESULT is the point - a transformation, makeover, surgery or finished product shown against how it was before - even if photos are shown on screen." },
  { id: "routine_vlog", label: "Day in my life", textNorm: "optional", description: "a day in my life / routine / vlog." },
  { id: "meme_edit", label: "Meme edit", textNorm: "common", description: "the video is built from a known meme, a movie scene or a viral clip (found footage, not filmed by the creator for this video) edited with text, sound or cuts - the edit is the point; re-creating a known meme template yourself counts too. A compilation of memes counts. A raw template file with no edit does not, and a meme clip inserted into another kind of video does not make it a meme edit; a filmed video that merely uses a meme sound is a trend, lip-sync or caption video." },
  { id: "storytelling", label: "Story", textNorm: "optional", description: "a personal or narrated story with a beginning, middle and end is the point - told to the camera, or as a voiceover over any footage (including footage that has nothing to do with the story)." },
  { id: "behind_the_scenes", label: "Behind the scenes", textNorm: "optional", description: "shows how something is made or what happens behind the scenes." },
  { id: "other", label: "Other", textNorm: "optional", description: "none of the above fits." },
];

// Formats built around a moment everyone waits for (the result, the unboxing, the outcome of a
// challenge). Only for these is a "reveal comes too late" claim meaningful; in a chat or a
// song there is no reliable "peak" to point at.
export const PAYOFF_FORMATS = ["reveal_before_after", "skill_process", "unboxing_review", "challenge"];

export const FORMAT_IDS = FORMATS.map((format) => format.id);

export type LayoutDef = {
  id: string;
  // Plain words shown to creators (no internal terms).
  label: string;
  description: string;
  textNorm: "common" | "optional";
};

export const LAYOUTS: LayoutDef[] = [
  { id: "to_camera", label: "Talking or singing to the camera", textNorm: "optional", description: "the creator speaks, or sings on camera, straight to the camera - their own voice, visibly. If nobody visibly speaks or sings, it is not this." },
  { id: "voiceover_on_activity", label: "Narration explaining what's on screen", textNorm: "common", description: "a voiceover narrates or explains what we see on screen (a task, a process, a recipe, a day); the speaker is not shown speaking." },
  { id: "voiceover_over_background", label: "Narration about something unrelated to the footage", textNorm: "common", description: "a voiceover or robotic text-to-speech tells something that has nothing to do with the footage - gameplay, subway-surfers style, 'oddly satisfying' clips, or cooking footage under an unrelated story." },
  { id: "split_screen", label: "Split screen", textNorm: "optional", description: "a split-screen layout: a clip on one half and a person (or a duet partner) on the other." },
  { id: "green_screen", label: "In front of an image", textNorm: "optional", description: "the creator stands in front of an image, article, screenshot or photo of notes." },
  { id: "conversation", label: "A conversation", textNorm: "common", description: "two or more people talking to each other (podcast, interview setting)." },
  { id: "silent", label: "No speech - sound and text carry it", textNorm: "optional", description: "nobody visibly speaks or sings on camera; sound, music (even a song by the creator that plays only as audio) and/or on-screen text carry the video - even if a person is on screen doing something." },
];

export const LAYOUT_IDS = LAYOUTS.map((layout) => layout.id);

export const HOOK_STYLES = ["text_led_message", "cutaway_setup", "other", "none"] as const;

export const SPEECH_KINDS = ["none", "on_camera", "voiceover", "text_to_speech", "dialogue", "sung"] as const;

export const SOUND_ROLES = ["asmr_natural", "music_background", "speech_led", "sung_by_creator", "trending_sound", "other"] as const;

// Formats of v5-analyzed videos that no longer exist as purposes. Kept only so
// those stored values still get a label and a text norm; never given to the AI.
const LEGACY_FORMATS: Pick<FormatDef, "id" | "label" | "textNorm">[] = [
  { id: "talking_to_camera", label: "Talking to camera", textNorm: "common" },
  { id: "voiceover_on_activity", label: "Voiceover on the activity", textNorm: "common" },
  { id: "voiceover_over_background", label: "Voiceover over background footage", textNorm: "common" },
  { id: "split_screen_reaction", label: "Split-screen reaction", textNorm: "optional" },
  { id: "green_screen", label: "Green screen", textNorm: "optional" },
];

// One line per item, for the AI prompt.
export function formatGuideText(): string {
  return FORMATS.map((format) => `${format.id}: ${format.description}`).join("\n");
}

export function layoutGuideText(): string {
  return LAYOUTS.map((layout) => `${layout.id}: ${layout.description}`).join("\n");
}

function findFormat(id: string | null | undefined) {
  if (!id) return undefined;
  return FORMATS.find((format) => format.id === id) ?? LEGACY_FORMATS.find((format) => format.id === id);
}

export function formatLabel(id: string | null | undefined, t?: Translator): string | null {
  if (!id) return null;
  return localized(t, `library.format.${id}`, findFormat(id)?.label ?? null);
}

export function layoutLabel(id: string | null | undefined, t?: Translator): string | null {
  if (!id) return null;
  return localized(t, `library.layout.${id}`, LAYOUTS.find((layout) => layout.id === id)?.label ?? null);
}

export function categoryLabel(id: string, t?: Translator): string {
  return localized(t, `library.category.${id}`, CATEGORY_LABELS[id] ?? id) ?? id;
}

export const CATEGORY_LABELS: Record<string, string> = {
  food: "Food & cooking",
  music: "Music",
  gaming: "Gaming",
  fitness_wellness: "Fitness & wellness",
  fashion_beauty: "Fashion & beauty",
  tech: "Tech",
  travel: "Travel",
  business_finance: "Business & finance",
  education: "Education",
  entertainment_comedy: "Entertainment & comedy",
  lifestyle: "Lifestyle",
  sports: "Sports",
  automotive: "Automotive",
  art_creative: "Art & creative",
  other: "Other",
};

// The same purpose reads differently in different niches: a tutorial about food
// is a recipe. Start small; extend as real examples appear.
const NICHE_FORMAT_NAMES: Record<string, Record<string, string>> = {
  tutorial: { food: "Recipe" },
};

export function friendlyFormatLabel(
  formatId: string | null | undefined,
  categories: string[] | null | undefined,
  t?: Translator
): string | null {
  const base = formatLabel(formatId, t);
  if (!base || !formatId) return base;
  const niche = categories?.find((category) => NICHE_FORMAT_NAMES[formatId]?.[category]);
  // Only the "tutorial about food = recipe" renaming exists so far.
  return niche ? (localized(t, "library.format.recipe", NICHE_FORMAT_NAMES[formatId][niche]) ?? base) : base;
}

// Small style tags from fields the AI already returns -- not formats.
export function styleTags(input: { soundRole?: string | null; hookStyle?: string | null }, t?: Translator): string[] {
  const tags: string[] = [];
  const tag = (key: string, fallback: string) => tags.push(localized(t, `library.style.${key}`, fallback) ?? fallback);
  if (input.soundRole === "asmr_natural") tag("asmr", "ASMR");
  if (input.soundRole === "music_background") tag("song", "A song as the sound");
  if (input.soundRole === "trending_sound") tag("trending", "A trending sound");
  if (input.soundRole === "sung_by_creator") tag("sung", "Sung by the creator");
  if (input.hookStyle === "text_led_message") tag("caption", "A caption leads");
  if (input.hookStyle === "cutaway_setup") tag("setup", "A setup clip, then a cut");
  return tags;
}

// Rules about on-screen text (no text in the opening, no captions on speech)
// apply only where text is a normal part of the video: its purpose or how it is
// shown. An unknown format -- including "other" and any id from before the
// library existed -- keeps them silent: principle 4 (silence beats a weak
// claim), and the owner's rule that a missing element is never a flaw unless
// the format expects it.
export function textIsNormFor(formatId: string | null | undefined, layoutId?: string | null): boolean {
  if (!formatId || formatId === "other") return false;
  if (findFormat(formatId)?.textNorm === "common") return true;
  return !!layoutId && LAYOUTS.find((layout) => layout.id === layoutId)?.textNorm === "common";
}
