# Insight Engine Spec (draft v0.1, 2026-09-26)

**Status: DRAFT for the owner's review. Nothing in this file is built yet.** Numbers marked *(proposal)* are starting points to tune on real data, not decisions.

Related: `doc/CLAUDE.md` §2 (screens), §3 (AI principles), §5 (what each platform provides), §12 (Trust Layer). AI findings this spec relies on: "AI validation findings" in §13 of `doc/CLAUDE.md`.

---

## 1. What this is for

The promise: not only *what* happened, but *why*, and *what to do next*. This spec fixes what Blumea is allowed to **say** to a creator, how sure it may sound, and when it must stay **silent**. It connects three things:

1. what the AI reads from a video (measured in the validation rounds),
2. the numbers the platforms give us,
3. the screens: Analysis (what we understood, KEEP / IMPROVE / TRY NEXT), Compare, Insights.

**The core rule: code decides what may be said; language only phrases it.** This does **not** mean a rule per content type or per niche — that would not scale. The rules are **generic templates** (§5–§7) that take parameters: which field, which threshold, which group of videos to compare against. A niche is one of those parameters, not a reason to write new code (§4, §7). New signals (§3.4) plug into the same tiers without new special cases either.

**Two separate toolkits feed those fields**, and mixing them up is the main way to get this wrong:

1. **Understanding (AI):** what a video is about, what it says, what happens and when — Gemini reading the video. Tiers in §3.2.
2. **Technical measurement (deterministic):** objective numbers off the file itself — cut timing, motion, loudness — computed with ordinary tools (ffmpeg), no AI, no hallucination risk, effectively $0. New in §3.4.

A craft question ("is the cut too slow", "is the audio too quiet") is almost always a toolkit-2 question, not a toolkit-1 one — asking the AI to *judge* it repeats the mistake we already found with instrument names and invented song titles.

- The AI reads a video **once** into structured fields (cached; ≈ $0.0045 per Short at thinking=low).
- Rules in code compare those fields with the platform numbers and decide which statements are allowed.
- Text comes from templates first. Later, a language model may *rephrase* a statement that was already decided, but never add a fact, and its output is checked against the statement's evidence (every number and quote in the text must exist in the evidence).

This keeps the product honest, cheap, and testable: a rule can be tested; a free-form AI opinion cannot.

## 2. Principles (from `doc/CLAUDE.md` §3, written as rules)

1. **Three kinds of statement, never mixed in one sentence:** fact (read from the video or the platform), inference (a reading of the facts), recommendation (what to try).
2. **Every statement points at evidence** the user can open ("Show me the data"): a field, a number, a timestamp.
3. **No causality.** Never "because", "caused", "will". Use "may", "suggests", "tends to", "in your videos".
4. **Silence beats a weak claim.** Fewer statements, each earned. "No clear reason" is a valid answer.
5. **Always say how many videos a claim rests on.**
6. **Never build advice on a field measured as unreliable** (see 3.2).
7. **Every recommendation answers three questions:** what we identified, what happened, what to do, and it points at a specific element of the video (never "strong hook").
8. **Agreement is not proof.** Repeated runs, or even two independent tools agreeing, raise confidence only up to that field's tier cap (§3.2) — never above it. Tools can share a blind spot: in testing, both Gemini and Whisper misheard the same rare name ("יעל") as the same common word ("יאללה"); on their own, both looked confident.
9. **Proposing an experiment is not the same as claiming it works.** A recommendation may point at any concrete, reliable fact (from the AI, §3.2, or from ffmpeg, §3.4) and propose testing a change — from video one, no history needed — as long as the wording claims no direction ("worth testing", never "try this because it helps"). Claiming a *direction* ("this helps you") is only earned once the creator's own history (§7) actually shows it. Being measurable (ffmpeg) and being known-good are two different things — a shaky opening shot can be a deliberate, effective hook for one creator and a rough edge for another; the engine doesn't get to decide which without evidence.

## 3. Inputs and how far to trust them

### 3.1 Numbers from the platforms (facts) *(availability per platform: see §9; API details are **[VERIFY]** in `doc/CLAUDE.md` §5)*

Views, likes, comments, shares, saves; average watch time; opening retention (Instagram: skip rate); per-second retention (YouTube, for the owner); share watched to the end (TikTok Business accounts). Missing numbers are shown as "not available on this platform", never estimated.

### 3.2 What the AI reads from a video: trust tiers

Based on 7 videos × 3 runs (YouTube, a TikTok file, an Instagram file). Re-check on the golden set before relying on the tiers.

| Tier | Fields | Trust label (§12) | May anchor advice? |
|---|---|---|---|
| **1. Read from the video** | on-screen text (overlay), subtitles yes/no, spoken hook, what happens in the first seconds (visual hook), sound kind (speech / music / both / silence), key moments with timestamps (about ±1–2 s at thinking=low) | **Fact** | **Yes** |
| **1b. Stable readings** | format and categories from fixed lists | **AI inference** | Yes, as context, not as proof |
| **2. AI reading, may slip** | exact wording of Hebrew quotes (a letter can drop in about 1 of 3 runs), text on a reply card, topic and subject wording, English sung lyrics | **AI inference** ("AI read") | No |
| **2b. ASR (Whisper) — evaluated, not adopted** | tested as a fix for tier-2 wording issues; it didn't hold up (2 of 4 hand-checked Hebrew clips wrong — word substitution once, a dropped repeated phrase once — against 4 of 4 correct for Gemini's own reading). Its one proven asset, word-level timing, has no current consumer: every threshold in this spec already tolerates Gemini's coarser (~1fps) timing. **Not built into the pipeline for now** — see `doc/CLAUDE.md` §10 for the full reasoning and the V2 feature that would justify revisiting it. | n/a — not in the pipeline | n/a |
| **3. Guesses** | song / sound name, instruments, language of sung lyrics, "trend" | **Unverified hypothesis** | **Never** (shown as "maybe", or hidden) |
| **P. From the platform** | TikTok sound (name + ID from the official oEmbed), Instagram `media_audio_type` (music or original sound) | **Fact** | Yes |

