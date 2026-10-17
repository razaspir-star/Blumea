# Blumea — Work plan to beta, and the beta itself

Written 2026-10-13. Working rule: we go stage by stage. Each stage ends with a short **stage summary** (what was done, what was checked, what was NOT checked, open items) and an explicit owner sign-off before the next stage starts. Stage summaries are appended to `doc/CLAUDE.md`.

## Decisions (owner, 2026-10-13)
1. Compare in the beta = video vs video on the creator's own analysed videos, Pro/owner only, locked preview for free.
2. The beta is in Hebrew **and** English (both languages ship).
3. Access = guest list by email: a "Request access" form on the homepage, the owner approves emails, only approved emails can use the app. (Invite codes may be added later for groups.)

## 0. Honest readiness check (today)

| Area | State | Beta blocker? |
|---|---|---|
| YouTube connect, First Scan, First Look, analysis, cross-video insights, next experiments | Built and checked on real data (owner's channel) | No |
| TikTok upload (QR handoff, live progress, screenshots for viewer numbers) | Built; two real videos analysed in production; screenshot reading verified on 6 real screenshots | Needs a full production test; **app approved for production (portal: this version live since 2026-10-16)** |
| Monthly cap, free scan 20 videos, plan column | Built | No |
| Deletion of data, privacy, terms, homepage, favicon | Built; **privacy and terms are unreviewed drafts**; account deletion not tested with a second account | Yes (test); counsel can run in parallel |
| Google OAuth consent screen | **Still "Testing"**: refresh tokens expire after 7 days, only listed test users can connect | Yes |
| Compare | Prototype page with made-up data, hidden in production; sidebar shows "Pro, coming soon" | Owner wants it done before beta |
| Hebrew | UI is English only (3 Hebrew strings in the whole UI). Fonts: Manrope; Heebo and RTL only planned | Owner wants it before beta |
| Multi-user safety (second account, isolation) | Fixed several bugs earlier, **never re-tested end to end with two real accounts** | Yes |
| Monitoring, feedback channel, invite mechanism, cost alert | None yet | Yes (small) |
| Payments / Pro upgrade | Not built; no business entity yet | **No** (beta is free; Pro is switched on by hand) |

So: not ready today, but the gap is known and finite. Order matters: the stage with the longest waiting time at someone else (Google) starts first.

## Stage 1 — Google: production + verification pack (starts now, runs in the background)

Why first: Google verification takes weeks and runs without us. In "In production" status an *unverified* app can still be used by up to **100 users** (they see an "unverified app" warning screen) and the 7-day token expiry disappears. That is enough for the whole beta.

Tasks
- Owner: Search Console — verify `blumea.io` (DNS TXT record in Cloudflare). I give the exact record steps.
- Owner: Google Cloud Console — switch consent screen to **In production**; reconnect YouTube; check it holds past 7 days.
- Me: verification pack — scope-by-scope justification text (youtube.readonly, yt-analytics.readonly, what we read, why, what we never do), data-handling answers matching the privacy policy, a demo-video script (login → consent → what the app shows → deletion), checklist of Google's branding and policy-page requirements.
- Owner: record the demo video from the script (English UI is fine for Google).
- Owner: send the prepared counsel brief for quotes (privacy and terms are drafts).
- Owner: submit verification once Stage 4 (Compare) UI is stable, so the video shows the final product.

Exit: consent screen in production, domain verified, pack ready, counsel brief sent. Verification itself may still be pending; that does not block the beta.

## Stage 2 — TikTok: review and a full production check

**Update 2026-10-17: TikTok approved the app for production (the developer portal shows "this version of Blumea has been live since Oct 16, 2026 7:15 AM"). The "until approved" limits below no longer apply; what is left of this stage is the full production check.**

Tasks
- Owner: report the review outcome in the TikTok developer portal. If rejected again: I fix what they ask (they previously asked for icon match, a full website, privacy/terms links, a test account) and we resubmit.
- Until approved TikTok stays limited to accounts added to the app; beta TikTok users must be added by hand, or beta runs YouTube-first.
- Production test, owner on the phone, me on the checks: connect TikTok → First Scan → pick a video → QR → phone upload with a real gallery video + 3 screenshots together → live progress on the computer → result with viewer numbers → disconnect (videos deleted) → reconnect. Include a HEIC photo and a file near 50 MB.
- Me: check the temporary bucket is empty afterwards, check cap counting, check error messages are human.

Exit: one clean run end to end on production, bucket empty, review status known.

## Stage 3 — Hebrew, really (UI + the insights)

Goal: a Hebrew-speaking creator uses Blumea fully in Hebrew; English stays available.

Scope (decide at the start of the stage, proposal below)
- Infrastructure: `he` / `en` dictionaries, language chosen from the browser and switchable in Settings, saved on the profile; `<html lang dir>` switches; Heebo font; layouts checked in RTL (sidebar, cards, charts, progress bars, the guide-video column).
- All UI text moved out of components into the dictionaries (inventory first; I estimate every page and about 30 components).
- The insight engine's wording: cards, next-experiment texts, evidence lines, limit messages are code-generated English. They get Hebrew versions with the same rules (code decides what may be said, wording stays careful: "seems", never promises, always state how many videos).
- AI output language: the free-text fields the model writes (reasons, summaries) follow the creator's language; the structured fields stay English codes.
- Legal pages and homepage in Hebrew (English kept; counsel brief covers both).
- Guide video: English captions stay for now; Hebrew captions version later (the TikTok app language in the owner's recording is English).

Size: the largest stage. Proposed split to keep sign-off honest: 3a infrastructure + onboarding + dashboard + analysis page, 3b everything else + insight wording + legal. Checkpoint after 3a.

Exit: every user-visible screen in Hebrew; no English leaks except platform names and numbers; RTL screenshots reviewed by the owner.

## Stage 4 — Compare: finish design and make it real

Open decision (owner): what "Compare" means in the beta. Proposal: **video vs video, your own analysed videos**, on real data, for Pro and owner; free creators see the screen with a locked preview ("Part of Blumea Pro") so they understand what they would get. Creator-vs-creator and market compare stay "coming soon" (needs community data we do not have).

Tasks
- Me: replace the dev-only prototype (made-up data) with a real page on the analysed videos; honest comparison only — only say what code can support (format, hook, length, watch time where the platform gives it, retention, traffic split), always say how many videos each side stands on, never claim a cause.
- Design pass together: owner reviews in the browser, we iterate until the visual language matches the Analysis page.
- Pro gating through the existing `profiles.plan`, locked preview for free.
- New strings go straight into the Hebrew dictionaries (Stage 3 must be done first).

Exit: Compare works on real data for the owner, locked for a free test account, no mock data left in production code paths.

## Stage 5 — Safety net before real people

- Second real account: sign up, connect, scan, analyse, check it never sees account 1's data; delete account 2 and verify everything is gone (database rows, vault tokens, bucket).
- Error visibility: Vercel logs checked, an error notification to the owner for failed analyses and failed syncs, a simple "something went wrong" page that is not a stack trace.
- Cost guards: Gemini credit is manual (no auto-reload) — a low-balance alert plan, per-user cap already in place; expected beta cost stated before the wave opens.
- Access control: invite mechanism (see below).
- Feedback tools: "Was this right?" on each insight card, a feedback button, a WhatsApp group for the beta.
- Beta terms: a short beta notice (free, may change, data handling, how to delete) shown at signup.
- Backups: confirm Supabase backup status for the plan we are on.
- Basic event log (connected, First Look seen, analysis run, screenshots added, returned) in a table so the success numbers below can be read without guessing.

Exit: checklist all green, one full dry run with the owner acting as a stranger on a fresh account.

## Stage 6 — The beta

### Principles
- Small and hands-on first; widen only when the previous wave is clean.
- The beta is free; every beta user gets Pro features (including Compare) switched on by hand, in exchange for feedback. No payment code needed.
- Goal of the beta is learning, not growth: do the insights feel true, do they come back, would they pay.

### Who and why
Target = the wedge from the strategy: **Hebrew-speaking short-form creators** (none of the researched competitors serve them in Hebrew), 1K–50K followers, posting regularly on YouTube Shorts and/or TikTok, with at least ~15 videos (otherwise there is little to analyse).

| Wave | Who | How many | Why |
|---|---|---|---|
| 0 | Owner + 1–2 trusted people on fresh accounts | 2–3 | Find breakage with no audience; Stage 5 dry run |
| 1 | Creators the owner knows personally, YouTube first | 5–8 | Watch them use it on a call; fix onboarding friction; they will tell the truth |
| 2 | Friendly Israeli creators reached through the owner's own channels, creator groups, DMs; mix of niches (music and singing like the owner, plus 2–3 different niches so we do not tune to one type) | 15–25 | Does the reading ring true on content that is not the owner's; TikTok upload flow with strangers |
| 3 | Waitlist from the homepage ("Request access" form) | up to ~100 (Google's unverified cap) | Retention and the willingness-to-pay conversation |

Not in the beta: agencies and big creators (we lack team features), creators with very few videos, non-Hebrew speakers until a translation exists, anyone who needs Instagram (not built, Meta not submitted).

### How people get in
- Invite-only. App-level gate: a `beta_approved` flag on the profile plus invite codes created by the owner; people without one land on a "You are on the list" page. (Google test users and TikTok sandbox users are manual lists; the app-level gate keeps us in control of who actually uses it.)
- Homepage gets a "Request access" form (email, platform, handle, niche) feeding a table the owner reads and approves from.
- Each approved person gets a short personal message with: what Blumea is, what to expect (a few minutes to connect, it reads the last 20 videos), that it is a beta, and the feedback WhatsApp group.
- TikTok users: added to the TikTok app's allowed list by hand until review approves production.

### What we measure (per wave, from the event log)
- Activation: connected a platform and saw First Look.
- "Feels true" rate: thumbs up on insight cards (target: clearly more than half; a card that gets mostly "no" is removed or reworded, in line with "silence beats a weak claim").
- Return within 7 days; analyses run per person; share who add TikTok screenshots and succeed.
- Failures: failed scans, failed analyses, support questions per person.
- Interviews: a 15-minute call with at least 5 people at the end of wave 2.

### Go / pause rules
- Open the next wave only if the current one has no data-isolation bug, no failure rate above about 1 in 10 analyses, and no repeated "I did not understand what to do" at the same step.
- Pause at once for any data exposure or runaway cost; fix before anyone new joins.
- Exit from beta toward launch needs: verification passed or accepted limits, counsel review of privacy and terms, a pricing decision, business entity for payments and Meta.

### Cost
Per free creator about ₪0.06–0.09 for First Look plus up to about ₪0.16–0.24 a month at the full cap of 8 analyses. 100 creators is on the order of ₪25 a month at most. Gemini credit is manual, so the owner tops it up before each wave.

## Order and rough size

| # | Stage | Size | Waiting on others |
|---|---|---|---|
| 1 | Google production + pack | S + waiting weeks | Google |
| 2 | TikTok review + production check | S–M | TikTok |
| 3 | Hebrew (3a, 3b) | L | — |
| 4 | Compare | M | — |
| 5 | Safety net | M | — |
| 6 | Beta waves 0–3 | rolling | owner's outreach |

Stages 1 and 2 are mostly owner actions and start in parallel with the first work on Stage 3.
