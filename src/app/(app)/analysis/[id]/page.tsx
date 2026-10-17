"use client";

import { use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import AppLink from "@/components/AppLink";
import { notFound } from "next/navigation";
import { useAppRouter } from "@/lib/use-app-router";
import {
  ArrowLeft,
  Bookmark,
  Check,
  Clock3,
  Compass,
  Eye,
  GitCompareArrows,
  Heart,
  Info,
  Lightbulb,
  Lock,
  MessageCircle,
  ExternalLink,
  Music2,
  Play,
  Repeat2,
  Share2,
  Sparkles,
  TrendingDown,
  UploadCloud,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import EvidencePlayer from "@/components/EvidencePlayer";
import ComparePicker from "@/components/ComparePicker";
import CompareModal from "@/components/CompareModal";
import UploadModal from "@/components/UploadModal";
import PlatformBadge, { ModeBadge } from "@/components/PlatformBadge";
import { supabase } from "@/lib/supabase";
import { useMockStore } from "@/lib/mock-store";
import { formatCount, formatTime } from "@/lib/format";
import {
  payoffAfterAvgWatchRule,
  biggestDropRule,
  noTextInFirst3sExperiment,
  noCaptionsOnSpeechExperiment,
  weakOpeningRule,
  strongHookRule,
  commentOutlierRule,
  type CommentBaseline,
  stayedToWatchPct,
  type KeyMoment,
  type OnScreenText,
  type OpeningBaseline,
} from "@/lib/insight-rules";
import { loadCommentBaseline, loadOpeningBaseline } from "@/lib/baseline";
import { useT } from "@/lib/i18n/client";
import { Num, rich } from "@/lib/i18n/rich";
import type { TextKey, Translator } from "@/lib/i18n/translate";
import { ANALYTICS_LAG_DAYS, platformHas, platformName, viewerBehaviorNote } from "@/lib/platform-capabilities";
import {
  PAYOFF_FORMATS,
  categoryLabel,
  formatLabel,
  friendlyFormatLabel,
  layoutLabel,
  styleTags,
} from "@/lib/format-library";
import { familiarLabel, hookTypeLabel } from "@/lib/hook-library";
import TiktokViewerCard, { type SavedTiktokScreens } from "@/components/TiktokViewerCard";
import {
  biggestDrop,
  formatPublished,
  getAnalysis,
  getVideo,
  seedAnalyzedIds,
  type Confidence,
  type Moment,
  type Recommendation,
  type ResolvedAnalysis,
  type Video,
} from "@/lib/mock-data";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Real, non-mock videos: what's shown here is only what's actually been built
// (the AI reading + real platform metrics). No recommendations, comparisons or
// behavior cards -- those need the rule engine and viewer-behavior data that
// don't exist yet (Insight_Engine_Spec.md §5-§8, principle 4: silence beats a
// weak claim), so they're left out rather than faked.
// Order matters: Category, Format, how it's shown, Style, Content come first
// (the owner's card structure, 2026-10-06), then the rest of what was read.
const REAL_FIELD_IDS = [
  "categories",
  "format",
  "layout",
  "hook_style",
  "hook_type",
  "familiar_moment",
  "topic",
  "subtitles_detected",
  "on_screen_texts",
  "spoken_hook_text",
  "sung_hook_lyrics",
  "call_to_action",
  "visual_hook",
  "setting",
  "sound_kind",
  "speech_language",
  "music_description",
  "sound_candidate",
  "known_format_or_trend",
  "subject_specific",
];

// Shown instead of the "Viewer behavior" section when there is none, and says
// why: the platform doesn't share it, or it is simply too early (principle 4:
// silence is fine, but an unexplained gap looks like a bug).
function ViewerBehaviorUnavailable({ platform, publishedAt }: { platform: string; publishedAt: string | null }) {
  const t = useT();
  const platformNote = !platformHas(platform, "avgWatch") ? viewerBehaviorNote(platform, t) : null;
  const [now] = useState(() => Date.now());
  const ageDays = publishedAt ? (now - new Date(publishedAt).getTime()) / 86_400_000 : null;
  const tooEarly = ageDays !== null && ageDays < ANALYTICS_LAG_DAYS;

  const message =
    platformNote ??
    (tooEarly
      ? t("analysis.needsDays", { platform: platformName(platform, t) })
      : t("analysis.notReported", { platform: platformName(platform, t) }));

  return (
    <section className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4">
      <div className="flex items-center gap-2 text-blumea-slate">
        <Clock3 size={16} strokeWidth={1.8} className="text-blumea-blue" />
        <span className="text-sm font-semibold">{t("analysis.howViewersWatched")}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-blumea-slate">{message}</p>
    </section>
  );
}

// Wording for the baseline a video is compared with: the whole channel, or --
// once a format has enough other videos -- that format's own cohort.
function vsPhrase(baseline: OpeningBaseline | null, median: number, t: Translator): string {
  const label = baseline?.scopeFormatId ? formatLabel(baseline.scopeFormatId, t) : null;
  const pct = `${Math.round(median)}%`;
  return label ? t("analysis.vsCohort", { label: label.toLowerCase(), median: pct }) : t("analysis.vsUsual", { median: pct });
}

function cohortNoun(baseline: OpeningBaseline | null, t: Translator): string {
  const label = baseline?.scopeFormatId ? formatLabel(baseline.scopeFormatId, t) : null;
  return label ? t("analysis.cohortNoun", { label: label.toLowerCase() }) : t("analysis.cohortNounAll");
}

type RealAnalyzedField = { value: unknown; kind: "fact" | "inferred"; confidence: Confidence };

type RetentionPoint = { elapsedRatio: number; watchRatio: number };

type TrafficSourceRow = { source: string; label: string; views: number };
type SubscribedStatusRow = { subscribed: boolean; views: number; avgViewDurationSec: number };
type Breakdowns = {
  trafficSource?: TrafficSourceRow[];
  subscribedStatus?: SubscribedStatusRow[];
  engagement?: { views: number; engagedViews: number };
} | null;

type RealVideoData = {
  platformVideoId: string;
  tiktokScreens: SavedTiktokScreens | null;
  title: string;
  platform: "youtube" | "tiktok" | string;
  publishedAt: string | null;
  durationSec: number | null;
  metrics: { views: number | null; likes: number | null; comments: number | null; shares: number | null } | null;
  avgWatchSec: number | null;
  retentionCurve: RetentionPoint[] | null;
  breakdowns: Breakdowns;
  baseline: OpeningBaseline | null;
  commentBaseline: CommentBaseline | null;
  fields: Record<string, RealAnalyzedField> | null;
};

// Largest single-point fall in the retention curve -- the same
// "biggest drop" idea as the mock page's behavior card, but from real YouTube
// Analytics data (doc/Insight_Engine_Spec.md §3.3's payoff/drop signals).
function biggestRetentionDrop(curve: RetentionPoint[] | null, durationSec: number | null): number | null {
  if (!curve || curve.length < 2 || !durationSec) return null;

  let worst = { at: -1, fall: 0 };
  for (let i = 1; i < curve.length; i += 1) {
    const fall = curve[i - 1].watchRatio - curve[i].watchRatio;
    if (fall > worst.fall) worst = { at: curve[i].elapsedRatio, fall };
  }

  return worst.at >= 0 ? Math.round(worst.at * durationSec) : null;
}

// Returns one string per line to display. on_screen_texts gets its own line per
// distinct text (joining them with a separator made two unrelated things --
// e.g. a caption and a sung lyric that also appears burned in -- read as one
// run-on sentence).
function formatFieldLines(
  field: string,
  value: unknown,
  fields: Record<string, RealAnalyzedField> | null,
  t: Translator
): string[] | null {
  // The owner's card (2026-10-06): Category / Format (+ "also fits") / How it's
  // shown / Style tags / Content. These read other fields too, so they are
  // built here instead of from the single value.
  const categoryIds = (fields?.categories?.value as string[] | undefined) ?? null;
  if (field === "categories") {
    const labels = (categoryIds ?? []).map((id) => categoryLabel(id, t));
    return labels.length ? [labels.join(" · ")] : null;
  }
  if (field === "format") {
    const base = friendlyFormatLabel(value as string | null, categoryIds, t);
    if (!base) return null;
    const alsoId = fields?.format_secondary?.value as string | null | undefined;
    const also = alsoId ? formatLabel(alsoId, t) : null;
    return [also ? t("analysis.alsoFits", { base, also }) : base];
  }
  if (field === "layout") {
    const label = layoutLabel(value as string | null, t);
    return label ? [label] : null;
  }
  if (field === "hook_style") {
    const tags = styleTags(
      {
        soundRole: fields?.sound_role?.value as string | null | undefined,
        hookStyle: value as string | null,
      },
      t
    );
    return tags.length ? [tags.join(" · ")] : null;
  }
  if (field === "hook_type") {
    const label = hookTypeLabel(value as string | null, t);
    if (!label) return null;
    const alsoLabel = hookTypeLabel(fields?.hook_type_runner_up?.value as string | null | undefined, t);
    return [alsoLabel ? t("analysis.alsoFits", { base: label, also: alsoLabel }) : label];
  }
  if (field === "familiar_moment") {
    const label = value === "none" ? null : familiarLabel(value as string | null, t);
    return label ? [label] : null;
  }
  if (field === "call_to_action") {
    const ask = value as { type?: string; text?: string } | null;
    if (!ask?.type) return null;
    const what = (type: string) => t(`analysis.cta.${type in { comment_question: 1, comment_invite: 1, follow: 1, like_or_share: 1, tag_friend: 1, link_or_buy: 1, other: 1 } ? type : "generic"}` as TextKey);
    return [ask.text ? `${what(ask.type)}: “${ask.text.replace(/\s+/g, " ").trim()}”` : what(ask.type)];
  }
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (field === "on_screen_texts") {
      const texts = value
        .map((item) => (typeof item === "object" && item && "text" in item ? String((item as { text: unknown }).text) : String(item)))
        .filter(Boolean);
      return texts.length ? texts : null;
    }
    return [value.map(String).join(", ")];
  }
  if (typeof value === "boolean") return [value ? t("analysis.yes") : t("analysis.no")];
  if (field === "sound_kind" && typeof value === "string" && t.has(`library.sound.${value}`)) return [t(`library.sound.${value}` as TextKey)];
  if (field === "speech_language" && typeof value === "string" && t.has(`library.lang.${value}`)) return [t(`library.lang.${value}` as TextKey)];
  const text = String(value).trim();
  if (!text) return null;
  return [field === "sound_candidate" ? t("analysis.maybe", { text }) : text];
}

// One "worth testing" / rule-engine statement card -- consistent shell for
// every insight-rules.ts result, each with its own evidence disclaimer
// (Insight_Engine_Spec.md principle 5: "always say how many videos a claim
// rests on").
function InsightCard({
  children,
  disclaimer,
  keep = false,
}: {
  children: ReactNode;
  disclaimer: string;
  keep?: boolean;
}) {
  const Icon = keep ? Check : Lightbulb;
  return (
    <div className="rounded-2xl border border-blumea-blue/25 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Icon
          size={18}
          strokeWidth={keep ? 2.2 : 1.8}
          className={`mt-0.5 shrink-0 ${keep ? "text-blumea-success" : "text-blumea-blue"}`}
        />

        <div>
          {children}
          <p className="mt-3 text-xs text-blumea-slate">{disclaimer}</p>
        </div>
      </div>
    </div>
  );
}

function RealVideoAnalysis({ id }: { id: string }) {
  const t = useT();
  const [compareOpen, setCompareOpen] = useState(false);
  const [data, setData] = useState<RealVideoData | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: video } = await supabase
        .from("videos")
        .select("title, platform, platform_video_id, published_at, duration_sec")
        .eq("id", id)
        .maybeSingle();

      if (!video) {
        if (!cancelled) setData(null);
        return;
      }

      const [{ data: metric }, { data: profile }] = await Promise.all([
        supabase
          .from("video_metric_snapshots")
          .select("views, likes, comments, shares, avg_watch_sec, retention_curve, breakdowns")
          .eq("video_id", id)
          .order("captured_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("video_ai_profiles")
          .select("fields")
          .eq("video_id", id)
          .eq("is_current", true)
          .maybeSingle(),
      ]);

      // Needs the video's format (to prefer a same-format cohort), so it runs after the profile.
      const formatValue = (profile?.fields as Record<string, { value?: unknown }> | null)?.format?.value;
      const baseline =
        video.platform === "youtube"
          ? await loadOpeningBaseline(id, typeof formatValue === "string" ? formatValue : null)
          : null;
      const commentBaseline = video.platform === "youtube" ? await loadCommentBaseline(id) : null;

      // TikTok gives apps no watch time. If the creator shared screenshots of the
      // video's TikTok analytics, the numbers read from them live in an older
      // snapshot (the daily sync adds newer ones without them): fetch that one.
      const { data: screensRow } =
        video.platform === "tiktok"
          ? await supabase
              .from("video_metric_snapshots")
              .select("breakdowns")
              .eq("video_id", id)
              .not("breakdowns->tiktokScreens", "is", null)
              .order("captured_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          : { data: null };
      const tiktokScreens =
        ((screensRow?.breakdowns as { tiktokScreens?: SavedTiktokScreens } | null)?.tiktokScreens as SavedTiktokScreens | undefined) ?? null;

      if (!cancelled) {
        setData({
          platformVideoId: video.platform_video_id,
          tiktokScreens,
          title: video.title,
          platform: video.platform,
          publishedAt: video.published_at,
          durationSec: video.duration_sec,
          metrics: metric ?? null,
          // TikTok: never mix the screenshot numbers into the YouTube-style sections.
          avgWatchSec: video.platform === "tiktok" ? null : (metric?.avg_watch_sec ?? null),
          retentionCurve: video.platform === "tiktok" ? null : ((metric?.retention_curve as RetentionPoint[] | null) ?? null),
          breakdowns: video.platform === "tiktok" ? null : ((metric?.breakdowns as Breakdowns) ?? null),
          baseline,
          commentBaseline,
          fields: (profile?.fields as Record<string, RealAnalyzedField>) ?? null,
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (data === undefined) {
    return <div className="mx-auto w-full max-w-3xl py-20 text-center text-blumea-slate">{t("analysis.loading")}</div>;
  }

  if (data === null) {
    notFound();
  }

  const identityRows = data.fields
    ? REAL_FIELD_IDS
        .map((field) => ({
          field,
          label: t(`analysis.fieldLabel.${field}` as TextKey),
          lines: formatFieldLines(field, data.fields![field]?.value, data.fields, t),
          confidence: data.fields![field]?.confidence,
        }))
        .filter((row): row is typeof row & { lines: string[] } => row.lines !== null)
    : [];

  // TikTok only, a platform fact (Insight_Engine_Spec.md §3.2 tier P) from the
  // official oEmbed endpoint -- not an AI guess, so it's shown separately from
  // identityRows rather than folded into that generic, AI-field-only loop.
  const platformSoundRaw = data.fields?.platform_sound?.value as
    | { label: string; url: string; soundId: string | null }
    | undefined;

  // Rule-engine statements (Insight_Engine_Spec.md §5.1/§5.2). Pure trigger
  // logic lives in src/lib/insight-rules.ts; the phrasing below is the
  // template, filled with real stored numbers only -- never a causal word
  // (§10). All of these are allowed from video one (no baseline minimum).
  const keyMoments = (data.fields?.key_moments?.value as KeyMoment[] | undefined) ?? null;

  // Only for videos built around a reveal: elsewhere there is no reliable "peak" to point at.
  const ownFormat = data.fields?.format?.value as string | undefined;
  const payoffInsight =
    ownFormat && PAYOFF_FORMATS.includes(ownFormat)
      ? payoffAfterAvgWatchRule({ durationSec: data.durationSec, avgWatchSec: data.avgWatchSec, keyMoments })
      : null;

  const biggestDropInsight = biggestDropRule({
    durationSec: data.durationSec,
    retentionCurve: data.retentionCurve,
    keyMoments,
  });

  // The video's format (format library, §3.5) decides where text-based rules
  // apply at all; a video analyzed before the library existed has no valid
  // format id here, so those rules stay silent for it.
  const formatId = (data.fields?.format?.value as string | undefined) ?? null;
  const layoutId = (data.fields?.layout?.value as string | undefined) ?? null;

  const noTextExperiment = noTextInFirst3sExperiment(
    (data.fields?.on_screen_texts?.value as OnScreenText[] | undefined) ?? null,
    formatId,
    layoutId
  );

  const noCaptionsExperiment = noCaptionsOnSpeechExperiment({
    subtitlesDetected: (data.fields?.subtitles_detected?.value as boolean | undefined) ?? null,
    spokenHookText: (data.fields?.spoken_hook_text?.value as string | undefined) ?? null,
    formatId,
    layoutId,
  });

  const stayedPct = stayedToWatchPct(data.breakdowns?.engagement);
  const openingInputs = {
    stayedPct,
    baseline: data.baseline,
    onScreenTexts: (data.fields?.on_screen_texts?.value as OnScreenText[] | undefined) ?? null,
    spokenHookText: (data.fields?.spoken_hook_text?.value as string | null | undefined) ?? null,
    sungHookLyrics: (data.fields?.sung_hook_lyrics?.value as string | null | undefined) ?? null,
  };
  const weakOpeningInsight = weakOpeningRule({
    stayedPct: openingInputs.stayedPct,
    baseline: openingInputs.baseline,
    onScreenTexts: openingInputs.onScreenTexts,
    formatId,
    layoutId,
  });
  const strongHookInsight = strongHookRule(openingInputs);
  // §4: under 1,000 views a video's numbers are noisy -- say so on any claim
  // that compares it to the creator's usual.
  const smallNumbersNote =
    data.metrics?.views !== null && data.metrics?.views !== undefined && data.metrics.views < 1000
      ? t("analysis.smallNumbers")
      : "";

  const experimentInsights = [noTextExperiment, noCaptionsExperiment].filter(
    (e): e is NonNullable<typeof e> => e !== null
  );

  const commentOutlierInsight = commentOutlierRule({
    views: data.metrics?.views ?? null,
    comments: data.metrics?.comments ?? null,
    baseline: data.commentBaseline,
    onScreenTexts: openingInputs.onScreenTexts,
  });

  const hasAnyInsight =
    commentOutlierInsight ||
    payoffInsight || biggestDropInsight || weakOpeningInsight || strongHookInsight || experimentInsights.length > 0;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <AppLink
        href="/content"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
      >
        <ArrowLeft size={16} className="rtl:rotate-180" />
        {t("analysis.back")}
      </AppLink>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">
        {data.title}
      </h1>

      <p className="mt-2 text-sm text-blumea-slate">
        {data.publishedAt
          ? new Date(data.publishedAt).toLocaleDateString(t.locale === "he" ? "he-IL" : "en-US", { month: "short", day: "numeric", year: "numeric" })
          : "—"}
        {data.durationSec ? ` · ${t("analysis.secondsShort", { count: data.durationSec })}` : ""}
      </p>

      <button
        type="button"
        onClick={() => setCompareOpen(true)}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-blumea-navy transition-colors hover:border-blumea-blue hover:text-blumea-blue"
      >
        <GitCompareArrows size={16} strokeWidth={1.8} />
        {t("compare.openCompare")}
      </button>

      {data.metrics && (() => {
        // What each platform actually gives comes from platform-capabilities.ts;
        // a metric it doesn't give is marked, never faked or left as a blank.
        const platformLabel = platformName(data.platform, t);
        const metricCards = [
          { label: t("analysis.views"), value: data.metrics.views, icon: Eye, unavailable: false },
          { label: t("analysis.likes"), value: data.metrics.likes, icon: Heart, unavailable: false },
          { label: t("analysis.comments"), value: data.metrics.comments, icon: MessageCircle, unavailable: false },
          { label: t("analysis.shares"), value: platformHas(data.platform, "shares") ? data.metrics.shares : null, icon: Share2, unavailable: !platformHas(data.platform, "shares") },
          // No connected platform gives saves today (Instagram will, once connected).
          { label: t("analysis.saves"), value: null, icon: Bookmark, unavailable: true },
          // "Reposts" isn't a separate TikTok metric (it's folded into shares there).
          ...(data.platform === "tiktok" ? [] : [{ label: t("analysis.reposts"), value: null, icon: Repeat2, unavailable: true }]),
        ];

        return (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {metricCards.map((metric) => (
              <div
                key={metric.label}
                className={`rounded-2xl border p-4 shadow-sm ${
                  metric.unavailable ? "border-dashed border-slate-200 bg-white/60" : "border-slate-200/70 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 text-blumea-slate">
                  <metric.icon size={16} strokeWidth={1.8} className="text-blumea-blue" />
                  <span className="text-sm">{metric.label}</span>
                </div>
                {metric.unavailable ? (
                  <p className="mt-3 text-sm text-blumea-slate">{t("analysis.notAvailableOn", { platform: platformLabel })}</p>
                ) : (
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-blumea-navy">
                    {metric.value === null ? "—" : formatCount(metric.value)}
                  </p>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      {data.platform === "tiktok" && (
        <TiktokViewerCard platformVideoId={data.platformVideoId} stats={data.tiktokScreens} durationSec={data.durationSec} />
      )}

      {data.platform !== "tiktok" && data.avgWatchSec === null && !data.breakdowns && (
        <ViewerBehaviorUnavailable platform={data.platform} publishedAt={data.publishedAt} />
      )}

      {(data.avgWatchSec !== null || data.breakdowns) && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight text-blumea-navy">
            {t("analysis.viewerBehavior")}
          </h2>

          <p className="mt-1 text-sm text-blumea-slate">
            {t("analysis.onlyYou")}
          </p>

          {data.avgWatchSec !== null && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-blumea-slate">
                <Clock3 size={16} strokeWidth={1.8} className="text-blumea-blue" />
                <span className="text-sm">{t("analysis.averageWatch")}</span>
              </div>

              <p className="mt-3 text-lg font-semibold leading-6 text-blumea-navy">
                {formatTime(data.avgWatchSec)}
              </p>

              {data.durationSec && (
                <p className="mt-1 text-sm text-blumea-slate">{t("analysis.ofVideo", { count: data.durationSec })}</p>
              )}
            </div>

            {(() => {
              const dropAt = biggestRetentionDrop(data.retentionCurve, data.durationSec);
              return (
                <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-blumea-slate">
                    <TrendingDown size={16} strokeWidth={1.8} className="text-blumea-blue" />
                    <span className="text-sm">{t("analysis.biggestDrop")}</span>
                  </div>

                  {dropAt !== null ? (
                    <p className="mt-3 text-lg font-semibold leading-6 text-blumea-navy">
                      {t("analysis.around", { time: formatTime(dropAt) })}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-blumea-slate">{t("analysis.notEnough")}</p>
                  )}
                </div>
              );
            })()}

            {stayedPct !== null && (
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:col-span-2">
                <div className="flex items-center gap-2 text-blumea-slate">
                  <Eye size={16} strokeWidth={1.8} className="text-blumea-blue" />
                  <span className="text-sm">{t("analysis.stayed")}</span>
                </div>

                <p className="mt-3 text-lg font-semibold leading-6 text-blumea-navy">
                  <span className="ltr-island">≈ {Math.round(stayedPct)}%</span>
                </p>

                <p className="mt-1 text-sm text-blumea-slate">
                  {t("analysis.stayedNote")}
                </p>
              </div>
            )}
          </div>
          )}

          {data.breakdowns?.trafficSource && (
            <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-blumea-slate">
                <Compass size={16} strokeWidth={1.8} className="text-blumea-blue" />
                <span className="text-sm">{t("analysis.howFound")}</span>
              </div>

              <div className="mt-3 space-y-2">
                {(() => {
                  const rows = data.breakdowns.trafficSource;
                  const total = rows.reduce((sum, row) => sum + row.views, 0) || 1;
                  return rows.map((row) => {
                    const pct = Math.round((row.views / total) * 100);
                    return (
                      <div key={row.source}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-blumea-navy">{t.has(`library.traffic.${row.source}`) ? t(`library.traffic.${row.source}` as TextKey) : row.label}</span>
                          <span className="ltr-island text-blumea-slate">{pct}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blumea-blue"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {data.breakdowns?.subscribedStatus && (
            <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-blumea-slate">
                <UserCheck size={16} strokeWidth={1.8} className="text-blumea-blue" />
                <span className="text-sm">{t("analysis.subsVsNew")}</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                {(() => {
                  const rows = data.breakdowns.subscribedStatus;
                  const total = rows.reduce((sum, row) => sum + row.views, 0) || 1;
                  return [true, false].map((wantSubscribed) => {
                    const row = rows.find((r) => r.subscribed === wantSubscribed);
                    const pct = row ? Math.round((row.views / total) * 100) : 0;
                    return (
                      <div key={String(wantSubscribed)}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blumea-slate">
                          {wantSubscribed ? t("analysis.subscribers") : t("analysis.notSubscribed")}
                        </p>
                        <p className="mt-1 text-lg font-semibold leading-6 text-blumea-navy">
                          {row ? `${pct}%` : "—"}
                        </p>
                        {row && (
                          <p className="mt-0.5 text-xs text-blumea-slate">
                            {t("analysis.avgWatchShort", { time: formatTime(row.avgViewDurationSec) })}
                          </p>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </section>
      )}

      {hasAnyInsight && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight text-blumea-navy">
            {t("analysis.keepAndTest")}
          </h2>

          <div className="mt-4 space-y-3">
            {payoffInsight && (
              <InsightCard disclaimer={t("analysis.payoffDisclaimer")}>
                <p className="text-sm leading-6 text-blumea-navy">
                  {rich(t("analysis.payoffBody", { what: payoffInsight.payoffWhatHappens, duration: payoffInsight.durationSec }), {
                    at: <Num>{formatTime(payoffInsight.payoffAtSec)}</Num>,
                    avg: <Num>{formatTime(payoffInsight.avgWatchSec)}</Num>,
                  })}
                </p>

                <p className="mt-3 text-sm font-medium leading-6 text-blumea-navy">
                  {t("analysis.payoffAction", { sec: payoffInsight.suggestedEarlierBySec })}
                </p>
              </InsightCard>
            )}

            {commentOutlierInsight && (
              <InsightCard disclaimer={t("analysis.commentDisclaimer", { count: data.commentBaseline?.count ?? 0 })}>
                <p className="text-sm leading-6 text-blumea-navy">
                  {rich(
                    t("analysis.commentBody", {
                      per100: commentOutlierInsight.per100Views.toFixed(2),
                      usual: commentOutlierInsight.usualPer100Views.toFixed(2),
                      multiple: Math.round(commentOutlierInsight.multiple),
                      comments: commentOutlierInsight.comments,
                    }),
                    {}
                  )}
                  {commentOutlierInsight.quote && <> {t("analysis.commentQuote", { quote: commentOutlierInsight.quote })}</>}
                </p>

                <p className="mt-3 text-sm font-medium leading-6 text-blumea-navy">
                  {t("analysis.commentAction")}
                </p>
              </InsightCard>
            )}

            {strongHookInsight && (
              <InsightCard
                keep
                disclaimer={t("analysis.strongDisclaimer", { count: strongHookInsight.baselineCount, noun: cohortNoun(data.baseline, t), small: smallNumbersNote })}
              >
                <p className="text-sm leading-6 text-blumea-navy">
                  {rich(t("analysis.strongBody", { quote: strongHookInsight.quote }), {
                    pct: <Num>{Math.round(strongHookInsight.stayedPct)}%</Num>,
                    vs: vsPhrase(data.baseline, strongHookInsight.baselineMedianPct, t),
                  })}
                </p>

                <p className="mt-3 text-sm font-medium leading-6 text-blumea-navy">
                  {t("analysis.strongAction")}
                </p>
              </InsightCard>
            )}

            {weakOpeningInsight && (
              <InsightCard
                disclaimer={t("analysis.weakDisclaimer", { count: weakOpeningInsight.baselineCount, noun: cohortNoun(data.baseline, t), small: smallNumbersNote })}
              >
                <p className="text-sm leading-6 text-blumea-navy">
                  {rich(t("analysis.weakBody"), {
                    pct: <Num>{Math.round(weakOpeningInsight.stayedPct)}%</Num>,
                    vs: vsPhrase(data.baseline, weakOpeningInsight.baselineMedianPct, t),
                  })}
                </p>

                <p className="mt-3 text-sm font-medium leading-6 text-blumea-navy">
                  {t("analysis.weakAction")}
                </p>
              </InsightCard>
            )}

            {biggestDropInsight && (
              <InsightCard disclaimer={t("analysis.dropDisclaimer")}>
                <p className="text-sm leading-6 text-blumea-navy">
                  {rich(t("analysis.dropBody", { points: biggestDropInsight.dropPercentagePoints }), {
                    at: <Num>{formatTime(biggestDropInsight.atSec)}</Num>,
                  })}
                  {biggestDropInsight.nearbyMoment && (
                    <> {t("analysis.dropMoment", { what: biggestDropInsight.nearbyMoment.what_happens })}</>
                  )}
                </p>

                <p className="mt-3 text-sm font-medium leading-6 text-blumea-navy">
                  {t("analysis.dropAction")}
                </p>
              </InsightCard>
            )}

            {experimentInsights.map((experiment, index) => (
              <InsightCard key={index} disclaimer={t("analysis.experimentDisclaimer")}>
                <p className="text-sm font-medium leading-6 text-blumea-navy">{t(`library.experiment.${experiment.kind}` as TextKey)}</p>
              </InsightCard>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight text-blumea-navy">
          {t("analysis.understood")}
        </h2>

        <p className="mt-1 text-sm text-blumea-slate">
          {t("analysis.understoodNote")}
        </p>

        {identityRows.length === 0 ? (
          <p className="mt-5 text-sm text-blumea-slate">{t("analysis.noAnalysis")}</p>
        ) : (
          <div className="mt-5 rounded-2xl border border-slate-200/70 bg-white px-5 shadow-sm">
            {identityRows.map((row) => {
              const hint = row.confidence === "medium" ? t("analysis.likely") : row.confidence === "low" ? t("analysis.notSure") : null;

              return (
                <div key={row.field} className="border-b border-slate-100 py-4 last:border-b-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blumea-blue">
                      {row.label}
                    </p>

                    {hint && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-blumea-slate">
                        {hint}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 space-y-1">
                    {row.lines.map((line, index) => (
                      <p key={index} className="text-sm font-medium text-blumea-navy">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {platformSoundRaw && (
          <a
            href={platformSoundRaw.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-5 py-4 shadow-sm transition-colors hover:border-blumea-blue/40"
          >
            <Music2 size={18} strokeWidth={1.8} className="shrink-0 text-blumea-blue" />

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-blumea-blue">
                {t("analysis.soundFromTiktok")}
              </p>

              <p className="truncate text-sm font-medium text-blumea-navy">
                {platformSoundRaw.label}
              </p>
            </div>

            <ExternalLink size={16} className="shrink-0 text-blumea-slate" />
          </a>
        )}
      </section>

      {compareOpen && <ComparePicker initialA={id} onClose={() => setCompareOpen(false)} />}
    </div>
  );
}

const recommendationStyles = {
  keep: { label: "Keep", dot: "bg-blumea-success", text: "text-blumea-success" },
  improve: { label: "Improve", dot: "bg-amber-400", text: "text-amber-600" },
  try: { label: "Try next", dot: "bg-blumea-blue", text: "text-blumea-blue" },
};

const confidenceLabels: Record<Confidence, string | null> = {
  high: null,
  medium: "Likely",
  low: "Not sure",
};

type BehaviorCard = {
  label: string;
  icon: LucideIcon;
  value?: string;
  sub?: string;
  watchAt?: number;
  unavailable?: string;
};

function getBehaviorCards(video: Video, analysis: ResolvedAnalysis): BehaviorCard[] {
  const drop = video.retention ? biggestDrop(video.retention) : null;
  const peak = analysis.moments.find((moment) => moment.kind === "peak");
  const notShared = (what: string) =>
    `${video.platform === "instagram" ? "Instagram" : "TikTok"} doesn't share ${what}.`;

  let opening: BehaviorCard = {
    label: "Opening",
    icon: Eye,
    unavailable: notShared("opening retention"),
  };

  if (video.retention) {
    opening = {
      label: "Opening",
      icon: Eye,
      value: `${video.retention[1]}% still watching`,
      sub: "at 0:02",
    };
  } else if (video.skipRate !== undefined) {
    opening = {
      label: "Opening",
      icon: Eye,
      value: `${100 - video.skipRate}% didn't skip`,
      sub: `Skip rate ${video.skipRate}%`,
    };
  }

  return [
    {
      label: "Average watch",
      icon: Clock3,
      value: `${video.avgWatchSec.toFixed(1)} sec`,
      sub: `of a ${video.durationSec} sec video`,
    },
    opening,
    drop !== null
      ? { label: "Biggest drop", icon: TrendingDown, value: formatTime(drop), watchAt: drop }
      : {
          label: "Biggest drop",
          icon: TrendingDown,
          unavailable: notShared("second-by-second retention"),
        },
    peak
      ? {
          label: "Strongest moment",
          icon: Sparkles,
          value: peak.label,
          sub: `Around ${formatTime(peak.at)}`,
          watchAt: peak.at,
        }
      : {
          label: "Strongest moment",
          icon: Sparkles,
          unavailable: "Needs the video file to find it.",
        },
  ];
}

export default function AnalysisPage({ params }: PageProps<"/analysis/[id]">) {
  const { id } = use(params);

  if (UUID_PATTERN.test(id)) {
    return <RealVideoAnalysis id={id} />;
  }

  // Prototype videos (v1, v2, ...) carry made-up data: development only.
  if (process.env.NODE_ENV !== "development") notFound();

  return <MockVideoAnalysis id={id} />;
}

function MockVideoAnalysis({ id }: { id: string }) {
  const router = useAppRouter();
  const { deepIds } = useMockStore(seedAnalyzedIds);

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  const closeUpload = useCallback(() => setUploadOpen(false), []);
  const closeCompare = useCallback(() => setCompareOpen(false), []);

  const video = getVideo(id);
  const analysis = video ? getAnalysis(video, deepIds) : undefined;

  if (!video || !analysis) {
    notFound();
  }

  function watchAt(seconds: number) {
    setTime(seconds);
    setPlaying(true);
    playerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const drop = video.retention ? biggestDrop(video.retention) : null;
  const markers: Moment[] = [...analysis.moments];

  if (drop !== null && !markers.some((moment) => Math.abs(moment.at - drop) <= 1)) {
    markers.push({ at: drop, label: "Biggest drop", kind: "note" });
  }

  const metrics = [
    { label: "Views", value: formatCount(video.metrics.views), icon: Eye },
    { label: "Likes", value: formatCount(video.metrics.likes), icon: Heart },
    { label: "Comments", value: formatCount(video.metrics.comments), icon: MessageCircle },
    { label: "Shares", value: formatCount(video.metrics.shares), icon: Share2 },
    { label: "Saves", value: formatCount(video.metrics.saves), icon: Bookmark },
  ];

  const liteReason =
    video.platform === "instagram"
      ? "Instagram doesn't share videos that use licensed music."
      : "TikTok doesn't share video files.";

  return (
    <div className="mx-auto w-full max-w-7xl">
      <AppLink
        href="/content"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
      >
        <ArrowLeft size={16} />
        Content
      </AppLink>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">
        Video Analysis
      </h1>

      <p className="mt-2 text-blumea-slate">Here&apos;s what Blumea found in your video.</p>

      {/* Video identity + raw metrics */}
      <div className="mt-8 grid gap-6 md:grid-cols-[220px_1fr]">
        <div ref={playerRef} className="mx-auto md:mx-0">
          <EvidencePlayer
            title={video.title}
            thumbnail={video.thumbnail}
            durationSec={video.durationSec}
            moments={markers}
            time={time}
            playing={playing}
            onTimeChange={setTime}
            onPlayingChange={setPlaying}
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-blumea-navy sm:text-2xl">{video.title}</h2>

            <PlatformBadge platform={video.platform} />

            <ModeBadge mode={analysis.mode} />
          </div>

          <p className="mt-1 text-sm text-blumea-slate">
            Published {formatPublished(video.publishedAt)} · {video.durationSec} sec
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {metrics.map((metric) => {
              const Icon = metric.icon;

              return (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2 text-blumea-slate">
                    <Icon size={16} strokeWidth={1.8} className="text-blumea-blue" />

                    <span className="text-sm">{metric.label}</span>
                  </div>

                  <p className="mt-3 text-2xl font-semibold tracking-tight text-blumea-navy">
                    {metric.value}
                  </p>
                </div>
              );
            })}
          </div>

          {video.metrics.saves === null && (
            <p className="mt-2 text-xs text-blumea-slate">YouTube doesn&apos;t share saves.</p>
          )}

          {analysis.mode === "lite" && (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-blumea-blue/25 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
              <Info size={20} strokeWidth={1.8} className="shrink-0 text-blumea-blue" />

              <p className="flex-1 text-sm leading-6 text-blumea-slate">
                <span className="font-semibold text-blumea-navy">Lite analysis.</span> Blumea read
                the title, caption, cover and metrics. {liteReason} Upload the video to unlock your
                visual hook, sound and key moments.
              </p>

              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-blumea-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
              >
                <UploadCloud size={16} />
                Upload video
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content Identity + Recommendations */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight text-blumea-navy">
          What Blumea understood
        </h2>

        <p className="mt-1 text-sm text-blumea-slate">
          What we recognized in your video and what you can learn from it.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="self-start rounded-2xl border border-slate-200/70 bg-white px-5 shadow-sm">
            {analysis.identity.map((item, index) => {
              const hint = confidenceLabels[item.confidence];

              return (
                <div
                  key={`${item.label}-${index}`}
                  className="border-b border-slate-100 py-4 last:border-b-0"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-blumea-blue">
                    {item.label}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {item.tone === "success" && (
                      <Check size={16} strokeWidth={2.2} className="text-blumea-success" />
                    )}

                    <p className="text-sm font-medium text-blumea-navy">{item.value}</p>

                    {hint && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-blumea-slate">
                        {hint}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {analysis.lockedLabels.map((label) => (
              <div key={label} className="border-b border-slate-100 py-4 last:border-b-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-blumea-blue">
                  {label}
                </p>

                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="mt-1 flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-blumea-blue"
                >
                  <Lock size={14} />
                  Upload the video to unlock
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-blumea-navy">Recommendations</h3>

            <p className="mt-1 text-sm text-blumea-slate">Based on what we found in this video.</p>

            <div className="mt-5 space-y-3">
              {analysis.recommendations.map((recommendation, index) => (
                <RecommendationCard
                  key={`${recommendation.kind}-${index}`}
                  recommendation={recommendation}
                  highlighted={recommendation.kind === "keep"}
                  onWatch={watchAt}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Viewer behavior */}
      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-blumea-navy">
              Viewer behavior
            </h2>

            <p className="mt-1 text-sm text-blumea-slate">
              The key moments that shaped how people watched this video.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push(`/analysis/${video.id}/details`)}
            className="shrink-0 text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
          >
            View detailed analytics →
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {getBehaviorCards(video, analysis).map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className={`rounded-2xl border p-4 shadow-sm ${
                  card.unavailable
                    ? "border-dashed border-slate-200 bg-white/60"
                    : "border-slate-200/70 bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={17} strokeWidth={1.8} className="text-blumea-blue" />

                  <p className="text-xs font-semibold uppercase tracking-wide text-blumea-slate">
                    {card.label}
                  </p>
                </div>

                {card.unavailable ? (
                  <>
                    <p className="mt-3 text-sm font-semibold text-slate-400">Not available</p>

                    <p className="mt-1 text-sm text-blumea-slate">{card.unavailable}</p>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-lg font-semibold leading-6 text-blumea-navy">
                      {card.value}
                    </p>

                    {card.sub && <p className="mt-1 text-sm text-blumea-slate">{card.sub}</p>}

                    {card.watchAt !== undefined && (
                      <button
                        type="button"
                        onClick={() => watchAt(card.watchAt as number)}
                        className="mt-2 text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
                      >
                        Watch this moment →
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Recommended comparisons */}
      <section className="mt-10 pb-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-blumea-navy">
              Recommended comparisons
            </h2>

            <p className="mt-1 text-sm text-blumea-slate">
              Compare this video with content that can teach you something useful.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            className="shrink-0 text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
          >
            Choose something else →
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {analysis.comparisons.map((comparison) => (
            <AppLink
              key={comparison.title}
              href={`/compare/${video.id}/${comparison.otherId}`}
              className="group rounded-2xl border border-slate-200/70 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blumea-blue/40 hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-blumea-blue">
                {comparison.label}
              </p>

              <h3 className="mt-2 text-base font-semibold text-blumea-navy">{comparison.title}</h3>

              <p className="mt-2 text-sm leading-6 text-blumea-slate">{comparison.description}</p>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-medium text-blumea-slate">
                  Based on: {comparison.basedOn}
                </span>

                <span className="text-blumea-blue transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </div>
            </AppLink>
          ))}
        </div>
      </section>

      {compareOpen && <CompareModal onClose={closeCompare} />}

      {uploadOpen && <UploadModal video={video} onClose={closeUpload} />}
    </div>
  );
}

function RecommendationCard({
  recommendation,
  highlighted,
  onWatch,
}: {
  recommendation: Recommendation;
  highlighted: boolean;
  onWatch: (seconds: number) => void;
}) {
  const style = recommendationStyles[recommendation.kind];

  return (
    <div
      className={`rounded-2xl p-4 ${
        highlighted ? "bg-blumea-mist" : "border border-slate-200/70"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${style.dot}`} />

        <p className={`text-xs font-semibold uppercase tracking-wide ${style.text}`}>
          {style.label}
        </p>
      </div>

      <p className="mt-2 text-sm font-semibold leading-6 text-blumea-navy">
        {recommendation.identified}
      </p>

      <p className="mt-1 text-sm leading-6 text-blumea-slate">{recommendation.happened}</p>

      {recommendation.action && (
        <p className="mt-3 text-sm font-medium text-blumea-navy">{recommendation.action}</p>
      )}

      {recommendation.at !== undefined && (
        <button
          type="button"
          onClick={() => onWatch(recommendation.at as number)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-blumea-blue transition-colors hover:border-blumea-blue"
        >
          <Play size={12} />
          Watch {formatTime(recommendation.at)}
        </button>
      )}
    </div>
  );
}
