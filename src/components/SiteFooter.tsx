import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/legal";

// Footer of every public page: the legal links platform reviewers and visitors
// look for.
export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/70 bg-white/60">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-blumea-slate">
        <p>© {new Date().getFullYear()} Blumea</p>

        <nav className="flex flex-wrap items-center gap-5">
          <Link href="/privacy" className="hover:text-blumea-blue">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-blumea-blue">
            Terms of Service
          </Link>
          {CONTACT_EMAIL && (
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-blumea-blue">
              {CONTACT_EMAIL}
            </a>
          )}
        </nav>
      </div>
    </footer>
  );
}
