"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import Image from "next/image";
import { Check } from "lucide-react";
import Modal from "@/components/Modal";
import { PlatformIcon } from "@/components/PlatformBadge";
import { useAppRouter } from "@/lib/use-app-router";
import { useProfile } from "@/components/AppShell";
import { loadDashboardData, type DashboardVideo } from "@/lib/dashboard-data";
import { groupMinFor, groupOptions } from "@/lib/compare-groups";
import { formatLabel } from "@/lib/format-library";
import { hookTypeLabel } from "@/lib/hook-library";
import { useT } from "@/lib/i18n/client";
import type { TextKey } from "@/lib/i18n/translate";
import { platformLabels } from "@/lib/mock-data";

type CompareType = "videos" | "usual" | "format" | "hook" | "hookPair" | "inFormat" | "inHook" | "platforms";

const TYPES: { id: CompareType; title: TextKey; desc: TextKey }[] = [
  { id: "videos", title: "compare2.typeVideos", desc: "compare2.typeVideosDesc" },
  { id: "usual", title: "compare2.typeUsual", desc: "compare2.typeUsualDesc" },
  { id: "format", title: "compare2.typeFormat", desc: "compare2.typeFormatDesc" },
  { id: "hook", title: "compare2.typeHooks", desc: "compare2.typeHooksDesc" },
  { id: "platforms", title: "compare2.typePlatforms", desc: "compare2.typePlatformsDesc" },
];

// The ways to compare hooks (the "hook" entry of the list opens these).
const HOOK_OPTIONS: { id: CompareType; title: TextKey; desc: TextKey }[] = [
  { id: "hookPair", title: "compare2.typeHookPair", desc: "compare2.typeHookPairDesc" },
  { id: "inFormat", title: "compare2.typeInFormat", desc: "compare2.typeInFormatDesc" },
  { id: "inHook", title: "compare2.typeInHook", desc: "compare2.typeInHookDesc" },
];
const HOOK_FLOWS: CompareType[] = ["hookPair", "inFormat", "inHook"];

function thumbOf(video: DashboardVideo): string | null {
  return video.platform === "youtube" ? `https://i.ytimg.com/vi/${video.platformVideoId}/maxresdefault.jpg` : video.thumbnailUrl;
}

