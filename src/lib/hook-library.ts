// DRAFT hook library (owner idea 2026-10-10, doc/Insight_Engine_Spec.md §5.2):
// how the FIRST SECONDS of a video try to make a viewer stay. Independent of the
// format (purpose) and layout axes in format-library.ts. Not wired into the AI
// prompt or any rule yet -- like formats, a hook type joins production only
// after the owner approves its definition and it is checked on labelled
// examples (tests/format-golden style). Until then `hook_style` in
// format-library.ts stays as it is.
//
// Design choices:
//  - ONE primary mechanism per video, chosen by the tie-break order below.
//  - "Familiar moment" (a food of the season, a holiday, an everyday experience,
//    a trend) is a separate tag, not a hook type: it says what the opening is
//    ABOUT, while the hook type says how the opening WORKS. A video can be a
//    preview-then-start AND tied to a holiday.

import type { Translator, TextKey } from "@/lib/i18n/translate";

export type HookTypeDef = { id: string; label: string; description: string };

// Listed in tie-break order: the first one that clearly applies wins.
export const HOOK_TYPES: HookTypeDef[] = [
  {
    id: "preview_then_start",
    label: "Best part first, then back to the start",
    description:
      "the opening shows a moment that happens LATER in the video - the finished result, the most striking line of the conversation - and then the video jumps back to its real beginning (a finished cake, then the recipe from step one; a heated line from mid-podcast, then the conversation from the top). It needs the jump: if the video simply starts with its result and stays there, it is not this.",
  },
  {
    id: "provocative_claim",
    label: "Provocation",
    description:
      "the first sentence (said or written) is a deliberately bold, contrarian or shocking statement meant to make the viewer react or disagree (\"why you must not drink water\", \"nobody is talking about this\"). A startling or taboo personal confession counts too - saying something you are not supposed to say, such as \"all my life my parents controlled me with money\" or \"I might not recognise my little brother in the street\". A plain opinion, a gentle feeling or an ordinary personal story is not enough - it has to push. The push may come at the end of a long first sentence.",
  },
  {
    id: "viewer_comment",
    label: "Reads a viewer's comment, then answers",
    description:
      "the opening shows or reads out a comment, question or message from a viewer (a comment sticker on screen, the creator reading it aloud) and the creator then answers or reacts to it. The viewer's words are the hook. A creator who simply starts talking, with no comment shown or read, is not this.",
  },
  {
    id: "open_question",
    label: "A question to the viewer",
    description:
      "the first line (said or written) is a question put to the viewer, or a poll (\"which one is it?\", \"would you eat this?\"), and it is not a provocation. The viewer is asked, not told.",
  },
  {
    id: "personal_address",
    label: "Speaks to the viewer personally",
    description:
      "the opening addresses the viewers themselves as people: by name, by a group they belong to, or with a direct invitation to take part (\"comment and I will remember you\", names of followers shown on screen, \"if you are the kind of person who...\"). Calling out a specific community also counts, in words or in a caption (\"Harry Potter fans, you need this\", a message aimed at one football club's supporters) - even when the context needed to understand who it is for is local. Showing something a generation recognises (\"how 90s kids celebrated birthdays\") without speaking to the viewers themselves is not this - that is a familiar moment (nostalgia).",
  },
  {
    id: "visual_action",
    label: "A visual opening",
    description:
      "the opening works through what is seen, with no words needed: setting the camera down, moving with the camera, a striking close-up, a sudden movement (an object thrown into the frame, say), a transition into the scene. The first seconds are about the image or the motion.",
  },
  {
    id: "text_statement",
    label: "A caption carries the message",
    description:
      "an on-screen sentence (a feeling, insight or story line) is the opening and it is not a question or a provocation; the footage underneath is incidental. This is today's `text_led_message`.",
  },
  {
    id: "setup_cutaway",
    label: "A setup clip, then a cut",
    description:
      "a raw, staged or hidden-camera-looking clip first, then a cut to the creator or to a clean shot. This is today's `cutaway_setup`.",
  },
  {
    id: "straight_in",
    label: "Straight into it",
    description:
      "no opening device: the video simply starts doing its thing (starts singing, starts cooking, starts talking about the topic) with no preview, no striking line, no question, no caption leading.",
  },
  { id: "other", label: "Other", description: "none of the above fits." },
];

export const HOOK_TYPE_IDS = HOOK_TYPES.map((hook) => hook.id);

export function hookTypeLabel(id: string | null | undefined, t?: Translator): string | null {
  const base = HOOK_TYPES.find((hook) => hook.id === id)?.label ?? null;
  return t && id && t.has(`library.hook.${id}`) ? t(`library.hook.${id}` as TextKey) : base;
}

export function familiarLabel(id: string | null | undefined, t?: Translator): string | null {
  const base = FAMILIAR_KINDS.find((kind) => kind.id === id)?.label ?? null;
  return t && id && t.has(`library.familiar.${id}`) ? t(`library.familiar.${id}` as TextKey) : base;
}

// The text given to the AI (when this is wired in): one line per hook type, in
// tie-break order.
export function hookGuideText(): string {
  return HOOK_TYPES.map((hook) => `  - "${hook.id}": ${hook.description}`).join("\n");
}

// Separate tag: what the opening is tied to that viewers already recognise.
export const FAMILIAR_KINDS: HookTypeDef[] = [
  { id: "season_or_holiday", label: "Season or holiday", description: "tied to the time of year or a holiday (a krembo in winter, apple and honey at Rosh Hashana, cheese at Shavuot)." },
  { id: "everyday_experience", label: "Everyday experience", description: "a common, recognisable experience or product (a fast-food meal, a morning commute, a familiar brand)." },
  { id: "nostalgia", label: "Nostalgia", description: "a generation or an era people remember and identify with (how kids in the 90s celebrated birthdays, things only people who grew up then know)." },
  { id: "trend", label: "A current trend", description: "a known trend, sound or meme format of the moment." },
  { id: "none", label: "Nothing in particular", description: "not tied to anything viewers already recognise." },
];
