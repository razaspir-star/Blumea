import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/legal";
import { getT } from "@/lib/i18n/server";
import PrivacyHe from "./privacy-he";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t("legalShell.privacyTitle")} – Blumea`, description: t("legalShell.privacyMeta") };
}

// DRAFT written from what the product actually does (checked against the code and
// the database on 2026-10-10); to be reviewed by counsel. Every promise here must
// stay true to the code: change the product and this text together.
export default async function PrivacyPage() {
  const t = await getT();
  if (t.locale === "he") {
    return (
      <LegalPage title={t("legalShell.privacyTitle")}>
        <PrivacyHe />
      </LegalPage>
    );
  }

  return (
    <LegalPage title={t("legalShell.privacyTitle")}>
      <p>
        Blumea (&ldquo;Blumea&rdquo;, &ldquo;we&rdquo;) helps creators understand their own short videos. This policy explains what
        we collect, why, who processes it, how long we keep it, and how you can delete it. We wrote it to be read, so it is short and
        specific.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your Blumea account:</strong> your name, email address and password (the password is handled by our authentication
          provider and is never visible to us), and the choices you make when you sign up (goals, content categories, platforms).
        </li>
        <li>
          <strong>From YouTube, if you connect it:</strong> your channel name and handle, subscriber count and total views; your list of
          videos (title, publish date, length); each video&rsquo;s views, likes and comments; and, from YouTube Analytics, how viewers
          watched (average watch time and the retention curve), where views came from (traffic sources), views from subscribers versus
          non-subscribers, and subscribers gained and lost.
        </li>
        <li>
          <strong>From TikTok, if you connect it:</strong> your display name, follower count, and your list of videos with their public
          numbers (title, cover image, likes, comments, shares, views as TikTok reports them). The cover pictures are copied to our
          storage so they can be shown later; they are deleted when you disconnect TikTok or delete your account.
        </li>
        <li>
          <strong>Videos you upload yourself:</strong> if you choose to upload a TikTok video for analysis (from your computer, or
          from your phone through a QR code), the file is held in a private temporary storage of ours while it is sent to the AI service
          for analysis, and deleted right afterwards. We do not keep the video file; if something goes wrong, a daily sweep removes any
          leftover within a day.
        </li>
        <li>
          <strong>Screenshots of your TikTok video analytics (optional):</strong> TikTok shows how people watched a video only inside
          its own app, so you can choose to share screenshots of that screen. They are read by the AI service for the numbers written on
          them (average watch time, traffic sources, followers versus others, and similar totals), held in the same temporary storage
          and deleted right after. We keep only the numbers, marked as coming from your screenshots, and never the pictures.
        </li>
        <li>
          <strong>Our analysis of your videos:</strong> structured notes produced by AI about each video (for example its format, how it
          opens, text on screen, and the ask it makes of viewers), and the patterns Blumea computes from your own numbers.
        </li>
      </ul>
      <p>
        We do not collect your passwords for YouTube or TikTok. You sign in on Google&rsquo;s and TikTok&rsquo;s own pages and give Blumea
        read-only access.
      </p>

      <h2>YouTube API Services</h2>
      <p>
        Blumea uses YouTube API Services. By connecting your YouTube account you agree to be bound by the{" "}
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
          YouTube Terms of Service
        </a>
        . Information we receive through YouTube is also subject to the{" "}
        <a href="http://www.google.com/policies/privacy" target="_blank" rel="noopener noreferrer">
          Google Privacy Policy
        </a>
        . Blumea&rsquo;s use and transfer of information received from Google APIs to any other app will adhere to the{" "}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. We ask for read-only access (<code>youtube.readonly</code> and{" "}
        <code>yt-analytics.readonly</code>) and use it only to show you your own numbers and to analyze your own videos inside Blumea.
      </p>
      <p>
        You can revoke Blumea&rsquo;s access at any time in your{" "}
        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
          Google security settings
        </a>
        .
      </p>

      <h2>Why we use it</h2>
      <ul>
        <li>To show you your own videos, numbers and how viewers watched.</li>
        <li>To analyze each video with AI and to find patterns across your own videos.</li>
        <li>To keep your numbers up to date (we refresh them about once a day) and show how they change over time.</li>
      </ul>
      <p>
        We do not sell your data, we do not show ads, and we do not use your data to train AI models. We do not use data from your connected
        accounts for anything other than providing Blumea to you.
      </p>

      <h2>Who processes it for us</h2>
      <ul>
        <li>
          <strong>Supabase</strong> hosts our database and sign-in (servers in Mumbai, India), and the temporary storage described
          above. Connection tokens are stored encrypted.
        </li>
        <li>
          <strong>Google (Gemini API)</strong> reads a video to produce the AI notes about it. For YouTube videos this is the public
          video; for an upload it is the file you chose, deleted after analysis.
        </li>
        <li>
          <strong>Our hosting provider</strong> serves the website.
        </li>
      </ul>
      <p>We do not share your information with anyone else, except if the law requires it.</p>

      <h2>How long we keep it, and how to delete it</h2>
      <ul>
        <li>
          <strong>Disconnect an account</strong> (Connections page): Blumea&rsquo;s access is revoked, the stored tokens are deleted, and
          the videos, numbers and analysis collected through that account are deleted.
        </li>
        <li>
          <strong>Delete your Blumea account</strong> (Settings → Delete my account and data): every connected account is disconnected and
          everything Blumea holds about you is permanently deleted.
        </li>
        <li>
          If you revoke access from Google&rsquo;s or TikTok&rsquo;s side instead, Blumea can no longer read your account. Use the two options
          above, or write to us, and we will delete your data within 7 days.
        </li>
        <li>Otherwise we keep your data while your account is open, so Blumea can show how your numbers change over time.</li>
      </ul>

      <h2>Security</h2>
      <p>
        Connections are encrypted in transit. Access tokens are stored encrypted. Each creator can only read their own rows in our database.
        No system is perfectly secure, and we will tell you if something that affects you goes wrong.
      </p>

      <h2>Your choices and rights</h2>
      <p>
        You can see what Blumea understood about each video inside the product, disconnect any account, and delete your account and data at
        any time. You can also ask us to correct or delete your information or to send you a copy.
      </p>

      <h2>Cookies and tracking</h2>
      <p>
        Blumea stores what it needs to keep you signed in, and your language choice. We do not use advertising or third-party tracking tools.
      </p>

      <h2>Children</h2>
      <p>Blumea is not meant for anyone under 16, and we do not knowingly collect their information.</p>

      <h2>Changes</h2>
      <p>
        If we change what we collect or how we use it, we will update this page and its date, and tell you in the product before the change
        takes effect.
      </p>

      <h2>Contact</h2>
      <p>
        {CONTACT_EMAIL ? (
          <>
            Questions, or a request to access, correct or delete your data: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </>
        ) : (
          <>You can delete your data yourself from Settings at any time.</>
        )}
      </p>
    </LegalPage>
  );
}