// Choose what to compare, then what exactly: two videos, one video against the creator's
// usual, two formats or openings, or the platforms. Opened from a video's own page, that
// video is already chosen (two videos, or against the usual).
export default function ComparePicker({ onClose, initialA }: { onClose: () => void; initialA?: string }) {
  const t = useT();
  const router = useAppRouter();
  const profile = useProfile();
  const free = profile.plan !== "pro" && profile.plan !== "owner";
  const [videos, setVideos] = useState<DashboardVideo[] | null>(null);
  const [type, setType] = useState<CompareType | null>(null);
  // A free creator who picks a Pro-only way of comparing is told at once, before choosing anything.
  const [lockedType, setLockedType] = useState<CompareType | null>(null);
  const [aId, setAId] = useState<string | null>(initialA ?? null);
  const [bId, setBId] = useState<string | null>(null);
  // The platform chosen for each of the two videos (video vs video picks the platform first).
  const [aPlatform, setAPlatform] = useState<string | null>(null);
  const [bPlatform, setBPlatform] = useState<string | null>(null);
  // Hook vs hook: "all" formats or one format (null = not chosen yet).
  const [hookFormat, setHookFormat] = useState<string | null>(null);
  // Same hook type: the hook chosen first (then, optionally, a format).
  const [chosenHook, setChosenHook] = useState<string | null>(null);

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
    setHookFormat(null);
    setChosenHook(null);
  }

  function chooseType(next: CompareType) {
    if (free && next !== "videos") {
      setLockedType(next);
      return;
    }
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
    setHookFormat(null);
    setChosenHook(null);
  }

  const visibleTypes = initialA ? TYPES.filter((item) => item.id === "videos" || item.id === "usual") : TYPES;
  const inHookFlow = type !== null && HOOK_FLOWS.includes(type);
  const titleOf = (id: CompareType) => [...TYPES, ...HOOK_OPTIONS].find((item) => item.id === id)!.title;
  const heading = <p className="text-sm font-semibold text-blumea-navy">{lockedType ? t(titleOf(lockedType)) : type ? t(titleOf(inHookFlow ? "hook" : type)) : t("compare2.typeTitle")}</p>;
  // Back from a way of comparing hooks goes to the hook options; from anything else to the list.
  function backToHookOptions() {
    setType("hook");
    setAId(null);
    setBId(null);
    setAPlatform(null);
    setBPlatform(null);
    setHookFormat(null);
    setChosenHook(null);
  }
  const lockedPanel = lockedType && (
    <div className="blumea-step mt-3">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blumea-mist text-blumea-blue">
          <Lock size={18} strokeWidth={1.8} />
        </div>
        <h2 className="mt-3 text-lg font-semibold text-blumea-navy">{t("compare.pickerLockedTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-blumea-slate">{t("compare.pickerLockedBody")}</p>
      </div>
      <button type="button" onClick={() => setLockedType(null)} className="mt-3 text-xs font-semibold text-blumea-blue hover:opacity-70">
        {t("compare2.backToTypes")}
      </button>
    </div>
  );
  const back = !lockedType && type && (
    <button type="button" onClick={inHookFlow ? backToHookOptions : backToTypes} className="mt-1 text-xs font-semibold text-blumea-blue hover:opacity-70">
      {inHookFlow ? t("compare2.backToHookOptions") : t("compare2.backToTypes")}
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

  // ---- formats and hooks ----
  const formatChoices = aPlatform ? groupOptions(videos ?? [], "format", aPlatform) : [];
  const hookChoices = aPlatform ? groupOptions(videos ?? [], "hook", aPlatform) : [];
  // The groups that can be set against each other: formats (4 videos each), or the hooks of one format (2 each).
  const groups = type === "format" ? formatChoices : type === "hookPair" ? hookChoices : type === "inFormat" && hookFormat && aPlatform ? groupOptions(videos ?? [], "hook", aPlatform, hookFormat) : [];
  const groupName = (id: string) => (type === "format" ? formatLabel(id, t) : hookTypeLabel(id, t)) ?? id;
  const groupMin = groupMinFor(type === "format" ? "format" : "hook");
  const enoughGroups = groups.filter((group) => group.count >= groupMin).length >= 2;
  // The formats a chosen hook was used in.
  const formatsOfHook = (() => {
    if (!aPlatform || !chosenHook) return [];
    const counts = new Map<string, number>();
    for (const video of videos ?? []) {
      if (video.platform === aPlatform && video.analyzed && video.hookTypeId === chosenHook && video.formatId) counts.set(video.formatId, (counts.get(video.formatId) ?? 0) + 1);
    }
    return [...counts.entries()].map(([id, count]) => ({ id, count })).sort((x, y) => y.count - x.count);
  })();

  // A list of groups (formats or hooks) with their number of analyzed videos; the ones with too few are shown but cannot be chosen.
  const groupList = (list: { id: string; count: number }[], min: number, name: (id: string) => string, onPick: (id: string) => void, pickedIds: (string | null)[] = []) => (
    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {list.map((group) => {
        const usable = group.count >= min;
        const picked = pickedIds.includes(group.id);
        return (
          <button
            key={group.id}
            type="button"
            disabled={!usable}
            onClick={() => onPick(group.id)}
            className={`flex items-center justify-between gap-2 rounded-2xl border p-3 text-start text-sm transition-all ${
              picked ? "border-2 border-blumea-blue bg-blumea-mist/60" : usable ? "border-slate-200 bg-white hover:border-blumea-blue/50" : "cursor-not-allowed border-dashed border-slate-200 bg-white/60 opacity-60"
            }`}
          >
            <span className="font-semibold text-blumea-navy">{name(group.id)}</span>
            <span className="text-xs text-blumea-slate">{usable ? t("compare2.groupVideos", { count: group.count }) : t("compare2.groupNeedsMin", { count: group.count, min })}</span>
          </button>
        );
      })}
    </div>
  );
  const goButton = (enabled: boolean, onGo: () => void) => (
    <div className="mt-5 flex justify-end">
      <button
        type="button"
        disabled={!enabled}
        onClick={onGo}
        className={
          enabled
            ? "rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
            : "cursor-not-allowed rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-400"
        }
      >
        {t("compare.go")}
      </button>
    </div>
  );
  const changeLink = (label: string, onClick: () => void) => (
    <button type="button" onClick={onClick} className="mt-1 text-xs font-semibold text-blumea-blue hover:opacity-70">
      {label}
    </button>
  );
  // Not enough analyzed videos: back to analyzing videos.
  const analyzeMore = (
    <button
      type="button"
      onClick={() => router.push("/analyze")}
      className="mt-3 rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
    >
      {t("compare2.analyzeMore")}
    </button>
  );
  const pickPair = (id: string) => {
    if (aId === id) setAId(null);
    else if (bId === id) setBId(null);
    else if (!aId) setAId(id);
    else if (!bId) setBId(id);
  };

  return (
    <Modal kicker={t("compare.pickerKicker")} title={t("compare.pickerTitle")} onClose={onClose}>
      {videos === null && <p className="mt-6 text-sm text-blumea-slate">{t("compare.loading")}</p>}

      {videos !== null && videos.length < 2 && <p className="mt-6 text-sm text-blumea-slate">{t("compare.needTwo")}</p>}

      {videos !== null && videos.length >= 2 && (
        <div className="mt-5">
          {heading}
          {back}

          {lockedPanel}

          {type === null && !lockedType && (
            <div className="blumea-step mt-3 grid grid-cols-1 gap-2.5">
              {visibleTypes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => chooseType(item.id)}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 text-start transition-all hover:-translate-y-0.5 hover:border-blumea-blue hover:shadow-sm"
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-blumea-navy">
                    {t(item.title)}
                    {free && item.id !== "videos" && <span className="rounded-full bg-blumea-mist px-2 py-0.5 text-[10px] font-semibold text-blumea-blue">{t("compare.proTag")}</span>}
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-blumea-slate">{t(item.desc)}</p>
                </button>
              ))}
            </div>
          )}

          {type === "usual" && (
            <div key={aPlatform ?? "-"} className="blumea-step">
              {!aPlatform ? (
                <>
                  <p className="mt-3 text-xs font-semibold text-blumea-navy">{t("compare.pickPlatformOne")}</p>
                  {platformChoice((platform) => setAPlatform(platform))}
                </>
              ) : (
                <>
                  <p className="mt-3 text-xs font-semibold text-blumea-navy">{t("compare2.chooseOne")}</p>
                  <button type="button" onClick={() => setAPlatform(null)} className="mt-1 text-xs font-semibold text-blumea-blue hover:opacity-70">
                    {t("compare.changePlatform")}
                  </button>
                  {videoGrid((videos ?? []).filter((video) => video.platform === aPlatform), null, pickForUsual)}
                </>
              )}
            </div>
          )}

          {type === "videos" && (
            <div>
              {a && <div className="blumea-step">{chosenCard(a, t("compare.first"), () => { setAId(null); setBId(null); setBPlatform(null); })}</div>}
              {b && <div className="blumea-step">{chosenCard(b, t("compare.secondVideo"), () => setBId(null))}</div>}

              <div key={`${aPlat ?? "-"}-${a ? "a" : "-"}-${bPlatform ?? "-"}`} className="blumea-step">
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

          {type === "hook" && (
            <div className="blumea-step mt-3 grid grid-cols-1 gap-2.5">
              {HOOK_OPTIONS.map((item) => (
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

          {(type === "format" || type === "hookPair" || type === "inFormat" || type === "inHook") && (
            <div key={`${aPlatform ?? "-"}-${hookFormat ?? "-"}-${chosenHook ?? "-"}`} className="blumea-step">
              {!aPlatform ? (
                <>
                  <p className="mt-3 text-xs font-semibold text-blumea-navy">{t("compare.pickPlatformOne")}</p>
                  {platformChoice((platform) => {
                    setAPlatform(platform);
                    setAId(null);
                    setBId(null);
                  })}
                </>
              ) : type === "format" ? (
                <>
                  <p className="mt-3 text-xs leading-5 text-blumea-slate">{t(enoughGroups ? "compare2.chooseGroups" : "compare2.formatNeedTwo", { min: groupMin })}</p>
                  {changeLink(t("compare.changePlatform"), () => setAPlatform(null))}
                  {groupList(groups, groupMin, groupName, pickPair, [aId, bId])}
                  {enoughGroups ? goButton(Boolean(aId && bId), () => aId && bId && router.push(`/compare/group/format/${aPlatform}/${aId}/${bId}`)) : analyzeMore}
                </>
              ) : type === "hookPair" ? (
                <>
                  <p className="mt-3 text-xs leading-5 text-blumea-slate">{t(enoughGroups ? "compare2.chooseGroups" : "compare2.hookNeedTwo", { min: groupMin })}</p>
                  {changeLink(t("compare.changePlatform"), () => setAPlatform(null))}
                  {groupList(groups, groupMin, groupName, pickPair, [aId, bId])}
                  {enoughGroups ? goButton(Boolean(aId && bId), () => aId && bId && router.push(`/compare/group/hook/${aPlatform}/${aId}/${bId}`)) : analyzeMore}
                </>
              ) : type === "inFormat" && hookFormat === null ? (
                <>
                  <p className="mt-3 text-xs font-semibold text-blumea-navy">{t("compare2.pickFormatFirst")}</p>
                  {changeLink(t("compare.changePlatform"), () => setAPlatform(null))}
                  {groupList(formatChoices, 1, (id) => formatLabel(id, t) ?? id, (id) => setHookFormat(id))}
                </>
              ) : type === "inFormat" ? (
                <>
                  <p className="mt-3 text-sm font-semibold text-blumea-navy">{t("compare2.inFormatWhat", { format: formatLabel(hookFormat as string, t) ?? (hookFormat as string) })}</p>
                  {changeLink(t("compare2.changeFormat"), () => { setHookFormat(null); setAId(null); setBId(null); })}
                  <button
                    type="button"
                    onClick={() => router.push(`/compare/hooks/${aPlatform}/${hookFormat}`)}
                    className="mt-3 w-full rounded-2xl border border-blumea-blue/30 bg-blumea-mist/50 p-3 text-start text-sm font-semibold text-blumea-navy transition-all hover:border-blumea-blue"
                  >
                    {t("compare2.whichBestHook", { format: formatLabel(hookFormat as string, t) ?? (hookFormat as string) })}
                  </button>
                  <p className="mt-5 text-xs leading-5 text-blumea-slate">{t(enoughGroups ? "compare2.chooseTwoHooks" : "compare2.hookNeedTwo", { min: groupMin })}</p>
                  {groupList(groups, groupMin, groupName, pickPair, [aId, bId])}
                  {enoughGroups ? goButton(Boolean(aId && bId), () => aId && bId && router.push(`/compare/hooks/${aPlatform}/${hookFormat}/${aId}/${bId}`)) : analyzeMore}
                </>
              ) : chosenHook === null ? (
                <>
                  <p className="mt-3 text-xs font-semibold text-blumea-navy">{t("compare2.pickHookFirst")}</p>
                  {changeLink(t("compare.changePlatform"), () => setAPlatform(null))}
                  {groupList(hookChoices, 2, (id) => hookTypeLabel(id, t) ?? id, (id) => setChosenHook(id))}
                  {!hookChoices.some((group) => group.count >= 2) && analyzeMore}
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm font-semibold text-blumea-navy">{t("compare2.inHookWhat", { hook: hookTypeLabel(chosenHook, t) ?? chosenHook })}</p>
                  {changeLink(t("compare2.changeHook"), () => setChosenHook(null))}
                  <button
                    type="button"
                    onClick={() => router.push(`/compare/inside/${aPlatform}/${chosenHook}`)}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-3 text-start text-sm font-semibold text-blumea-navy transition-all hover:border-blumea-blue"
                  >
                    {t("compare2.allFormats")}
                  </button>
                  {formatsOfHook.length > 0 && groupList(formatsOfHook, 1, (id) => formatLabel(id, t) ?? id, (id) => router.push(`/compare/inside/${aPlatform}/${chosenHook}/${id}`))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
