import type { SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { parseJson } from "@/lib/analysis-prompt";
import { HOOK_TYPE_IDS, hookTypeLabel } from "@/lib/hook-library";
import { formatLabel } from "@/lib/format-library";
import type { TextKey, Translator } from "@/lib/i18n/translate";

// Blumea Idea: an idea for the creator's next video from their own videos on ONE platform.
// Code chooses and writes the evidence (numbers, titles, platforms: nothing the AI can invent or mix); the AI
// only turns that evidence into ideas that cite it, plus a separate, labelled creative part (new hook lines)
// that is not from the data. Code then checks every idea: it must cite real evidence about at least one video,
// and every hook type must come from the hook library and differ from the creator's usual one.
// First experiments: doc/CLAUDE.md "Blumea Idea".

export const IDEAS_PER_MONTH = 10;
export const IDEA_MIN_READ = 3;

let cached: GoogleGenAI | null = null;
const client = () => (cached ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }));

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};
const str = (v: unknown, max = 140) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}K` : String(Math.round(n)));

type Row = {
  id: string;
  title: string;
  published: string;
  seconds: number | null;
  views: number;
  likes: number | null;
  comments: number | null;
  gained: number | null;
  read: boolean;
  format: string | null;
  hook: string | null;
  hookText: string | null;
  subject: string | null;
};

export type IdeaEvidence = { id: string; videoId: string | null; text: string };
export type IdeaResult = {
  platform: string;
  unread: { id: string; title: string; views: number }[];
  ideas: { idea: string; evidence: IdeaEvidence[]; keep: string; change: string; howToKnow: string; limit: string }[];
  // New suggestions that are not drawn from the data: a hook and what to do in the video.
  creative: { ideas: { hook: string; type: string; typeLabel: string; todo: string; fits: string }[] } | null;
};

async function loadRows(admin: SupabaseClient, profileId: string, platform: string): Promise<{ rows: Row[]; followers: number | null }> {
  const { data: videos } = await admin.from("videos").select("id, title, published_at, duration_sec").eq("profile_id", profileId).eq("platform", platform);
  const ids = (videos ?? []).map((v) => v.id as string);
  if (ids.length === 0) return { rows: [], followers: null };
  const [{ data: snaps }, { data: profiles }, { data: account }] = await Promise.all([
    admin.from("video_metric_snapshots").select("video_id, views, likes, comments, breakdowns, captured_at").in("video_id", ids).order("captured_at", { ascending: false }),
    admin.from("video_ai_profiles").select("video_id, fields").in("video_id", ids).eq("is_current", true),
    admin.from("connected_accounts").select("id").eq("profile_id", profileId).eq("platform", platform).maybeSingle(),
  ]);
  let followers: number | null = null;
  if (account) {
    const { data: s } = await admin.from("account_snapshots").select("followers_count").eq("connected_account_id", account.id).order("captured_at", { ascending: false }).limit(1).maybeSingle();
    followers = (s?.followers_count as number | null) ?? null;
  }
  const latest = new Map<string, NonNullable<typeof snaps>[number]>();
  for (const s of snaps ?? []) if (!latest.has(s.video_id as string)) latest.set(s.video_id as string, s);
  const fieldsOf = new Map((profiles ?? []).map((p) => [p.video_id as string, p.fields as Record<string, { value?: unknown }>]));

  const rows = (videos ?? [])
    .map((v): Row => {
      const m = latest.get(v.id as string);
      const f = fieldsOf.get(v.id as string);
      const texts = ((f?.on_screen_texts?.value as { text: string; role: string }[] | undefined) ?? []).filter((x) => x.role !== "scene").map((x) => x.text);
      return {
        id: v.id as string,
        title: (str(v.title, 50) ?? "").replace(/\s+/g, " "),
        published: (v.published_at as string | null)?.slice(0, 10) ?? "",
        seconds: (v.duration_sec as number | null) ?? null,
        views: (m?.views as number | null) ?? 0,
        likes: (m?.likes as number | null) ?? null,
        comments: (m?.comments as number | null) ?? null,
        gained: ((m?.breakdowns as { growth?: { subscribersGained?: number } } | null)?.growth?.subscribersGained as number | undefined) ?? null,
        read: Boolean(f),
        format: str(f?.format?.value, 40),
        hook: str(f?.hook_type?.value, 40),
        hookText: texts.join(" / ").slice(0, 120) || str(f?.spoken_hook_text?.value) || str(f?.sung_hook_lyrics?.value),
        subject: str(f?.subject_specific?.value, 50),
      };
    })
    .filter((r) => r.views > 0)
    .sort((a, b) => b.published.localeCompare(a.published));
  return { rows, followers };
}

export async function buildIdea(admin: SupabaseClient, profileId: string, platform: string, t: Translator): Promise<IdeaResult | { error: "not_enough"; read: number } | { error: "failed" }> {
  const { rows: own, followers } = await loadRows(admin, profileId, platform);
  const read = own.filter((r) => r.read);
  if (read.length < IDEA_MIN_READ) return { error: "not_enough", read: read.length };

  const typical = median(own.map((r) => r.views));
  const half = Math.floor(own.length / 2);
  const recent = median(own.slice(0, half).map((r) => r.views));
  const earlier = median(own.slice(own.length - half).map((r) => r.views));
  const idea = (key: string, params: Record<string, string | number>) => t(`idea.${key}` as TextKey, params);
  const quote = (text: string) => (t.locale === "he" ? `״${text}״` : `“${text}”`);

  // ---- the evidence: an English line for the AI, a localized line for the creator ----
  const evidence = new Map<string, { videoId: string | null; ai: string; shown: string; kind: "video" | "followers" | "other" }>();
  const top = [...read].sort((a, b) => b.views - a.views).slice(0, 5);
  top.forEach((r, i) => {
    evidence.set(`E${i + 1}`, {
      videoId: r.id,
      kind: "video",
      ai: `“${r.title}” (${r.published}): ${k(r.views)} views, ${r.likes ?? "?"} likes, ${r.comments ?? "?"} comments, ${r.seconds ?? "?"} s. Format: ${(r.format && formatLabel(r.format, t)) || "?"}. Hook type: ${(r.hook && hookTypeLabel(r.hook, t)) || "?"}. Hook words: ${r.hookText ? `“${r.hookText}”` : "none"}. Subject: ${r.subject ?? "none"}.`,
      shown: idea("evVideo", {
        title: quote(r.title),
        date: r.published,
        views: k(r.views),
        likes: r.likes ?? "?",
        comments: r.comments ?? "?",
        seconds: r.seconds ?? "?",
        format: (r.format && formatLabel(r.format, t)) || "?",
        hook: (r.hook && hookTypeLabel(r.hook, t)) || "?",
        words: r.hookText ? ` ${quote(r.hookText)}` : "",
      }),
    });
  });
  evidence.set("E6", {
    videoId: null,
    kind: "other",
    ai: `Level on ${platform}: a typical video gets ${k(typical)} views (${own.length} videos, ${followers ? `${followers} followers` : "followers unknown"}). The latest ${half} videos typically got ${k(recent)}, the ${half} before them ${k(earlier)}.`,
    shown: idea("evLevel", { median: k(typical), count: own.length, n: half, a: k(recent), b: k(earlier) }),
  });
  const withGain = read.filter((r) => r.gained !== null);
  const byFormat = new Map<string, number[]>();
  for (const r of withGain) if (r.format) byFormat.set(r.format, [...(byFormat.get(r.format) ?? []), r.gained as number]);
  for (const [format, values] of byFormat) {
    const rest = withGain.filter((r) => r.format !== format).map((r) => r.gained as number);
    if (values.length >= 3 && rest.length >= 3 && median(values) >= 1 && median(values) >= 1.3 * median(rest)) {
      evidence.set("E7", {
        videoId: null,
        kind: "followers",
        ai: `New followers: ${formatLabel(format, t) ?? format} videos bring about ${median(values).toFixed(0)} new followers per video (${values.length} videos), against ${median(rest).toFixed(0)} for the others (${rest.length} videos).`,
        shown: idea("evFollowers", { format: formatLabel(format, t) ?? format, a: median(values).toFixed(0), n: values.length, b: median(rest).toFixed(0), m: rest.length }),
      });
    }
  }
  const formats = new Map<string, Row[]>();
  for (const r of read) if (r.format) formats.set(r.format, [...(formats.get(r.format) ?? []), r]);
  const main = [...formats.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  if (main && main[1].length >= 4) {
    const groups = new Map<string, number[]>();
    for (const r of main[1]) if (r.hook) groups.set(r.hook, [...(groups.get(r.hook) ?? []), r.views]);
    evidence.set("E8", {
      videoId: null,
      kind: "other",
      ai: `Inside ${formatLabel(main[0], t) ?? main[0]} (${main[1].length} read videos): ${[...groups.entries()].map(([h, v]) => `${hookTypeLabel(h, t) ?? h}: ${v.length} video(s), typical ${k(median(v))} views`).join("; ")}. A group with fewer than 4 videos is only a hint.`,
      shown: idea("evHooks", {
        format: formatLabel(main[0], t) ?? main[0],
        count: main[1].length,
        list: [...groups.entries()].map(([h, v]) => idea("evHookItem", { hook: hookTypeLabel(h, t) ?? h, n: v.length, views: k(median(v)) })).join("; "),
      }),
    });
  }
  const unread = own.filter((r) => !r.read && r.views >= 2 * typical).sort((a, b) => b.views - a.views).slice(0, 3);

  // The creator's most common hook type: a creative hook must differ from it.
  const hookCounts = new Map<string, number>();
  for (const r of read) if (r.hook) hookCounts.set(r.hook, (hookCounts.get(r.hook) ?? 0) + 1);
  const usualHook = [...hookCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const pack = [...evidence.entries()].map(([id, e]) => `${id}: ${e.ai}`).join("\n");
  const language = t.locale === "he" ? "Hebrew" : "English";
  const prompt = `You are "Blumea Idea", a feature of Blumea that helps short-video creators decide what to make next. You get EVIDENCE about ONE platform (${platform}). Other platforms, other creators and trends are NOT available: never mention them and never claim what is popular.

