"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import Modal from "@/components/Modal";
import { PlatformIcon } from "@/components/PlatformBadge";
import { useAppRouter } from "@/lib/use-app-router";
import { loadDashboardData, type DashboardVideo } from "@/lib/dashboard-data";
import { GROUP_MIN, groupOptions, type GroupKind } from "@/lib/compare-groups";
import { formatLabel } from "@/lib/format-library";
import { hookTypeLabel } from "@/lib/hook-library";
import { useT } from "@/lib/i18n/client";
import type { TextKey } from "@/lib/i18n/translate";
import { platformLabels } from "@/lib/mock-data";

type CompareType = "videos" | "usual" | "format" | "hook" | "platforms";

const TYPES: { id: CompareType; title: TextKey; desc: TextKey }[] = [
  { id: "videos", title: "compare2.typeVideos", desc: "compare2.typeVideosDesc" },
  { id: "usual", title: "compare2.typeUsual", desc: "compare2.typeUsualDesc" },
  { id: "format", title: "compare2.typeFormat", desc: "compare2.typeFormatDesc" },
  { id: "hook", title: "compare2.typeHook", desc: "compare2.typeHookDesc" },
  { id: "platforms", title: "compare2.typePlatforms", desc: "compare2.typePlatformsDesc" },
];

function thumbOf(video: DashboardVideo): string | null {
  return video.platform === "youtube" ? `https://i.ytimg.com/vi/${video.platformVideoId}/mqdefault.jpg` : video.thumbnailUrl;
}

