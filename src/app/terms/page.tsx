import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/legal";
import { getT } from "@/lib/i18n/server";
import TermsHe from "./terms-he";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t("legalShell.termsTitle")} – Blumea`, description: t("legalShell.termsMeta") };
}

// DRAFT, to be reviewed by counsel (liability, governing law and jurisdiction in
// particular). Written from what the product does today.
export default async function TermsPage() {
  const t = await getT();
  if (t.locale === "he") {
    return (
      <LegalPage title={t("legalShell.termsTitle")}>
        <TermsHe />
      </LegalPage>
    );
  }

  return (
    <LegalPage title={t("legalShell.termsTitle")}>
      <p>
        These terms are an agreement between you and Blumea. By creating an account or using Blumea you agree to them. If you do not
        agree, please do not use Blumea. Our <Link href="/privacy">Privacy Policy</Link> explains how we handle your information.
      </p>

      <h2>What Blumea is</h2>
      <p>
        Blumea is a tool that helps creators understand their own short videos: what is in them, how viewers watched them, and what is
        worth trying next. It reads the accounts you connect, analyzes your videos with AI, and shows you patterns in your own numbers.
        Blumea is not affiliated with, endorsed by or sponsored by YouTube, Google, TikTok, Instagram or Meta.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least 16 years old and able to enter a binding agreement.</li>
        <li>Give accurate information and keep your password safe. You are responsible for what happens under your account.</li>
        <li>One person per account. Do not share your login.</li>
      </ul>

      <h2>Connecting your accounts</h2>
      <p>
        You can connect accounts you own or are authorized to manage. Blumea asks for read-only access and cannot post, edit or delete
        anything on your accounts. By connecting YouTube you also agree to be bound by the{" "}
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
          YouTube Terms of Service
        </a>
        . You can disconnect at any time, which removes Blumea&rsquo;s access and deletes the data collected through that account.
      </p>

      <h2>Your content</h2>
      <p>
        Your videos and accounts stay yours. You give Blumea permission to read them through the connections you make, and to have them
        analyzed by AI, only to provide Blumea to you. Only analyze your own content: do not use Blumea to analyze, collect or compare
        other people&rsquo;s videos or accounts.
      </p>

      <h2>What you agree not to do</h2>
      <ul>
        <li>Use Blumea for anything unlawful, or to infringe someone else&rsquo;s rights.</li>
        <li>Try to break, overload, probe or reverse-engineer Blumea, or get around its limits.</li>
        <li>Collect data from Blumea in bulk, or use it to build a competing product.</li>
        <li>Use Blumea in a way that breaks the rules of the platforms you connect.</li>
      </ul>

      <h2>About the insights</h2>
      <p>
        Blumea&rsquo;s AI reads videos and its statements are observations and ideas to test, not guarantees. Blumea says how many of your
        videos a pattern rests on and stays quiet when there is not enough to say. A pattern in your videos is not proof of why a video
        did well, and nothing in Blumea promises more views, followers or income. Numbers come from the platforms and can be late or
        incomplete.
      </p>

      <h2>Availability and changes</h2>
      <p>
        Blumea is early and changing. Features can change, pause or end, and the service may be unavailable at times. We may update these
        terms; if the change matters, we will tell you in the product before it applies. If you keep using Blumea after that, you accept
        the new terms.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can stop at any time and delete your account and data from Settings. We may suspend or close an account that breaks these
        terms or puts the service or other people at risk.
      </p>

      <h2>Disclaimers and limits</h2>
      <p>
        Blumea is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without promises about results or uninterrupted service.
        To the extent the law allows, Blumea is not responsible for indirect or consequential losses, and its total responsibility to you
        for any claim is limited to the amount you paid Blumea in the 12 months before the claim (nothing, while Blumea is free). Nothing
        here limits rights you have by law that cannot be limited.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of the State of Israel, and the competent courts of Israel will handle disputes.</p>

      <h2>Contact</h2>
      <p>
        {CONTACT_EMAIL ? (
          <>
            Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </>
        ) : (
          <>Questions about these terms can be sent through the product once you have an account.</>
        )}
      </p>
    </LegalPage>
  );
}