EVIDENCE (each line has an id; this is everything you may rely on):
${pack}

The creator's habit: a song as the sound plus one line of text is a complete video; never suggest adding speech or talking.

Return ONLY one JSON object:
{
 "ideas": [ { "idea": string, "evidence": ["E1", ...], "keep": string, "change": string, "how_to_know": string, "limit": string } ],
 "creative": { "ideas": [ { "hook": string, "type": string, "todo": string, "fits": string } ] }
}

Rules:
- "ideas": 2 or 3 ideas for a NEW VIDEO (what to film and what to write on it), each following from the evidence above. An idea is never a comparison or an analysis. Each lists the evidence ids it rests on (at least one video line, only ids that exist). Change ONE thing at a time. Never say why a video did better, only what it has that others lack. Everything is "worth trying". If a point rests on a small difference or fewer than 4 videos, say so in "limit" or leave the idea out. Do not move a hook, song or setting between different formats.
- "creative": a SEPARATE part with exactly 3 new ideas that are NOT drawn from the evidence (new things worth trying). Each has: "hook": the words that open the video (short, in the creator's own voice and style as shown in the hook words above); "type": its hook type (one of: ${HOOK_TYPE_IDS.join(", ")}), which must differ from the creator's most common hook type${usualHook ? ` (${usualHook})` : ""}; "todo": one or two concrete sentences on what to do in the video with this hook, in the creator's own world and main format (what to film or sing, where, with which sound), for example "sing an original song of yours in your room with this hook"; "fits": one short line on why it fits this creator.
- Do not invent numbers or facts about the creator that are not in the evidence. In the sentences never write an evidence id (E1, E5...): name the video by its title. Use the format and hook names exactly as they appear in the evidence. A creative hook must not state a fact or a number about the creator, the audience or other people as if it were true.
- Write everything in ${language} except the evidence ids and the type ids. Plain, short sentences. No statistics words.`;

  let raw: Record<string, unknown> | null = null;
  try {
    const interaction = await client().interactions.create({
      model: "gemini-3.8-flash",
      input: [{ type: "text", text: prompt }] as never,
      generation_config: { thinking_level: "low" },
    });
    raw = parseJson(interaction.output_text ?? "") as Record<string, unknown> | null;
  } catch (error) {
    console.error("Blumea Idea failed", error);
    return { error: "failed" };
  }
  if (!raw) return { error: "failed" };

  const text = (v: unknown, max = 400) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : "");
  const ideas = (Array.isArray(raw.ideas) ? raw.ideas : [])
    .map((item: Record<string, unknown>) => {
      const ids = (Array.isArray(item.evidence) ? item.evidence : []).map(String).filter((id) => evidence.has(id));
      return {
        idea: text(item.idea),
        ids,
        keep: text(item.keep),
        change: text(item.change),
        howToKnow: text(item.how_to_know),
        limit: text(item.limit),
      };
    })
    // An idea must rest on at least one video (or the followers line), never only on a hint or the level.
    .filter((item) => item.idea && item.ids.some((id) => evidence.get(id)?.kind !== "other"))
    .slice(0, 3)
    .map((item) => ({
      idea: item.idea,
      evidence: item.ids.map((id) => ({ id, videoId: evidence.get(id)?.videoId ?? null, text: evidence.get(id)?.shown ?? "" })),
      keep: item.keep,
      change: item.change,
      howToKnow: item.howToKnow,
      limit: item.limit,
    }));

  const c = (raw.creative ?? null) as { ideas?: unknown } | null;
  const creativeIdeas = (Array.isArray(c?.ideas) ? (c?.ideas as Record<string, unknown>[]) : [])
    .map((h) => ({ hook: text(h.hook, 200), type: text(h.type, 40), todo: text(h.todo, 400), fits: text(h.fits, 200) }))
    .filter((h) => h.hook && h.todo && HOOK_TYPE_IDS.includes(h.type) && h.type !== usualHook)
    .slice(0, 3)
    .map((h) => ({ ...h, typeLabel: hookTypeLabel(h.type, t) ?? h.type }));
  const creative = creativeIdeas.length > 0 ? { ideas: creativeIdeas } : null;

  return {
    platform,
    unread: unread.map((r) => ({ id: r.id, title: r.title, views: r.views })),
    ideas,
    creative,
  };
}
