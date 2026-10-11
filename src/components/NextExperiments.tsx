import type { NextExperiment } from "@/lib/next-experiments";

// "Try in your next video": up to three experiments drawn from the creator's own
// numbers. Each says what it rests on and what to look at afterwards.
export default function NextExperiments({ experiments }: { experiments: NextExperiment[] }) {
  return (
    <section className="mt-8">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold tracking-tight text-blumea-navy">Try in your next video</h2>
        <p className="mt-1 text-sm text-blumea-slate">Ideas to test, drawn from your own videos. Nothing here is a promise.</p>
      </div>

      {experiments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-5">
          <p className="text-sm font-semibold text-blumea-navy">Nothing to suggest yet.</p>
          <p className="mt-1 text-sm leading-6 text-blumea-slate">
            Blumea suggests an experiment only when your own videos show something specific to test. With more videos read,
            suggestions will appear here. Staying quiet is a normal answer.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {experiments.map((experiment) => (
            <article key={experiment.kind} className="flex flex-col rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-blumea-blue">Worth testing</p>
              <h3 className="mt-2 text-lg font-semibold text-blumea-navy">{experiment.title}</h3>
              <p className="mt-2 text-sm leading-6 text-blumea-slate">{experiment.why}</p>
              <p className="mt-3 text-sm leading-6 text-blumea-slate">
                <span className="font-semibold text-blumea-navy">How you&apos;ll know: </span>
                {experiment.how}
              </p>
              <p className="mt-auto pt-4 text-xs text-blumea-slate">{experiment.evidence}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
