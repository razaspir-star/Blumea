"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

// Dev-only labelling tool (see src/app/api/dev/format-candidates-2/route.ts): the
// owner ticks candidate example videos per format; ticks are the labels for the
// regression sets in tests/format-golden/. A ✗ means "not sure", not "rejected".
// Only exists in `next dev`.

type Candidate = { videoId: string; title: string; channel: string; thumbnail: string };
type FormatBlock = { id: string; label: string; candidates: Candidate[] };
type Labels = Record<string, { yes: string[]; no: string[] }>;

function extractVideoId(input: string): string {
  const match = input.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/);
  return match ? match[1] : input.trim();
}

export type DevLabelToolProps = { apiPath: string; title: string; intro: string; itemNoun: string };

export function DevLabelTool({ apiPath: api, title, intro, itemNoun }: DevLabelToolProps) {
  if (process.env.NODE_ENV !== "development") return <div className="p-8 text-blumea-slate">Not found</div>;
  return <DevLabelToolInner apiPath={api} title={title} intro={intro} itemNoun={itemNoun} />;
}

function DevLabelToolInner({ apiPath: api, title, intro, itemNoun }: DevLabelToolProps) {
  const [formats, setFormats] = useState<FormatBlock[] | null>(null);
  const [labels, setLabels] = useState<Labels>({});
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [extra, setExtra] = useState<Record<string, string>>({});
  const tokenRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase.auth.getSession();
      tokenRef.current = data.session?.access_token ?? "";
      const response = await fetch(api, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      const body = await response.json();
      if (cancelled) return;
      if (!response.ok) {
        setError(body.error ?? "Failed to load");
        return;
      }
      setFormats(body.formats);
      // Fallback copy kept in this browser: if the dev server stops mid-session
      // (it has several times) the ticks survive a reload. The copy with more
      // approvals wins and is pushed back to the server.
      let merged: Labels = body.labels ?? {};
      try {
        const local = JSON.parse(localStorage.getItem(`format-labels:${api}`) ?? "null") as Labels | null;
        const count = (l: Labels) => Object.values(l).reduce((n, v) => n + v.yes.length + v.no.length, 0);
        if (local && count(local) > count(merged)) {
          merged = local;
          fetch(api, {
            method: "POST",
            headers: { Authorization: `Bearer ${tokenRef.current}`, "Content-Type": "application/json" },
            body: JSON.stringify({ labels: merged }),
          });
        }
      } catch {
        // storage unavailable: server copy only
      }
      setLabels(merged);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const save = useCallback(async (next: Labels) => {
    setLabels(next);
    try {
      localStorage.setItem(`format-labels:${api}`, JSON.stringify(next));
    } catch {
      // storage unavailable: server copy only
    }
    // Fresh token on every save: the one read at page load expires after ~1 hour
    // and a stale one made every save fail silently with a 401.
    const { data } = await supabase.auth.getSession();
    tokenRef.current = data.session?.access_token ?? tokenRef.current;
    const response = await fetch(api, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenRef.current}`, "Content-Type": "application/json" },
      body: JSON.stringify({ labels: next }),
    });
    setSaveError(response.ok ? null : `Saving failed (${response.status}) — do NOT reload; tell Claude`);
  }, [api]);

  function mark(formatId: string, videoId: string, verdict: "yes" | "no" | "clear") {
    const current = labels[formatId] ?? { yes: [], no: [] };
    const yes = current.yes.filter((id) => id !== videoId);
    const no = current.no.filter((id) => id !== videoId);
    if (verdict === "yes") yes.push(videoId);
    if (verdict === "no") no.push(videoId);
    save({ ...labels, [formatId]: { yes, no } });
  }

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!formats) return <div className="p-8 text-blumea-slate">Searching YouTube for examples… (first load takes about a minute)</div>;

  return (
    <div className="mx-auto w-full max-w-5xl pb-16">
      {saveError && (
        <div className="sticky top-0 z-10 mb-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">{saveError}</div>
      )}
      <h1 className="text-3xl font-semibold text-blumea-navy">{title}</h1>
      <p className="mt-2 text-sm text-blumea-slate">{intro}</p>

      {formats.map((format) => {
        const current = labels[format.id] ?? { yes: [], no: [] };
        const approvedCount = current.yes.length;
        return (
          <section key={format.id} className="mt-8">
            <h2 className="text-lg font-semibold text-blumea-navy">
              {format.label} <span className="text-sm font-normal text-blumea-slate">({format.id}) — approved: {approvedCount}</span>
            </h2>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {format.candidates.map((candidate) => {
                const verdict = current.yes.includes(candidate.videoId) ? "yes" : current.no.includes(candidate.videoId) ? "no" : null;
                return (
                  <div
                    key={candidate.videoId}
                    className={`overflow-hidden rounded-xl border bg-white text-xs shadow-sm ${
                      verdict === "yes" ? "border-emerald-400" : verdict === "no" ? "border-red-300 opacity-50" : "border-slate-200"
                    }`}
                  >
                    <a href={`https://www.youtube.com/watch?v=${candidate.videoId}`} target="_blank" rel="noopener noreferrer">
                      <div className="relative aspect-video bg-slate-100">
                        {candidate.thumbnail && (
                          <Image src={candidate.thumbnail} alt="" fill sizes="200px" unoptimized className="object-cover" />
                        )}
                      </div>
                    </a>
                    <p className="line-clamp-2 px-2 pt-2 font-medium text-blumea-navy">{candidate.title}</p>
                    <p className="truncate px-2 text-blumea-slate">{candidate.channel}</p>
                    <div className="flex gap-1 p-2">
                      <button
                        type="button"
                        onClick={() => mark(format.id, candidate.videoId, verdict === "yes" ? "clear" : "yes")}
                        className="flex-1 rounded-md bg-emerald-50 py-1 font-semibold text-emerald-700"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => mark(format.id, candidate.videoId, verdict === "no" ? "clear" : "no")}
                        className="flex-1 rounded-md bg-red-50 py-1 font-semibold text-red-600"
                      >
                        ✗
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const value = extra[format.id]?.trim();
                if (!value) return;
                mark(format.id, extractVideoId(value), "yes");
                setExtra({ ...extra, [format.id]: "" });
              }}
            >
              <input
                value={extra[format.id] ?? ""}
                onChange={(event) => setExtra({ ...extra, [format.id]: event.target.value })}
                placeholder={`Paste your own YouTube link for this ${itemNoun}`}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              />
              <button type="submit" className="rounded-lg bg-blumea-navy px-3 py-1.5 text-sm font-semibold text-white">
                Add as ✓
              </button>
            </form>

            {current.yes.filter((id) => !format.candidates.some((c) => c.videoId === id)).length > 0 && (
              <p className="mt-2 text-xs text-blumea-slate">
                Your own: {current.yes.filter((id) => !format.candidates.some((c) => c.videoId === id)).join(", ")}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
