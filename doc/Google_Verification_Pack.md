# Google OAuth — production switch and verification pack (Stage 1)

Prepared 2026-10-13. Scopes the app really requests (`src/app/api/connections/youtube/authorize/route.ts`): `youtube.readonly` and `yt-analytics.readonly`. Both are *sensitive* (not *restricted*) scopes as far as we know; the Console shows the category next to each scope, check it there. Sensitive scopes need verification (a review of the consent screen, the policy pages and a demo video); restricted scopes would also need a paid security assessment, which should not apply.

## A. Owner steps (in this order)

1. **Search Console** — https://search.google.com/search-console → Add property → "Domain" → `blumea.io`. Google shows a TXT record. In Cloudflare DNS add: Type `TXT`, Name `@`, Content = the value Google gave, Proxy not applicable. Back in Search Console press Verify (can take a few minutes). Use the same Google account that owns the Cloud project.
2. **Google Cloud Console** → APIs & Services → OAuth consent screen (Google now calls it "Google Auth platform" → Branding / Audience / Data access):
   - Branding: app name `Blumea`, support email, logo = `public/brand/blumea-app-icon-1024.png` (square, under 1 MB), home page `https://blumea.io`, privacy `https://blumea.io/privacy`, terms `https://blumea.io/terms`, authorized domain `blumea.io`, developer contact email.
   - Data access: exactly the two scopes above, nothing else.
   - Audience: press **Publish app** (Testing → In production). Google warns that verification is needed; confirm. Users now see an "unverified app" screen with a link to continue, limited to about 100 users until verified.
3. Reconnect YouTube in Blumea (Connections → Disconnect → Connect) and check it still works after more than 7 days (this is the point of the switch).
4. Record the demo video (script below), upload it to YouTube as *Unlisted*, keep the link.
5. Press **Prepare for verification** / **Submit for verification** when Stage 4 (Compare) is done so the video shows the final product. Paste the texts from section B.

## B. Texts for the verification form (English)

**Application homepage:** https://blumea.io — **Privacy policy:** https://blumea.io/privacy — **Terms:** https://blumea.io/terms

**What the app does:** Blumea helps short-form video creators understand why their own videos performed the way they did. The creator connects their own YouTube channel; Blumea shows the channel's numbers and patterns across the creator's videos and gives notes about each video.

**`youtube.readonly` — why we need it:** to read the connected channel's own basic information (channel name, handle, subscriber and view counts) and the list of its videos with titles, publish dates, lengths and public statistics (views, likes, comments). Blumea needs the video list to show the creator their videos and to know which videos to analyse. We never write to, upload to, or change the channel.

**`yt-analytics.readonly` — why we need it:** to read the channel's own YouTube Analytics for its videos: watch time, average view duration and percentage viewed, audience retention, traffic sources, subscriber vs non-subscriber views, and subscriber changes. These are the numbers a creator cannot see across all videos at once in YouTube Studio; Blumea compares them across the creator's videos to find patterns (for example which kind of video holds attention best). No analytics are shown for anyone but the account owner.

**Why a narrower scope is not enough:** the video list and statistics are not available through a narrower scope, and the retention and watch-time numbers exist only in YouTube Analytics.

**How data is used and protected (matches the privacy policy):** data is used only to show the connected creator their own results inside Blumea. It is stored in our database (Supabase, servers in Mumbai, India) under row-level security so each account sees only its own rows; the Google refresh token is kept encrypted in a vault, never in plain tables. We do not sell the data, do not use it for advertising, do not use it to train AI models, and we handle the data in line with the Limited Use requirements (no human reads it except with the user's consent, for security or to comply with law). Videos are analysed by Google's Gemini API using the public video URL, not private data; results are stored per creator. The creator can disconnect YouTube at any time (video data is deleted at disconnect) or delete the whole account in Settings → Your data; disconnecting revokes access, deletes the stored tokens and the videos, numbers and analysis collected through that account, and deleting the account removes everything; if the user revokes access on Google's side instead, we delete on request within 7 days (as stated in the privacy policy). Blumea's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.

**Demo video script (about 3 minutes, English narration or on-screen captions, unlisted YouTube link):**
1. Open `blumea.io`, show the homepage and the links to Privacy and Terms in the footer (10 s).
2. Sign in, start "Connect YouTube". Show the Google consent screen **in full**, with the app name and both scopes visible, and say what each is used for (30 s). Show the browser address bar (`accounts.google.com`) and the project/client ID if asked by the reviewer.
3. Approve. Show the app after connecting: First Scan list of videos, channel numbers, a video's analysis, a cross-video card (50 s).
4. Show where YouTube Analytics numbers appear (retention, traffic, watch time) and say they are read-only (20 s).
5. Settings → Your data: Disconnect YouTube, then Delete account; say what is deleted (30 s).
6. Close on the Privacy page section "YouTube API Services" (10 s).

## C. Readiness checklist (to tick before submitting)

- [ ] `blumea.io` verified in Search Console, same account as the Cloud project.
- [ ] Privacy policy states: what data from Google, how used, shared with whom (Supabase, Vercel, Gemini API), retention, deletion, contact, Google API Services User Data Policy / Limited Use statement. (Already in `/privacy`; re-read after Stage 3 changes it.)
- [ ] Privacy and Terms reachable without signing in, and linked from the homepage and from the consent screen.
- [ ] Consent-screen app name and logo match the website (Blumea, same icon).
- [ ] Only the two scopes requested; no unused scope in the Console.
- [ ] Redirect URIs are production only (no localhost) before submission, or keep localhost out of the production client.
- [ ] Demo video shows the real consent screen and every scope in use.
- [ ] Counsel brief sent (privacy and terms are unreviewed drafts).
- [ ] Contact email monitored (Google writes there; replies are expected within days).

## D. After submitting

Google usually asks follow-up questions by email; answer within a few days or the request closes. Typical time is a few weeks. Until approved: up to about 100 users, "unverified app" screen. The beta fits inside that.