Rules that follow:

- Text that is part of the scene (a shop sign) has the role `scene` and is never treated as a hook.
- On-screen text is returned as a **list** with roles (label, card, caption, title, scene); a hook is the overlay text in the first ~3 seconds.
- Quotes are shown as the AI read them; where platform captions exist (YouTube captions, TikTok caption from oEmbed), prefer them.
- In **Lite** mode (cover + caption only) only: text on the cover, cover description, caption language, rough topic and categories. Lite must never claim moments, sound, speech, subtitles, or hook timing, and a YouTube thumbnail is **not** the first frame.

### 3.3 Numbers computed in code (free, deterministic)

| Feature | Definition |
|---|---|
| `duration` | from the platform |
| `text_in_first_3s` | any overlay text (not `scene`) at ≤ 3 s |
| `spoken_or_sung_in_first_3s` | spoken hook or sung line present |
| `first_move_time` | time of the first key moment after the hook |
| `payoff_time` | timestamp of the "reveal" / "peak" moment (the payoff) |
| `payoff_vs_avg_watch` | `payoff_time − avg_watch_time` |
| `watch_share` | `avg_watch_time ÷ duration` |
| `engagement_rate` | (likes + comments + shares + saves) ÷ views |
| `performance_vs_baseline` | metric ÷ the creator's median (see §4) |
| `format`, `categories`, `sound_kind`, `has_subtitles` | from the AI profile (tier 1 / 1b) |

### 3.4 Craft & technical signals — deterministic, no AI, no hallucination (new, 2026-09-27)

These answer the owner's own examples (slow cuts with dead air, muffled/quiet audio, a text hook that disappears too fast) and are measured with ffmpeg on the file itself — never asked of the AI. A number here cannot be invented; the risk is a badly chosen threshold, not a hallucinated answer, so these need calibration against real, hand-judged examples rather than the repeated-runs method in §3.2.

**Being deterministic is not the same as being known-good (principle 9, §2).** A cut timestamp or a motion score is a fact just like a tier-1 AI field — but whether "still" or "quiet" or "a settling shot" is actually bad for THIS creator is not something ffmpeg can tell us any more than Gemini can invent it. These signals feed §5.2's experiment library (framed as "worth testing", no claimed direction) and §7's patterns once earned — never a standalone "fix this" claim.

| Signal | How it's measured | Status |
|---|---|---|
| **Cut timing / "dead" pause after a cut** | ffmpeg scene-change detection finds cut timestamps; a per-frame motion score (YDIF, sampled ~5×/s) after each cut measures how long the picture stays visually still | **Validated 2026-09-27** on a real download: found a cut at 21.6s followed by 3.0s of no visible motion — exactly the kind of issue described. Thresholds (what counts as "still", how long counts as "dead") are first guesses, not yet tuned against videos rated by hand. |
| **Audio loudness** | ffmpeg's EBU R128 loudness analysis: integrated LUFS, true peak, loudness range | Built, gives an honest number. The "quiet" cutoff used is a guess **[VERIFY]** against real short-form norms — and platforms often auto-normalize playback loudness, which may make raw loudness the wrong question to ask. |
| **Audio clarity / "muffled"** | not built yet — would need a different measure (e.g. high-frequency energy, speech-to-noise ratio), not loudness | **Open.** The owner's word ("עמום") points at clarity, which loudness does not capture; a quiet mix and a muffled mix are different problems. |
| **Hook text holding long enough to read** | attempted via the same whole-frame motion score, from t=0 | **Not reliable yet**, found by testing: a whole-frame score is swamped by ordinary background motion (the person talking, small camera movement), so it can't tell "the text is still there" from "something in the shot moved". Needs the motion score computed inside just the text's on-screen region, not the whole frame — the next iteration to build, not yet started. |

Why this belongs in the deterministic toolkit and not §3.2's AI tiers: Gemini's own docs state it samples video at ~1 frame/second, so anything under a second — a half-second dead pause, exact on/off timing of an overlay — is structurally invisible to it regardless of prompting. ffmpeg has no such limit.

### 3.5 Format library (draft 2026-10-03, designed with the owner; **not built** — the production prompt still uses the old 14-item `format` list)

