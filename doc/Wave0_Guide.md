# Beta wave 0: the owner and 2–3 trusted people

Goal: find breakage with no audience. Nothing here is about growth. Read it once before inviting anyone.

## Who

- You, plus 2 people you trust to tell the truth (3 at most).
- Cover three different situations: one with YouTube and TikTok, one with **TikTok only** (the uniformity check: they must not feel worse off), one who uses the **phone only**.
- Keep one of them on the **Free** plan on purpose, to see the locked previews and the monthly limits as a stranger does. The others get **Pro** (the beta rule: every beta creator gets Pro by hand).

## Before the first invitation (you)

- Supabase backups: on (done 2026-10-19). Cron secret: set (done).
- Gemini credit: check the balance and top it up by hand. Expected cost of wave 0: well under ₪5 (3 people, a handful of analyses each, a few Ideas). The daily cap of 150 AI runs stays on.
- `hello@blumea.io` can receive and send (done). Send yourself an invitation first and check it does not land in spam.

## The path each person takes

1. They open blumea.io and press "Request access" (email, platform, handle, niche).
2. You open **/admin**, find the request under "Waiting for a decision" and press **Approve**.
3. Press the **Hebrew** (or English) button next to their name, "Copy the invitation". Paste it into a new email from `hello@blumea.io`. It already holds the sign-up link, the WhatsApp group link and the signature. Tell them to look in spam for the confirmation email.
4. They sign up at the link **with the same email** they used to ask for access. A different email lands on "You are on the list".
5. Onboarding, connecting YouTube and/or TikTok, then the Dashboard.
6. In **/admin**, under "Accounts and plans", press **Make Pro** for everyone except the Free tester.

## What to ask them to try (about 20 minutes)

1. Connect the platform(s). Did every step make sense? Where did they hesitate?
2. On the Dashboard: do the numbers look right to them? Is anything missing or confusing?
3. Press "Analyze videos" and analyze 2–3 videos. YouTube: automatic. TikTok: upload the video and the three screenshots (from the phone if they can).
4. Open Insights. Press the thumbs on each card: "Was this right?" Which card felt wrong?
5. Compare two of their videos. Then try the other comparison types (Free tester: they should see the Pro lock at once).
6. "Blumea Ideas" (Pro): ask for an idea, press "I'll try this idea".
7. Open the "Analyses" page: can they find the video they just analyzed?
8. Press **Feedback** once and write one honest sentence.
9. Hebrew and English: switch the language once. Anything unreadable or in the wrong language?

How to report: in the WhatsApp group, with a screenshot, even for small things. Nothing is too small in this wave.

## How you read /admin

- **AI runs today / daily cap:** should stay far below 150.
- **Accounts and plans:** per person, the plan, videos, analyzed count, platforms, "needs reconnecting", last seen. "Last seen" tells you who came back.
- **Problems in the last 7 days:** `client_error` (something broke in their browser), `analysis_failed`, `idea_failed`, `daily_cap_hit`. A few `client_error` lines from one person need a look; the same one from everyone is a bug.
- **Feedback:** the thumbs and the notes, newest first.

You can also ask me, in this chat, to "check wave 0": I read the same tables, plus the rows behind them, and tell you what stands out.

## When to stop (from the beta plan)

Pause at once, and do not invite anyone else, for:
- **Any data exposure:** one person sees anything of another person. Tell me immediately.
- **Runaway cost:** `daily_cap_hit` or an unexpected jump in AI runs.
- **A failure rate above about 1 in 10 analyses.**
- **The same "I did not understand what to do" at the same step from two people.**

## After the wave

1. A 10-minute debrief with each person: what surprised them, what they would remove, whether they would use it again next week.
2. A fix list from the WhatsApp messages, /admin and the debrief. I fix; you check.
3. Only when wave 0 is clean: wave 1 (5–8 creators you know personally, YouTube first, watched on a call).
