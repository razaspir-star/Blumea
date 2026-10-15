import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/legal";
import { getT } from "@/lib/i18n/server";

// Footer of every public page: the legal links platform reviewers and visitors
// look for.
export default async function SiteFooter() {
  const t = await getT();

  return (
    <footer className="border-t border-slate-200/70 bg-white/60">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-blumea-slate">
        <p>{t("legalShell.footerRights", { year: new Date().getFullYear() })}</p>

        <nav className="flex flex-wrap items-center gap-5">
          <Link href="/privacy" className="hover:text-blumea-blue">
            {t("legalShell.privacyTitle")}
          </Link>
          <Link href="/terms" className="hover:text-blumea-blue">
            {t("legalShell.termsTitle")}
          </Link>
          {CONTACT_EMAIL && (
            <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" className="hover:text-blumea-blue">
              {CONTACT_EMAIL}
            </a>
          )}
        </nav>
      </div>
    </footer>
  );
}
