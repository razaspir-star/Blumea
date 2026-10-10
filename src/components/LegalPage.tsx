import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import SiteFooter from "@/components/SiteFooter";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/legal";

// Public page shell for the legal text: no sign-in needed, readable by platform
// reviewers and visitors alike.
export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-sky-50">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/blumea-logo-v2.png" alt="" width={32} height={32} className="h-8 w-8" />
          <span className="text-lg font-semibold text-blumea-navy">
            Blum<span className="text-blumea-blue">ea</span>
          </span>
        </Link>

        <Link href="/login" className="text-sm font-semibold text-blumea-blue hover:underline">
          Log in
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-12">
        <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">{title}</h1>

        <p className="mt-2 text-sm text-blumea-slate">Effective {LEGAL_EFFECTIVE_DATE}</p>

        <div className="mt-8 space-y-6 text-[15px] leading-7 text-blumea-slate [&_a]:font-semibold [&_a]:text-blumea-blue [&_a]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-blumea-navy [&_li]:mt-1.5 [&_strong]:text-blumea-navy [&_ul]:list-disc [&_ul]:pl-6">
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
