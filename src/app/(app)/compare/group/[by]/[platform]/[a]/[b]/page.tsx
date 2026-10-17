"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import CompareFrame from "@/components/CompareFrame";
import { loadDashboardData, type DashboardVideo } from "@/lib/dashboard-data";
import { GROUP_MIN, groupComparison, type GroupKind } from "@/lib/compare-groups";
import { leader, show } from "@/lib/compare-format";
import { formatLabel } from "@/lib/format-library";
import { hookTypeLabel } from "@/lib/hook-library";
import { useT } from "@/lib/i18n/client";

// Format against format, or hook against hook, on one platform: the creator's own videos there
// that Blumea has read, grouped, with the typical (middle value) of each group.
export default function GroupComparePage({ params }: { params: Promise<{ by: string; platform: string; a: string; b: string }> }) {
  const { by: rawBy, platform: rawPlatform, a: idA, b: idB } = use(params);
  const t = useT();
  const [videos, setVideos] = useState<DashboardVideo[] | null>(null);
  const by: GroupKind | null = rawBy === "format" || rawBy === "hook" ? rawBy : null;

  useEffect(() => {
    let cancelled = false;
    loadDashboardData().then((data) => {
      if (!cancelled) setVideos(data.videos);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const platform = rawPlatform === "youtube" || rawPlatform === "tiktok" ? rawPlatform : null;
  if (!by || !platform) notFound();

  const label = (id: string) => (by === "format" ? formatLabel(id, t) : hookTypeLabel(id, t)) ?? id;
  const nameA = label(idA);
  const nameB = label(idB);

  const frame = (children: React.ReactNode) => (
    <CompareFrame title={t(by === "format" ? "compare2.groupTitleFormat" : "compare2.groupTitleHook")} subtitle={t("compare2.groupSubtitle")} accessKey={`group:${rawBy}:${platform}:${[idA, idB].sort().join(",")}`}>
      {children}
    </CompareFrame>
  );

  if (videos === null) return frame(<p className="mt-8 text-sm text-blumea-slate">{t("compare.loading")}</p>);

  const result = groupComparison(videos, by, platform, idA, idB, nameA, nameB, t);
  const tooFew = [
    { name: nameA, count: result.countA },
    { name: nameB, count: result.countB },
  ].filter((group) => group.count < GROUP_MIN);

  return frame(
    <>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { name: nameA, count: result.countA, tag: t("compare.videoA") },
          { name: nameB, count: result.countB, tag: t("compare.videoB") },
        ].map((group) => (
          <div key={group.tag} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blumea-blue">{group.tag}</p>
            <p className="mt-1 text-base font-semibold text-blumea-navy">{group.name}</p>
            <p className="mt-0.5 text-sm text-blumea-slate">{t("compare2.groupVideos", { count: group.count })}</p>
          </div>
        ))}
      </div>

      {!result.enough ? (
        <div className="mt-6 space-y-2">
          {tooFew.map((group) => (
            <p key={group.name} className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm leading-6 text-blumea-slate">
              {t("compare2.groupTooFew", { min: GROUP_MIN, name: group.name, count: group.count })}
            </p>
          ))}
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
            <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blumea-slate">
              <span />
              <span>{nameA}</span>
              <span>{nameB}</span>
            </div>
            {result.rows.map((row) => {
              const win = leader(row.a, row.b, row.better);
              const cell = (side: "a" | "b") => (
                <span className={win === side ? "font-semibold text-blumea-blue" : "text-blumea-navy"}>
                  <span className="ltr-island">{show(row[side], row.format, t)}</span>
                </span>
              );
              return (
                <div key={row.key} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
                  <span className="text-blumea-slate">{t(row.key)}</span>
                  {cell("a")}
                  {cell("b")}
                </div>
              );
            })}
          </div>

          <section className="mt-8 pb-6">
            <h2 className="text-xl font-semibold tracking-tight text-blumea-navy">{t("compare.stands")}</h2>
            <div className="mt-3 space-y-3">
              {result.statements.map((statement, index) => (
                <p key={index} className="rounded-2xl border border-blumea-blue/25 bg-white p-4 text-sm leading-6 text-blumea-navy shadow-sm">
                  {statement}
                </p>
              ))}
            </div>
            {result.notes.map((note) => (
              <p key={note} className="mt-3 text-xs leading-5 text-blumea-slate">
                {note}
              </p>
            ))}
          </section>
        </>
      )}
    </>
  );
}
