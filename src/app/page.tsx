import type { Metadata } from "next";
import Image from "next/image";
import AppLink from "@/components/AppLink";
import LanguageSwitch from "@/components/LanguageSwitch";
import SiteFooter from "@/components/SiteFooter";
import AccessRequestForm from "@/components/AccessRequestForm";
import { rich } from "@/lib/i18n/rich";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("home.metaTitle"), description: t("home.metaDescription") };
}

export default async function Home() {
  const t = await getT();

  const understands = [
    { title: t("home.show1Title"), body: t("home.show1Body") },
    { title: t("home.show2Title"), body: t("home.show2Body") },
    { title: t("home.show3Title"), body: t("home.show3Body") },
  ];

  const steps = [
    { n: "1", title: t("home.step1Title"), body: t("home.step1Body") },
    { n: "2", title: t("home.step2Title"), body: t("home.step2Body") },
    { n: "3", title: t("home.step3Title"), body: t("home.step3Body") },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-sky-50">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div dir="ltr" className="flex items-center gap-2">
          <Image src="/blumea-logo-v2.png" alt="Blumea" width={36} height={36} className="h-9 w-9" priority />
          <span className="text-xl font-semibold text-blumea-navy">
            Blum<span className="text-blumea-blue">ea</span>
          </span>
        </div>

        <nav className="flex items-center gap-4 text-sm font-semibold">
          <LanguageSwitch />
          <AppLink href="/login" className="text-blumea-slate hover:text-blumea-blue">
            {t("home.login")}
          </AppLink>
          <AppLink href="#request-access" className="rounded-full bg-blumea-blue px-5 py-2 text-white transition hover:bg-blumea-blue-hover">
            {t("beta.requestAccess")}
          </AppLink>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-4xl px-6 pb-14 pt-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-blumea-navy sm:text-5xl">
            {t("home.heroA")} <span className="text-blumea-blue">{t("home.heroB")}</span> {t("home.heroC")}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-blumea-slate sm:text-lg">{t("home.heroBody")}</p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <AppLink
              href="#request-access"
              className="w-full rounded-2xl bg-blumea-blue px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-blumea-blue-hover sm:w-auto"
            >
              {t("beta.requestAccess")}
            </AppLink>

            <AppLink
              href="/login"
              className="w-full rounded-2xl border border-blumea-blue bg-white px-8 py-3.5 text-base font-semibold text-blumea-blue transition hover:bg-blumea-mist sm:w-auto"
            >
              {t("home.login")}
            </AppLink>
          </div>

          <p className="mt-4 text-sm text-blumea-slate">{t("home.forCreators")}</p>
          <p className="mx-auto mt-3 max-w-xl rounded-2xl bg-blumea-mist px-4 py-2.5 text-sm font-semibold text-blumea-navy">{t("beta.badge")}</p>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 py-10">
          <h2 className="text-center text-2xl font-semibold text-blumea-navy">{t("home.showsTitle")}</h2>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {understands.map((item) => (
              <article key={item.title} className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-blumea-navy">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-blumea-slate">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 py-10">
          <h2 className="text-center text-2xl font-semibold text-blumea-navy">{t("home.howTitle")}</h2>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.n} className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
                <p className="flex h-8 w-8 items-center justify-center rounded-full bg-blumea-mist text-sm font-semibold text-blumea-blue">
                  {step.n}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-blumea-navy">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-blumea-slate">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-3xl px-6 py-10">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-semibold text-blumea-navy">{t("home.honestTitle")}</h2>

            <ul className="mt-4 space-y-3 text-sm leading-6 text-blumea-slate">
              <li>
                <strong className="text-blumea-navy">{t("home.honest1")}</strong> {t("home.honest1Body")}
              </li>
              <li>
                <strong className="text-blumea-navy">{t("home.honest2")}</strong> {t("home.honest2Body")}
              </li>
              <li>
                <strong className="text-blumea-navy">{t("home.honest3")}</strong> {t("home.honest3Body")}
              </li>
              <li>
                <strong className="text-blumea-navy">{t("home.honest4")}</strong>{" "}
                {rich(t("home.honest4Body"), {
                  privacy: (
                    <AppLink href="/privacy" className="font-semibold text-blumea-blue underline">
                      {t("legalShell.privacyTitle")}
                    </AppLink>
                  ),
                })}
              </li>
            </ul>
          </div>
        </section>
        <section className="mx-auto w-full max-w-3xl px-6 pb-14 pt-4">
          <AccessRequestForm />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