// Choose what to compare, then what exactly: two videos, one video against the creator's
// usual, two formats or openings, or the platforms. Opened from a video's own page, that
// video is already chosen (two videos, or against the usual).
export default function ComparePicker({ onClose, initialA }: { onClose: () => void; initialA?: string }) {
  const t = useT();
  const router = useAppRouter();
  const [videos, setVideos] = useState<DashboardVideo[] | null>(null);
  const [type, setType] = useState<CompareType | null>(null);
  const [aId, setAId] = useState<string | null>(initialA ?? null);
  const [bId, setBId] = useState<string | null>(null);
  // The platform chosen for each of the two videos (video vs video picks the platform first).
  const [aPlatform, setAPlatform] = useState<string | null>(null);
  const [bPlatform, setBPlatform] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDashboardData().then((data) => {
      if (!cancelled) setVideos([...data.videos].sort((x, y) => (y.publishedAt ?? "").localeCompare(x.publishedAt ?? "")));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function backToTypes() {
    setType(null);
    setAId(initialA ?? null);
    setBId(null);
    setAPlatform(null);
    setBPlatform(null);
  }

  function chooseType(next: CompareType) {
    if (next === "platforms") {
      router.push("/compare/platforms");
      return;
    }
    if (next === "usual" && initialA) {
      router.push(`/compare/usual/${initialA}`);
      return;
    }
    setType(next);
    setAId(next === "videos" ? (initialA ?? null) : null);
    setBId(null);
    setAPlatform(null);
    setBPlatform(null);
  }

  const visibleTypes = initialA ? TYPES.filter((item) => item.id === "videos" || item.id === "usual") : TYPES;
  const heading = <p className="text-sm font-semibold text-blumea-navy">{type ? t(TYPES.find((item) => item.id === type)!.title) : t("compare2.typeTitle")}</p>;
  const back = type && (
    <button type="button" onClick={backToTypes} className="mt-1 text-xs font-semibold text-blumea-blue hover:opacity-70">
      {t("compare2.backToTypes")}
    </button>
  );

  // ---- one video / two videos ----
  const a = videos?.find((video) => video.id === aId) ?? null;
  const b = videos?.find((video) => video.id === bId) ?? null;
  const aPlat = aPlatform ?? a?.platform ?? null;
  const platformsPresent = [...new Set((videos ?? []).map((video) => video.platform))];
  const mixed = aPlat !== null && bPlatform !== null && aPlat !== bPlatform;

  const videoGrid = (list: DashboardVideo[], selectedId: string | null, onPick: (video: DashboardVideo) => void) => (
    <div className="mt-4 grid max-h-[340px] grid-cols-2 gap-3 overflow-y-auto pe-1 sm:grid-cols-3">
      {list.map((video) => {
        const thumb = thumbOf(video);
        const selected = selectedId === video.id;
        return (
          <button
            key={video.id}
            type="button"
            onClick={() => onPick(video)}
            className={`group overflow-hidden rounded-2xl bg-white text-start transition-all ${
              selected ? "border-2 border-blumea-blue shadow-md" : "border border-slate-200 shadow-sm hover:border-blumea-blue/40 hover:shadow-md"
            }`}
          >
            <div className="relative aspect-[9/12] overflow-hidden bg-slate-100">
              {thumb && <Image src={thumb} alt="" fill unoptimized sizes="200px" className="object-cover" />}
              <div className="absolute start-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-blumea-navy shadow-sm">
                <PlatformIcon platform={video.platform as "youtube" | "tiktok"} size={11} />
                {platformLabels[video.platform as "youtube" | "tiktok"]}
              </div>
              {selected && (
                <div className="absolute end-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blumea-blue text-white shadow-sm">
                  <Check size={14} strokeWidth={2.4} />
                </div>
              )}
            </div>
            <p className="truncate p-2.5 text-xs font-semibold text-blumea-navy">{video.title}</p>
          </button>
        );
      })}
    </div>
  );

  // The small card of a video already chosen, with a way to change it.
  const chosenCard = (video: DashboardVideo, label: string, onChange: () => void) => {
    const thumb = thumbOf(video);
    return (
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-blumea-blue/30 bg-blumea-mist/60 p-2.5">
        <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
          {thumb && <Image src={thumb} alt="" fill unoptimized sizes="40px" className="object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blumea-blue">{label}</p>
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-blumea-navy">
            <PlatformIcon platform={video.platform as "youtube" | "tiktok"} size={12} />
            <span className="truncate">{video.title}</span>
          </p>
        </div>
        <button type="button" onClick={onChange} className="shrink-0 text-xs font-semibold text-blumea-blue hover:opacity-70">
          {t("compare.changeVideo")}
        </button>
      </div>
    );
  };

  const platformChoice = (onChoose: (platform: string) => void, sameAs?: string | null) => (
    <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {platformsPresent.map((platform) => (
        <button
          key={platform}
          type="button"
          onClick={() => onChoose(platform)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-blumea-navy transition-all hover:-translate-y-0.5 hover:border-blumea-blue hover:shadow-sm"
        >
          <PlatformIcon platform={platform as "youtube" | "tiktok"} size={18} />
          {platformLabels[platform as "youtube" | "tiktok"]}
          {sameAs === platform && <span className="text-xs font-normal text-blumea-slate">({t("compare.sameAsFirst")})</span>}
        </button>
      ))}
    </div>
  );

  // For "video against your other videos": one video from any platform.
  function pickForUsual(video: DashboardVideo) {
    router.push(`/compare/usual/${video.id}`);
  }

  // ---- two formats / two openings ----
  const groups = type === "format" || type === "hook" ? groupOptions(videos ?? [], type as GroupKind) : [];
  const groupName = (id: string) => (type === "format" ? formatLabel(id, t) : hookTypeLabel(id, t)) ?? id;
  const enoughGroups = groups.filter((group) => group.count >= GROUP_MIN).length >= 2;

  return (
    <Modal kicker={t("compare.pickerKicker")} title={t("compare.pickerTitle")} onClose={onClose}>
      {videos === null && <p className="mt-6 text-sm text-blumea-slate">{t("compare.loading")}</p>}

      {videos !== null && videos.length < 2 && <p className="mt-6 text-sm text-blumea-slate">{t("compare.needTwo")}</p>}

      {videos !== null && videos.length >= 2 && (
        <div className="mt-5">
          {heading}
          {back}

          {type === null && (
            <div className="mt-3 grid grid-cols-1 gap-2.5">
              {visibleTypes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => chooseType(item.id)}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 text-start transition-all hover:-translate-y-0.5 hover:border-blumea-blue hover:shadow-sm"
                >
                  <p className="text-sm font-semibold text-blumea-navy">{t(item.title)}</p>
                  <p className="mt-0.5 text-xs leading-5 text-blumea-slate">{t(item.desc)}</p>
                </button>
              ))}
            </div>
          )}

          {type === "usual" && (
            <>
              <p className="mt-2 text-xs leading-5 text-blumea-slate">{t("compare2.chooseOne")}</p>
              {videoGrid(videos, null, pickForUsual)}
            </>
          )}

          {type === "videos" && (
            <div key={`${aPlat ?? "-"}-${a ? "a" : "-"}-${bPlatform ?? "-"}`} className="blumea-expand">
              <div>
                {a && chosenCard(a, t("compare.first"), () => { setAId(null); setBId(null); setBPlatform(null); })}
                {b && chosenCard(b, t("compare.secondVideo"), () => setBId(null))}

                {/* first video: platform, then the video */}
                {!aPlat && (
                  <>
                    <p className="mt-3 text-xs font-semibold text-blumea-navy">{t("compare.pickPlatformFirst")}</p>
                    {platformChoice((platform) => setAPlatform(platform))}
                  </>
                )}
                {aPlat && !a && (
                  <>
                    <p className="mt-3 text-xs font-semibold text-blumea-navy">{t("compare.pickVideoFirst")}</p>
                    <button type="button" onClick={() => setAPlatform(null)} className="mt-1 text-xs font-semibold text-blumea-blue hover:opacity-70">
                      {t("compare.changePlatform")}
                    </button>
                    {videoGrid((videos ?? []).filter((video) => video.platform === aPlat), null, (video) => { setAId(video.id); setBId(null); setBPlatform(null); })}
                  </>
                )}

                {/* second video: platform, then the video */}
                {a && !bPlatform && (
                  <>
                    <p className="mt-3 text-xs font-semibold text-blumea-navy">{t("compare.pickPlatformSecond")}</p>
                    {platformChoice((platform) => setBPlatform(platform), a.platform)}
                  </>
                )}
                {a && bPlatform && (
                  <>
                    {!b && (
                      <>
                        <p className="mt-3 text-xs font-semibold text-blumea-navy">{t("compare.pickVideoSecond")}</p>
                        <button type="button" onClick={() => setBPlatform(null)} className="mt-1 text-xs font-semibold text-blumea-blue hover:opacity-70">
                          {t("compare.changePlatform")}
                        </button>
                        {videoGrid((videos ?? []).filter((video) => video.platform === bPlatform && video.id !== a.id), bId, (video) => setBId(video.id))}
                      </>
                    )}
                    {mixed && (
                      <p className="mt-3 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-xs leading-5 text-amber-800">
                        {t("compare.mixedNotice", { a: platformLabels[aPlat as "youtube" | "tiktok"], b: platformLabels[bPlatform as "youtube" | "tiktok"] })}
                      </p>
                    )}
                  </>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    disabled={!aId || !bId}
                    onClick={() => aId && bId && router.push(`/compare/${aId}/${bId}`)}
                    className={
                      aId && bId
                        ? "rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
                        : "cursor-not-allowed rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-400"
                    }
                  >
                    {t("compare.go")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {(type === "format" || type === "hook") && (
            <>
              {!enoughGroups ? (
                <p className="mt-3 text-sm leading-6 text-blumea-slate">{t("compare2.groupsNeed", { min: GROUP_MIN })}</p>
              ) : (
                <>
                  <p className="mt-2 text-xs leading-5 text-blumea-slate">{t("compare2.chooseGroups")}</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {groups.map((group) => {
                      const usable = group.count >= GROUP_MIN;
                      const picked = aId === group.id ? "a" : bId === group.id ? "b" : null;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          disabled={!usable}
                          onClick={() => {
                            if (picked) {
                              if (picked === "a") setAId(null);
                              else setBId(null);
                            } else if (!aId) setAId(group.id);
                            else if (!bId) setBId(group.id);
                          }}
                          className={`flex items-center justify-between rounded-2xl border p-3 text-start text-sm transition-all ${
                            picked
                              ? "border-2 border-blumea-blue bg-blumea-mist/60"
                              : usable
                                ? "border-slate-200 bg-white hover:border-blumea-blue/50"
                                : "cursor-not-allowed border-dashed border-slate-200 bg-white/60 opacity-60"
                          }`}
                        >
                          <span className="font-semibold text-blumea-navy">{groupName(group.id)}</span>
                          <span className="text-xs text-blumea-slate">{t("compare2.groupVideos", { count: group.count })}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      disabled={!aId || !bId}
                      onClick={() => aId && bId && router.push(`/compare/group/${type}/${aId}/${bId}`)}
                      className={
                        aId && bId
                          ? "rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
                          : "cursor-not-allowed rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-400"
                      }
                    >
                      {t("compare.go")}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