**Why:** a rule written for one way of making videos misfires on another (found 2026-10-03: an opening rule that flagged "no spoken words" is wrong for the owner's own best videos — a song as the sound plus one line of text). And the old list is too coarse: it labelled 10 of the owner's 13 YouTube videos `performance`. Fix: name the formats, and let each rule fire only where its feature is a norm.

**Three independent layers** (so combinations need no extra formats — a text-led hook can sit on a silent process video, a reaction, a skit…):

| Layer | Question | Field |
|---|---|---|
| **Format** | how is the body of the video built? | `format` (one value, fixed list below) |
| **Hook style** | how does it open? | `hook_style` (fixed list below) |
| **Sound role** | what do we hear? | `sound_kind` (exists) **+ a new `speaker_visible`** (is the speaker on screen?) — needed to tell on-camera speech from voiceover |

Format is **independent of niche** (`categories`): the same format appears in food, music, comedy.

**Formats** (first list from the owner; ids are proposals; norms = what is *normal* for that format, used to decide which rules apply):

| id | What it is | Speech | Text on screen |
|---|---|---|---|
| `skill_process` | no speech; the footage shows a skill or process being done — cooking, cleaning, building, restocking, crafting — **not only food**; the process itself holds attention. Natural/ASMR sound vs a song laid over it is the *sound-role* layer below, not a different format. *(Renamed from `silent_process` 2026-10-04 — see next row.)* | none | optional |
| `caption_clip` | **no skill is shown.** One on-screen sentence — an opinion, a feeling, a question, an insight ("unpopular opinion: …") — is the message, laid over incidental footage: a person doing an everyday action (preparing tea, eating a snack), or singing/miming a song in the background, with a song or sound playing. Miming that is itself the point is `lip_sync`. **Tie-break (owner decision, 2026-10-04): when a visible technique — a dance/trend, a transition — and a message caption are both present, the technique is the primary format and `caption_clip` is at most the secondary; `caption_clip` is primary only when the footage is incidental.** *(Owner, 2026-10-04: the old `silent_process` mixed this with real skill/ASMR videos; they are different formats. The owner's own "song as the sound plus one line of text" videos live here.)* | none | **common** |
| `talking_to_camera` | plain explainer / opinion / funny story to camera | on-camera | captions common |
| `self_dialogue` | talks to themself, often playing several characters with cuts (asks and answers) | on-camera | captions common |
| `podcast_clip` | host in conversation; the other person visible or not | dialogue | captions common |
| `voiceover_on_activity` | voiceover explaining what we see (a skilled task, "how my day went") | voiceover | common |
| `voiceover_over_background` | voiceover (often a story) over unrelated footage — gameplay, subway-surfers style, **or just "oddly satisfying" clips** (owner, 2026-10-04: it isn't always gameplay); includes a robotic text-to-speech voice reading a story | voiceover | very common |
| `reaction_stitch` | a clip (someone else's video, or found footage), then a stitch of the creator reacting — one stitch, or several, answering line by line. **The reaction may be silent** (a face only): the old `silent_reaction` format was merged in here on 2026-10-04, since speech is its own layer | none or on-camera | optional |
| `split_screen_reaction` | reaction in a split-screen layout *(may merge with `reaction_stitch` after testing — layout variant)* | on-camera | optional |
| `reply_to_comment` | answers a viewer's comment or question (comment shown on screen); includes the question-and-answer style | on-camera | common |
| `green_screen` | creator in front of an image — an article, a screenshot, a photo of their own handwritten notes | on-camera | optional |
| `pov_skit` | acted first-person scenario ("POV: …") | any | common |
| `trend_dance` | joins a dance/trend | none/sound-led | optional |
| `lip_sync` | mouths a sound | sound-led | optional |
| `challenge` | performs a challenge | any | optional |
| `unboxing_review` | opens / tests / reviews a product | on-camera or voiceover | optional |
| `music_performance` | sings or plays to camera (the owner's main format; today's `performance`) | sung | optional |
| `music_montage` | several short clips cut to a song's beat; no speech, no single point — a vibe | none | optional |
| `filter_game` | plays a game built on an effect/filter | any | optional |
| `transition_edit` | the creator pauses/covers the lens/cuts and the scene or outfit changes *(added 2026-10-03 from web research)* | none/sound-led | optional |
| `comparison_vs` | two things side by side, or "what I asked for vs what I got" *(added 2026-10-03)* | any | common |
| `ranking` | rating, scoring or ranking a series of things — items given scores, tiers or places one after another *(added by the owner 2026-10-04: "דירוגים")* | any | common |
| `interview_street` | questions put to people in the street or to a guest *(added 2026-10-03)* | dialogue | captions common |
| `ai_generated` | made with AI — avatar, AI voice, AI-made video. Flagged so the system knows it is not a real creator's footage *(added 2026-10-03)* | any | any |
| `carousel` | still images, not a video — **parked**: the pipeline reads video only, this needs its own path. Photo-dump / photo-slideshow-with-music is the same family and is parked with it | — | — |
| *(kept from the old list)* | `tutorial`, `list_tips`, `reveal_before_after`, `routine_vlog`, `meme_edit`, `storytelling`, `behind_the_scenes`, `other` | | |

**Sound-role values worth naming** (the third layer; first findings from the owner's labelling, 2026-10-04): `asmr_natural` — the natural sounds *are* the content (a knife, crunching, an unboxing) — versus `music_background` — a song laid over silent footage. Both appear on the same formats (`silent_process`, `unboxing_review`, `challenge`), which is exactly why this is a layer and not a format. **Labelling lessons:** (1) keyword search returns mislabelled candidates (a green-screen video among the talking-to-camera results, a behind-the-scenes video among the green-screen ones), so the test must include hard negatives — a video that *looks* like a podcast but is someone explaining podcasts is recorded as a negative for `podcast_clip`; (2) `silent_process` search found only cooking, so the AI must not learn "silent process = food".

**Hook styles** (first list): `text_led_message` (a caption carrying an insight, a feeling or a question — the owner's #1, usually silent), `cutaway_setup` (a raw/"hidden-camera"/staged clip — a slap, a ball kick, something unclear from afar — then a cut to the creator or a clean shot, which is the real hook; one style with two variants), `other`.

**Tie-breaks decided with the owner (2026-10-05, from the hand-labelled test set):** numbered/counted items over clips are `list_tips` (not a montage); tips explaining *how to do* something are `tutorial`, and a dance tutorial is a `tutorial` (not `trend_dance`); "expectation vs reality" is `comparison_vs` (not before/after); a comparison with a ranking inside it may be read as either — both accepted; a story told to the camera may be `storytelling` or `talking_to_camera` — both accepted (the owner couldn't pick: the story *is* the talking); lip-sync alternating with silent question-and-answer captions may be `lip_sync` or `caption_clip` — both accepted; a visible technique (dance, transition) beats a caption (see `caption_clip`). Where the owner accepts two labels, the product shows the AI's primary and the other as "Also fits".

**`meme_edit` (defined 2026-10-06, proposal confirmed by the owner's question):** we look for videos *made from* a meme — a known meme, a movie scene or a viral clip (found footage, not filmed by the creator for this video) edited with text, sound or cuts, where the edit is the point; re-creating a known meme template yourself counts, and so does a compilation of memes. We do **not** count a raw template file with no edit (what a search for "meme templates" returns), a meme clip inserted into another kind of video, or a filmed video that only uses a meme sound (that is a trend, a lip-sync or a caption video). Both examples collected so far (movie-scene edits with relatable text) are recognised 3 of 3 runs.

**Deliberately not a format:** original song vs. cover — a property of the video, and the AI can't tell reliably (it doesn't identify songs, §3.2). Revisit only with a real song match (§13#7).

**How rules use it (principle 4 applied to formats):** each rule/experiment names the formats where its feature is a norm and stays silent elsewhere — and silent when the format is `other` or unknown. E.g. "no text in the first 3 s" is not applied to a `silent_process` video that works on natural sound; "no captions on speech" needs speech in the format's norm. Baselines and patterns (§4, §7) gain a natural cohort: the creator's own videos **of the same format** (the same ≥ 8-video minimum as the niche cohort).

**Ranking formats:** within one creator, a format's rating is just §7's pattern with `format` as the feature (e.g. median "stayed to watch" per format, with counts). Cross-creator ranking stays "Coming Soon" (§4, L5).

**Learning over time, with a gate:** the AI may answer `other` with a one-line description; recurring descriptions are surfaced as *candidate* formats; **a format joins the library only when the owner approves it** (free-text labels drifted run to run in testing — fixed lists were stable, `doc/CLAUDE.md` §13#3). More videos per format sharpen its rating; they do not rewrite its definition.

**Before any of this ships:** the prompt change (new `format` + `hook_style` + `speaker_visible`) is validated like every other AI field (§12): 1–2 real example videos per format, hand-labelled by the owner, compared with the AI's answer over repeated runs. Several formats have no example among the owner's 13 analyzed videos, so examples must be collected first.

## 4. Baseline and "did better"

- **Baseline** = the creator's **median** over the last up to 50 videos **on the same platform**. Median, because views are heavy-tailed. **Minimum 10 videos** *(proposal)*; below that, no comparative statement is made, only what was read from the video.
- **Niche baseline (the personal, "this is your niche" angle):** compute the same median a second time, restricted to the creator's own videos that share a `categories`/`format`/`subject_specific` value (already read from the video, tier 1b). This is the same generic computation, just grouped differently — it needs no per-niche code. Needs its own minimum count (proposal: **≥ 8** videos in the niche group) before a niche-scoped statement is allowed; below that, fall back to the whole-channel baseline. Cross-creator niche benchmarks (§7 of `doc/CLAUDE.md`, opt-in pool) are the same mechanism later, once that data exists — still "Coming Soon".
- **Performance bands** for a metric, as a ratio to the baseline *(proposal)*:

| Ratio | Band |
|---|---|
| ≥ 2× | well above your usual |
| 1.25–2× | above |
| 0.8–1.25× | typical |
| 0.5–0.8× | below |
| < 0.5× | well below |

- Small channels are noisy. Under 1,000 views on a video, or under ~20 videos, say "small numbers, take this loosely".
- Comparisons are **within a platform** in V1. Views mean different things on different platforms.

## 5. Statement types (levels)

| Level | What | Needs |
|---|---|---|
| **L0 Identity** | "What Blumea understood" | tier 1 / 1b fields |
| **L1 Observation** | one content fact + one metric fact, no causal words | tier 1 field + a metric |
| **L2 Recommendation** | KEEP / IMPROVE / TRY NEXT for one video | an L1 observation with a timestamp or number |
| **L3 Comparison** | differences between two videos | see §6 |
| **L4 Pattern** | "in your videos, when X, usually Y" | see §7 |
| **L5 Market / trend** | other creators, trends | **not allowed in V1** (no data; shown as "coming soon") |

### 5.1 Templates and their trigger conditions *(numbers are proposals)*

**Two strengths of the same underlying signal, chosen automatically by what's earned:**
For any candidate feature (AI-read or ffmpeg-measured), check §7 first. If the creator's own history meets its bar, show the **personalized pattern** statement (claims a direction, e.g. "in your videos, X usually means Y"). If not — including for a creator's very first video — fall back to the **experiment** form below: name the concrete fact, and invite testing it, claiming no direction. This is how day-one recommendations exist without asserting an unproven "best practice": the statement never claims to already know the answer, only that this specific thing is worth finding out.

**L0 — identity** (always allowed if tier 1 fields exist)
> "Blumea understood: a *{format}* video about *{topic}*. It opens with *{hook text or first action}*. *{Sound kind}*."

**L1 / IMPROVE — the payoff comes after most viewers have gone** (Instagram, TikTok Business, YouTube)
- Trigger: `payoff_vs_avg_watch ≥ 2 s` **and** `watch_share < 0.8`.
- Text: "The payoff (*{moment}*) comes at *{payoff_time}* of a *{duration}* video. The average viewer watched *{avg_watch}*, so many viewers may leave before it."
- Worth testing (no claimed direction, unless §7 already has this pattern for this creator — then use that stronger form instead): "Worth testing: showing it about *{N}* seconds earlier. No way to know yet if that changes anything for you, but it's a concrete, testable change." `N = round(payoff_vs_avg_watch)`, capped at half of `payoff_time`.
- The number is computed, not written by the AI. Evidence: the moment, the timestamp, the average watch time.

**L1 / IMPROVE — the biggest drop** (YouTube owner only; needs the retention curve)
- Trigger: the largest fall between two points is ≥ 8 percentage points *(proposal)*.
- Text: "Most viewers leave around *{time}*. At that point: *{what happens there}*." Add "may contribute" only in the recommendation, never in the fact.
- Never for Instagram or TikTok: they give no per-second curve.

**L1 / IMPROVE — the opening** (Instagram skip rate; YouTube retention at 3 s)
- Trigger: skip rate ≥ baseline + 10 points, or 3-second retention ≥ 10 points below baseline *(proposal)*, **and** `text_in_first_3s` false. ~~or `spoken_or_sung_in_first_3s` false~~ — **Owner decision 2026-10-03: a missing spoken or sung line is never a trigger and never suggested.** Many of this creator's best videos are a song used as the sound plus one line of text on screen; talking to camera doesn't fit that format (and talking over it can block the creator's own song). `spoken_or_sung_in_first_3s` stays a computed feature (§3.3) but no opening rule or experiment may push the creator to speak.
- Text: "More viewers than usual left in the opening. The first seconds have no text on screen."
- Worth testing: "A short text on screen in the first second — you don't have data yet on whether that helps you, but it's specific enough to try."

**KEEP — the hook held**
- Trigger: a tier-1 hook exists **and** the opening metric is better than baseline by the same margin.
- Text: "Your hook, *“{quote as read}”*, comes with a strong opening: *{number}* vs your usual *{number}*. Keep opening with a clear promise."

**TRY NEXT — an experiment from a fixed library** (see 5.2). Used when no IMPROVE is allowed (for example TikTok without Business data), **or simply whenever §7 doesn't yet have enough of this creator's history to claim a direction** — which includes video one. Always phrased as an experiment ("worth testing"), never as a claim that it helps.

### 5.2 The experiment library

TRY NEXT is drawn from a **fixed library**, each entry with a trigger, so advice is never generic — and a trigger can come from **either toolkit** (an AI-read field, §3.2, or an ffmpeg-measured one, §3.4): being deterministic doesn't earn ffmpeg's signals a stronger claim, only a reliable trigger. Examples *(the owner, as a creator, should write and rank these; note the wording — a fact, then an invitation, never a promise)*:

| Trigger | Source | Experiment |
|---|---|---|
| no overlay text in the first 3 s | AI | "No text on screen in your first 3 seconds. Worth testing a short one." |
| the payoff is after the average watch time | AI | "The payoff comes after where viewers, on average, already stopped. Worth testing showing a glimpse of it earlier." |
| the text hook and the visual hook start at different times | AI | "Your on-screen text and the visual action don't start together. Worth testing starting both in the same frame." |
| the video is much longer than your best ones and its watch share is low | AI | "This one runs longer than your usual, and a smaller share of it gets watched. Worth testing a shorter cut of the same idea." |
| no subtitles and speech in the first 3 s | AI | "No captions during your opening speech. Worth testing adding them." |
| the shot is still visibly settling into the first ~1s of speech (§3.4) | ffmpeg | "The frame was still moving when you started talking. Some creators use that as a deliberate hook, others find it distracting — no data yet on which this is for you. Worth testing a version where you wait for it to settle." |
| a cut is followed by ≥0.4s with no visible motion (§3.4) | ffmpeg | "There's a brief still moment right after a cut, around *{time}*. Worth testing trimming it." |

**Owner-written experiments (2026-10-10, from his own creator experience).** Same wording rule as above: a fact about the video, then an invitation, never a promise ("it doesn't guarantee success" — his words). Status shows what each needs; none is built yet except where marked.

| # | Owner's idea | What the system would read | Status / needs |
|---|---|---|---|
| 1 | **Something people recognise or the time of year** — McDonald's, a krembo in winter, apple and honey at Rosh Hashana, cheese at Shavuot; also trends. Gives identification, people stay. | New AI field `relatable_hook` (ties to a season, holiday, everyday experience or a trend) + the publish date against a holiday calendar. | New field + golden examples; holiday calendar (Israel) needed. Compare within a format; `known_format_or_trend` already exists but is low-confidence. |
| 2 | **Evoke a feeling, not a plea** — "please help me" does not work; the viewer should feel something that makes them want to act. | Hard to read reliably (emotion). Only the plea itself is detectable (CTA wording, `call_to_action`). | Park. At most a fact: "your ask is phrased as a request for help". Not a claim about emotion. |
| 3 | **Make the audience part of it** — names of followers on screen (tea video), replying to comments, content made from comments. Those named feel known, those not named comment "you forgot me". | `call_to_action` type `comment_invite` (exists, one video so far); new flags `names_viewers` and "reply to a comment" (the `comment_reply` format exists); the owner's reply rate to comments from the YouTube comments API. | Partly built (CTA comparison). Reply-rate and names flag are next. |
| 4 | **Provocation from the first second** — a line like "why you must not drink water". | `hook_style` value `provocative_statement` (today's list only has `text_led_message`, `cutaway_setup`, `other`, `none`). | Needs a richer hook list + golden set. |
| 5 | **Show the best part first, then jump to the start** — the finished cake before the recipe; a controversial line from mid-conversation before the podcast starts. | `hook_style` value `preview_then_start` (the opening shows a moment that occurs later in the video). | Needs the hook list + golden set; can be cross-checked against `key_moments`. |
| 6 | **Visual hooks** — placing the camera, moving with the camera while filming. | `hook_style` value `visual_action`; camera movement at the start from ffmpeg (§3.4) or an AI flag. | Needs the hook list; ffmpeg needs a file (not available for YouTube-URL analysis). |
| 7 | **Picture and sound quality** — poor light, poor image, weaker sound do worse. | Coarse AI rating (lighting / sound clear or not) and ffmpeg loudness. | Only a fact when extreme; the owner's own videos are shot the same way, so there is nothing to compare inside his data. Park until cross-creator data. |
| 8 | **Caption placement** — a caption not in the right place, at the side, is less accessible. | New AI field `text_position` (where on the frame the caption sits). | Needs the platforms' published safe zones verified first; do not claim a safe zone from memory. |

**Improving an existing format (owner, 2026-10-10).** When a creator already makes a given format, Blumea should say how that format can be done better, not only which format to use. Three sources, in the order they become available:
1. **Format playbook** — for each format in the library, a short list of experiments keyed to the format id, written by the owner (e.g. recipe: show the finished dish first, then the steps; caption clip: a caption in the first 3 s, already built). A playbook entry fires only when the format matches **and** the feature is absent from the video, and is always worded as an experiment.
2. **The creator's own history inside the format** — with ≥ 8 videos of one format (the same cohort rule as the baseline, §4), compare hook type, length, ask type and posting time among those videos ("in your caption-only videos, the ones that open with a question held viewers longer"). Pattern thresholds as §7; a mixed style is never a problem.
3. **Other creators in the same format** — what creators who do well in it tend to do. Needs cross-creator data (L5, not allowed in V1); until then it is stated as "coming later", like "Formats in your niche".
Playbook entries are the owner's to write; Blumea only turns each into a computable trigger. None written yet.

Items 4, 5, 6 (and part of 1 and 3) are one thing: a **hook-style list that is much richer than today's**. Building it (labelled examples, golden set, then the within-format comparison "which hook works best in your caption-only videos") is the natural next step.

**Neither list claims to know the answer** — that's the point. Once the creator has tried a given experiment (or already varies on it naturally) across enough videos, §7's pattern check takes over automatically and the *same* underlying signal gets the stronger, personalized form instead ("in your videos, this usually means...").

Later, when the creator posts the next video, the engine can check the experiment ("did it change the opening?"). That closes the loop but is out of scope for V1.

## 6. Comparing two videos ("why did one do better?")

A comparison **explains only when it has earned it**. Otherwise it says so.

### 6.1 Which metric

Check **all** of views, likes, comments, saves, shares (in this order — the order a creator naturally scans them in). Any metric with a real gap (§6.2) is eligible; when more than one qualifies, lead with the first that appears in that order, and mention the others as supporting evidence, not as separate comparisons.

**Views can be misleading when reach wasn't organic** (most commonly: paid promotion) — and Blumea has no way to confirm that directly; ad/boost data lives in each platform's separate ads system, outside the content APIs already scoped (§5, §9). Detect the *statistical signature* instead of the cause: apply §4's performance bands to `engagement_rate` the same way they're applied to views. If a video's **views** sit at "well above" its creator's baseline while its **engagement_rate** sits at "well below" baseline, don't use views as this video's comparison metric — state the mismatch as a plain fact ("this video's views are well above your usual, but its engagement rate is well below — the reach here may not be comparable to your usual videos"), name no cause, and fall back to the next metric in the order above that isn't similarly flagged.

### 6.2 Show an explanation only if all hold *(proposal)*

1. Same platform.
2. The gap is real: one video is ≥ 1.5× the other on the chosen metric (§6.1), and at least one of them is outside the "typical" band.
3. Both videos have a full analysis (not Lite).
4. The differences are **few and clear**: at most 3 features differ — from **either** toolkit: tier-1 AI fields (hook text/timing, text in the first 3 s, payoff timing vs watch time, length, format, sound kind, subtitles) or ffmpeg craft signals (§3.4: editing pace, a still pause after a cut, loudness, a shot still settling into the opening). Deterministic doesn't mean more or less eligible than AI-read — same cap, same footing (principle 9, §2).

### 6.3 Output structure (always in this order, always separate)

- **What we see (fact):** the numbers (on the chosen metric, §6.1), and what is **the same** in both videos (platform, similar length, same format), so the reader can tell what was controlled.
- **What differs (fact):** at most 3 differences, each with its evidence, from either toolkit.
- **What it may mean (inference):** one sentence, cautious: "*These differences may contribute. Two videos can't prove a cause.*"
- **What to try (recommendation):** one experiment from the library (§5.2), chosen because its trigger matches one of the differences just listed — never an unrelated pick — worded the same "worth testing" way as everywhere else (principle 9).

**If a condition fails:** show the numbers and the differences, and say: "No clear reason stands out. The videos differ in *{n}* ways, so Blumea can't point at one." This is the honest default, and it should be common at first.

**Never** claim a reason from a difference that involves a tier 2 or 3 field.

## 7. Patterns across many videos ("in your videos, when X, usually Y")

The strongest kind of explanation comes from **the creator's own history**, not from one comparison and not from running the AI more times.

**Run twice, same rule:** once over the creator's whole history, and once over just their niche cohort (§4). The niche run is what produces "in your {niche} content specifically, ..." — it is the same generic pattern rule, only the input group changes. This is how the personal/niche feel is reached without a rulebook that grows with every content type.

Allowed when *(proposal)*:

- the feature — from **either toolkit**, an AI tier-1/1b field or an ffmpeg craft signal (§3.4), same footing (principle 9) — is present in **≥ 4** videos and absent in **≥ 4**, and there are **≥ 12** analyzed videos in total. For a field with more than two possible values (`format`, `sound_kind`, `categories`...), "present" means *equals one specific value*, "absent" means *any other value* — the split is always binary, even when the field isn't.
- the median of the "with" group is ≥ 1.3× (or ≤ 0.77×) that of the "without" group, on a metric chosen **the same way as §6.1**: check views/likes/comments/saves/shares in that order, and exclude any video from a metric where its own "well above views, well below engagement_rate" flag (§6.1) would make that metric misleading for it — the same anomaly check, not a separate one.
- the pattern is **not just length** (if the feature almost always goes with a longer or shorter video, don't claim it);
- the statement gives the counts.

**A creator's consistent style is never a problem to fix (owner, 2026-10-07).** A numeric feature such as length is split at the creator's **own median** ("shorter or longer than your usual"), not at a fixed number, so a creator whose videos are all long, or all short, still gets a fair comparison and is never told to make videos they don't make. The same holds for formats: if all videos share one format, the product says so ("your style is consistent") and compares formats only when more than one is in use. When nothing qualifies, the honest output is plain facts about the usual video (typical length, typical share watched, best and worst at holding viewers) — never "you need N videos of type X".

> "In 7 of your 9 videos that open with text on screen, views were above your usual. Among the 8 without, 2 were. This is a pattern in *your* videos; it doesn't prove the text is the reason."

AI-based patterns need analyzed videos. Metric-only patterns (length, posting day) can be shown from the first scan, with counts.

## 8. When the engine must stay silent

**These rules apply to statements that claim a direction** (IMPROVE, KEEP, an L4 pattern) — **not** to a "worth testing" experiment proposal (§5.1–5.2, principle 9), which is always allowed, from video one, as long as it points at a reliable fact (tier 1/1b or ffmpeg, §3.4). Silence protects claims of benefit; it never blocks an honestly-framed open experiment.

- fewer than 10 videos for a baseline: no comparative statement;
- the needed metric is missing on this platform: no IMPROVE that depends on it;
- the analysis is Lite: no moments, no sound, no speech, no hook timing;
- the gap between two videos is small, or many features differ;
- the only evidence is a tier 2 or 3 field;
- two rules give opposite advice for the same video: show neither, or show both as separate observations without a recommendation;
- the number of videos behind a pattern is below the minimum.

**Silence is a success, not a failure.** We track how often it happens.

## 9. What each platform allows *(**[VERIFY]** each API before building)*

| | Metrics we can use | Craft signals (ffmpeg, §3.4) | Statements possible |
|---|---|---|---|
| **YouTube (connected owner)** | views, likes, comments, average watch time, per-second retention | **Never** — the URL-model approach (§5) means our server never holds the video file at all, by design | everything metric-wise, including "biggest drop" and moment-aligned advice (the strongest evidence) — but no craft-based experiments, ever, on the platform with the richest retention data |
| **Instagram (Business/Creator)** | views, reach, saves, shares, average watch time, skip rate; `media_audio_type` | **Yes, for original-sound (Full mode)** — the server already holds the file temporarily for Gemini, so ffmpeg runs in that same window. **No** for licensed-music videos unless the creator chose Deep upload | payoff vs average watch time, the opening, KEEP; **no** per-second claims |
| **TikTok** | Display API: views, likes, comments, shares. Business accounts add watch time and share watched to the end. Sound from the oEmbed | **Only if the creator chose Deep upload** — otherwise no file exists at all | Personal accounts: L0, L1 with counts, comparisons on engagement rate, TRY NEXT only (**no IMPROVE**) |

## 10. Wording rules

- Allowed: *may*, *suggests*, *tends to*, *in your videos*, *worth testing*.
- Forbidden: *because*, *caused*, *will*, *guarantee*, *the algorithm likes*, *going viral*.
- Forbidden in a TRY NEXT / experiment statement specifically: *helps*, *improves*, *works better* — these claim a direction, which principle 9 (§2) reserves for a statement already backed by this creator's own §7 pattern. An experiment says "worth testing", never that it helps.
- No claims about how viewers felt, or about the creator's audience.
- No description of any person's age, gender, ethnicity or appearance.
- Quotes are shown exactly as read and marked "AI read" when they are tier 2.
- A song or sound name from the AI is shown, if at all, as "maybe", never as a fact. A sound name from the platform is a fact.
- Every statement carries its trust label (`doc/CLAUDE.md` §12, the Trust Layer): quiet, never louder than the insight.

## 11. Cost and runtime

- Reading a video: ≈ **$0.0045** per Short, about 6 s (thinking=low, measured, lite mode — the single production call), **once per video**, cached. The full/validation mode used for testing (§12) pulls extra fields and costs more per call (measured $0.0055–$0.008); that mode is not what runs in production.
- **First Look** (3 videos in parallel): ≈ $0.014, about 6 s.
- ffmpeg/craft signals (3.4): **$0** in API cost — it runs locally, not against a paid API — but it consumes server compute and runtime, unlike the rule engine below which is instant.
- Rules and templates: **$0**. Comparisons are computed from stored profiles, so a comparison costs nothing extra.
- Optional rephrasing by a language model: a small text-only call. *Not measured*; expected to be a few thousandths of a dollar. **Start with templates and add it only if the copy needs it.**
- ASR (Whisper) — evaluated, not adopted (`doc/CLAUDE.md` §10): ~$0.006/minute if revisited later (e.g. $0.0043 for a 43 s clip, measured).
- Cost is not the profit lever here. The levers are not analyzing needlessly, caching, and limiting free accounts (`doc/CLAUDE.md` §6).

## 12. Validating the engine

1. **Rule tests:** fixtures from real (and the mock) videos; each rule is tested with cases that should and should not fire.
2. **Read the statements by hand** for ~20 of the owner's own videos before any user sees them: is each one true, useful and cautious?
3. **Track:** how often the engine stays silent; how often hand-checked statements are right; user thumbs up/down per statement.
4. **The AI golden set** (~30–50 hand-labeled videos) re-measures the tiers in 3.2 whenever the prompt or the model changes. *(In progress: a handful of hand-verified videos exist as of this writing; not yet at the 30–50 target.)*
5. **Craft/ffmpeg signals also need hand-verification** — deterministic computation doesn't guarantee it measures the right thing (see the unresolved hold-duration problem, §3.4). Each ffmpeg-derived signal should be checked against real videos before it's trusted, the same way AI fields are.

## 13. Open decisions for the owner

1. ~~**Templates first, or a language model to phrase?**~~ **Decided (2026-09-27): templates first** — free, predictable, testable. Revisit adding a rephrasing model only once the template copy is judged insufficient.
2. ~~**The thresholds**~~ **Decided (2026-09-27): start with the stated values** (1.5× gap, ≥ 10 videos, ≥ 4 per group, ±10 points, 2 s payoff gap) and tune them against the owner's own videos as real data comes in.
3. **Show "no clear reason"** in comparisons, or hide the comparison? Recommendation: show it.
4. **Comparisons across platforms**: not in V1?
5. **The experiment library** (5.2): the owner's knowledge as a creator is the best source. Which experiments are worth suggesting?
6. ~~**Data model**~~ **Approved (2026-09-27): move from spec to building it.** Stored per-video profiles (fields, tier, source, prompt version, model), metric snapshots, baselines, and generated statements with their evidence. The AI golden set is still small (a handful of videos, not yet the 30–50 target); the tiers already carry enough built-in caution (§3.2, §12) that building does not need to wait for that target.
   - **Built (2026-09-28):** `connected_accounts`, `account_snapshots`, `videos`, `video_metric_snapshots`, `video_ai_profiles`, `video_craft_signals`, `baselines`, `statements` — all with owner-only RLS. §3.3's computed features (`payoff_vs_avg_watch`, `watch_share`, etc.) are deliberately **not** a table — they're cheap derivations of stored data, so a stored copy risks going stale. They'll ship as a SQL view once the real Gemini pipeline fixes the exact `fields` JSON shape (no point guessing key names into a view now). `connected_accounts` holds identity only, no auth tokens — token storage is still a separate, unapproved decision (§14 of `doc/CLAUDE.md`).
   - **First real analysis run (2026-09-30):** the pipeline works end-to-end against a real YouTube video (`src/lib/gemini-analysis.ts` + `src/lib/youtube-data.ts` + `POST /api/analyze/youtube`, wired into `/analysis/[id]` for real, non-mock video UUIDs). Hand-checked by the owner: on-screen text, visual hook and format were accurate; `sound_candidate` stayed empty rather than guessing, correctly, on a cover of a well-known Israeli song neither Gemini nor a plain topic sentence could name.
7. **Audio fingerprinting (Shazam/ACRCloud-style) as a possible third tool** — raised 2026-09-30 by the owner after watching Gemini correctly describe but not identify a song cover. This would be a real, verified song match (not a language-model guess), which could upgrade `sound_candidate` from tier 3 to something closer to fact. Not evaluated yet — same open questions as Whisper's evaluation (§10 of `doc/CLAUDE.md`): a third paid vendor, added latency, a third point of failure. **Same platform ceiling as ffmpeg (§3.4, §9): needs the actual audio file, so it could never run for YouTube (URL-model, no file ever held) — only Instagram original-sound or Deep-uploaded content.** Worth a real evaluation before adopting, not before.
8. **Competitor "what's working in your niche" (breakout ranking) — future feature, raised 2026-10-03, not scheduled.** Idea: for a user-chosen set of competitor accounts (≤ 20–50, `doc/CLAUDE.md` §7), rank their recent posts by `breakout` = post likes ÷ that account's own median, so real hits are separated from merely big accounts. Already on the roadmap as "user-chosen competitor set from public data" (V1.5→V2); this entry only records what is and isn't legitimately possible (checked against Meta's docs 2026-10-03):
   - **Never via scraping** — `doc/CLAUDE.md` §5/§8, and the privacy policy/terms promise it. A third-party scraping service (Apify-style) is the same violation, just outsourced.
   - **YouTube — possible first, no new approval:** the official Data API returns public stats for any channel's videos, and our connection already works. Breakout is computable today. Explaining *why* a competitor's video worked (Gemini by URL, no file held) touches `doc/CLAUDE.md` §8's "other users' content" rule even without a download — **get a lawyer's view before building that part**; metrics-only ranking does not have this question.
   - **Instagram — blocked on approvals:** Business Discovery returns `like_count`, `comments_count`, `view_count` (Reels), `followers_count`, `media_count`, `permalink`, `timestamp` of *other* Business/Creator accounts (no reach, saves or shares; `caption` unconfirmed — test with a real call). Needs the **Facebook Login** flavor (also settles open question 5 in `doc/CLAUDE.md` §13 in that direction if this is wanted), Advanced Access, Business Verification and App Review — i.e. a business entity first. Metrics + permalink only; never the video file.
   - **TikTok — no official route:** Display API is the user's own videos only, oEmbed has no counts, the Research API is academics only.
   - Whatever ships here follows principles 2, 4 and 5 (§2): show the competitor count and the sample size behind every statement, stay silent on thin data, never state a cause.
