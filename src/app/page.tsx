import type { Metadata } from "next";
import Image from "next/image";
import AppLink from "@/components/AppLink";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Blumea – understand what works in your short videos",
  description:
    "Blumea reads your own short videos and how viewers watched them, then shows what is worth keeping and what is worth testing. Honest about what it knows and what it does not.",
};

const understands = [
  {
    title: "What each video is",
    body: "Its format, how it opens, the text on screen, what it asks of viewers. Read by AI from the video itself, labelled as AI.",
  },
  {
    title: "How viewers watched",
    body: "Average watch time, where people leave, where views came from, and how much your own followers carry a video. Straight from YouTube Analytics.",
  },
  {
    title: "Patterns in your own videos",
    body: "Which formats hold viewers, whether length or format is behind a gap, when you post, which videos get rewatched. Every pattern says how many videos it rests on.",
  },
];

const steps = [
  { n: "1", title: "Connect", body: "Sign in to YouTube or TikTok on their own pages. Blumea gets read-only access and can never post for you." },
  { n: "2", title: "Blumea reads", body: "Your videos are analyzed and your numbers are refreshed about once a day." },
  { n: "3", title: "You see what to try", body: "Plain-language findings, each marked as a fact, a pattern in your videos, or an idea worth testing." },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-sky-50">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Image src="/blumea-logo-v2.png" alt="Blumea logo" width={36} height={36} className="h-9 w-9" priority />
          <span className="text-xl font-semibold text-blumea-navy">
            Blum<span className="text-blumea-blue">ea</span>
          </span>
        </div>

        <nav className="flex items-center gap-4 text-sm font-semibold">
          <AppLink href="/login" className="text-blumea-slate hover:text-blumea-blue">
            Log in
          </AppLink>
          <AppLink href="/register" className="rounded-full bg-blumea-blue px-5 py-2 text-white transition hover:bg-blumea-blue-hover">
            Get started
          </AppLink>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-4xl px-6 pb-14 pt-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-blumea-navy sm:text-5xl">
            Your content. <span className="text-blumea-blue">Our insight.</span> Your growth.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-blumea-slate sm:text-lg">
            Blumea reads your own short videos and how viewers watched them, then shows what is worth keeping and what is worth testing.
            It says how sure it is, and stays quiet when it does not know.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <AppLink
              href="/register"
              className="w-full rounded-2xl bg-blumea-blue px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-blumea-blue-hover sm:w-auto"
            >
              Get started
            </AppLink>

            <AppLink
              href="/login"
              className="w-full rounded-2xl border border-blumea-blue bg-white px-8 py-3.5 text-base font-semibold text-blumea-blue transition hover:bg-blumea-mist sm:w-auto"
            >
              Log in
            </AppLink>
          </div>

          <p className="mt-4 text-sm text-blumea-slate">For creators of short videos. Works with YouTube Shorts and TikTok.</p>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 py-10">
          <h2 className="text-center text-2xl font-semibold text-blumea-navy">What Blumea shows you</h2>

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
          <h2 className="text-center text-2xl font-semibold text-blumea-navy">How it works</h2>

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
            <h2 className="text-2xl font-semibold text-blumea-navy">Honest by design</h2>

            <ul className="mt-4 space-y-3 text-sm leading-6 text-blumea-slate">
              <li>
                <strong className="text-blumea-navy">Fact, pattern or idea.</strong> Every statement says which it is, and how many of your videos it rests
                on.
              </li>
              <li>
                <strong className="text-blumea-navy">Silence beats a weak claim.</strong> With too few videos, Blumea says so instead of guessing.
              </li>
              <li>
                <strong className="text-blumea-navy">Ideas, not promises.</strong> A pattern in your videos is not proof of why one did well, and Blumea
                never promises more views.
              </li>
              <li>
                <strong className="text-blumea-navy">Your data stays yours.</strong> Read-only access, no ads, no selling. Disconnect or delete everything
                any time from Settings. See the <AppLink href="/privacy" className="font-semibold text-blumea-blue underline">Privacy Policy</AppLink>.
              </li>
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
