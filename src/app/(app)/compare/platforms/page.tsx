"use client";

import { useEffect, useState } from "react";
import AppLink from "@/components/AppLink";
import CompareFrame from "@/components/CompareFrame";
import { PlatformIcon } from "@/components/PlatformBadge";
import { loadDashboardData, type DashboardData } from "@/lib/dashboard-data";
import { PLATFORM_MIN, platformSummary, type PlatformSummary } from "@/lib/compare-groups";
import { show } from "@/lib/compare-format";
import { platformName } from "@/lib/platform-capabilities";
import { useT } from "@/lib/i18n/client";

// Platform against platform, kept honest: raw numbers are never set side by side
// (views mean different things on each platform); each platform is held against its own usual.
export default function PlatformsPage() {
  const t = useT();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDashboardData().then((loaded) => {
      if (!cancelled) setData(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const frame = (children: React.ReactNode) => (
    <CompareFrame title={t("compare2.platformsTitle")} subtitle={t("compare2.platformsSubtitle")} accessKey="platforms">
      {children}
    </CompareFrame>
  );

  if (data === null) return frame(<p className="mt-8 text-sm text-blumea-slate">{t("compare.loading")}</p>);

  const a = platformSummary(data.videos, data.accounts, "youtube");
  const b = platformSummary(data.videos, data.accounts, "tiktok");
  const small = [a, b].filter((platform) => platform.videos < PLATFORM_MIN);

  if (small.length > 0) {
    return frame(
      <div className="mt-6 space-y-2">
        {small.map((platform) => (
          <p key={platform.platform} className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm leading-6 text-blumea-slate">
            {t("compare2.platformsNeed", { min: PLATFORM_MIN, platform: platformName(platform.platform, t), count: platform.videos })}
          </p>
        ))}
      </div>
    );
  }

  const rows: { label: string; read: (p: PlatformSummary) => string }[] = [
    { label: t("compare2.rowFollowers"), read: (p) => show(p.followers, "count", t) },
    { label: t("compare2.rowVideos"), read: (p) => String(p.videos) },
    { label: t("compare2.rowTypicalViews"), read: (p) => show(p.typicalViews, "count", t) },
    { label: t("compare2.rowTypicalLikes"), read: (p) => show(p.typicalLikes, "count", t) },
    { label: t("compare2.rowTypicalEngagement"), read: (p) => show(p.typicalEngagement, "decimal", t) },
    { label: t("compare2.rowStrongest"), read: (p) => (p.strongest ? t("compare2.strongestLine", { x: p.strongest.ratio.toFixed(1).replace(/\.0$/, "") }) : "—") },
  ];
  const ratio = (p: PlatformSummary) => (p.strongest ? p.strongest.ratio.toFixed(1).replace(/\.0$/, "") : null);

  return frame(
    <>
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blumea-slate">
          <span />
          {[a, b].map((platform) => (
            <span key={platform.platform} className="flex items-center gap-1.5">
              <PlatformIcon platform={platform.platform as "youtube" | "tiktok"} size={12} />
              {platformName(platform.platform, t)}
            </span>
          ))}
        </div>
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
            <span className="text-blumea-slate">{row.label}</span>
            <span className="text-blumea-navy">
              <span className="ltr-island">{row.read(a)}</span>
            </span>
            <span className="text-blumea-navy">
              <span className="ltr-island">{row.read(b)}</span>
            </span>
          </div>
        ))}
      </div>

      <section className="mt-8 pb-6">
        <h2 className="text-xl font-semibold tracking-tight text-blumea-navy">{t("compare.stands")}</h2>
        {ratio(a) && ratio(b) && (
          <p className="mt-3 rounded-2xl border border-blumea-blue/25 bg-white p-4 text-sm leading-6 text-blumea-navy shadow-sm">
            {t("compare2.platformsStatement", {
              p1: platformName("youtube", t),
              x1: ratio(a) as string,
              p2: platformName("tiktok", t),
              x2: ratio(b) as string,
            })}{" "}
            {a.strongest && (
              <AppLink href={`/analysis/${a.strongest.id}`} className="font-semibold text-blumea-blue hover:underline">
                {a.strongest.title}
              </AppLink>
            )}
            {" · "}
            {b.strongest && (
              <AppLink href={`/analysis/${b.strongest.id}`} className="font-semibold text-blumea-blue hover:underline">
                {b.strongest.title}
              </AppLink>
            )}
          </p>
        )}
        <p className="mt-3 text-xs leading-5 text-blumea-slate">{t("compare2.platformsNote")}</p>
      </section>
    </>
  );
}
