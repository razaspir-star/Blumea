// Mock data for the Blumea prototype.
// Nothing here comes from a real platform API yet. The shapes are written the way
// the real pipeline is expected to return them (per-field confidence, analysis
// modes, platform-specific availability) so screens can be built against them.

export type PlatformId = "youtube" | "instagram" | "tiktok" | "facebook";
export type VideoPlatformId = Exclude<PlatformId, "facebook">;

// Full: frames + audio + transcript + metrics. Lite: metadata, cover and metrics.
// Deep: Lite plus a video file the creator uploaded.
export type AnalysisMode = "full" | "lite" | "deep";
export type Confidence = "high" | "medium" | "low";

export type VideoMetrics = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number | null; // null = the platform doesn't expose it
};

export type Video = {
  id: string;
  title: string;
  platform: VideoPlatformId;
  thumbnail: string;
  publishedAt: string; // ISO date
  durationSec: number;
  metrics: VideoMetrics;
  performance: number; // % vs the creator's usual (baseline)
  audioType?: "ORIGINAL_SOUND" | "MUSIC"; // Instagram only
  avgWatchSec: number;
  skipRate?: number; // Instagram, %
  fullWatchRate?: number; // TikTok Business, %
  retention?: number[]; // YouTube, % of viewers remaining every 2 seconds
  analyzed: boolean; // analyzed in the seeded mock state
  analyzedAgo?: string;
};

export type IdentityField = {
  label: string;
  value: string;
  confidence: Confidence;
  tone?: "success";
};

export type Moment = {
  at: number;
  label: string;
  kind: "hook" | "peak" | "note";
};

export type Recommendation = {
  kind: "keep" | "improve" | "try";
  identified: string; // what we identified
  happened: string; // what happened
  action?: string; // what to do
  at?: number; // timestamp the recommendation points at
};

export type ComparisonSuggestion = {
  label: string;
  title: string;
  description: string;
  basedOn: string;
  otherId: string; // a video id, or "baseline"
};

type AnalysisSource = {
  identity: IdentityField[];
  locked?: IdentityField[];
  recommendations: Recommendation[];
  deepRecommendations?: Recommendation[];
  moments: Moment[];
  deepMoments?: Moment[];
  comparisons: ComparisonSuggestion[];
};

export type ResolvedAnalysis = {
  mode: AnalysisMode;
  identity: IdentityField[];
  lockedLabels: string[];
  recommendations: Recommendation[];
  moments: Moment[];
  comparisons: ComparisonSuggestion[];
};

const THUMBS = [
  "/top-content/top-1.jpg",
  "/top-content/top-2.jpg",
  "/top-content/top-3.jpg",
];

export const videos: Video[] = [
  {
    id: "v6",
    title: "Desk makeover reveal",
    platform: "tiktok",
    thumbnail: THUMBS[1],
    publishedAt: "2026-09-20",
    durationSec: 24,
    metrics: { views: 52000, likes: 4400, comments: 140, shares: 730, saves: 380 },
    performance: 9,
    avgWatchSec: 14.6,
    fullWatchRate: 24,
    analyzed: false,
  },
  {
    id: "v1",
    title: "Gaming setup reveal",
    platform: "instagram",
    thumbnail: THUMBS[0],
    publishedAt: "2026-09-18",
    durationSec: 19,
    metrics: { views: 128000, likes: 8400, comments: 312, shares: 1900, saves: 846 },
    performance: 24,
    audioType: "ORIGINAL_SOUND",
    avgWatchSec: 11.4,
    skipRate: 22,
    analyzed: true,
    analyzedAgo: "2 days ago",
  },
  {
    id: "v2",
    title: "You missed this detail",
    platform: "tiktok",
    thumbnail: THUMBS[1],
    publishedAt: "2026-09-15",
    durationSec: 27,
    metrics: { views: 96000, likes: 6100, comments: 224, shares: 1200, saves: 540 },
    performance: 18,
    avgWatchSec: 13.2,
    fullWatchRate: 18,
    analyzed: true,
    analyzedAgo: "5 days ago",
  },
  {
    id: "v7",
    title: "Setup tour with a trending song",
    platform: "instagram",
    thumbnail: THUMBS[0],
    publishedAt: "2026-09-12",
    durationSec: 17,
    metrics: { views: 22000, likes: 1500, comments: 60, shares: 210, saves: 190 },
    performance: -14,
    audioType: "MUSIC",
    avgWatchSec: 8.9,
    skipRate: 38,
    analyzed: false,
  },
  {
    id: "v3",
    title: "3 things you didn't know",
    platform: "youtube",
    thumbnail: THUMBS[2],
    publishedAt: "2026-09-10",
    durationSec: 41,
    metrics: { views: 74000, likes: 3900, comments: 187, shares: 402, saves: null },
    performance: 12,
    avgWatchSec: 21.5,
    retention: [100, 91, 85, 80, 76, 73, 71, 69, 67, 55, 53, 51, 49, 48, 47, 49, 50, 47, 45, 43, 40],
    analyzed: true,
    analyzedAgo: "1 week ago",
  },
  {
    id: "v4",
    title: "Mirage smoke in 20 seconds",
    platform: "instagram",
    thumbnail: THUMBS[1],
    publishedAt: "2026-09-05",
    durationSec: 21,
    metrics: { views: 41000, likes: 2700, comments: 96, shares: 610, saves: 1400 },
    performance: 0,
    audioType: "ORIGINAL_SOUND",
    avgWatchSec: 12.8,
    skipRate: 31,
    analyzed: false,
  },
  {
    id: "v5",
    title: "Flashbang spots you're missing",
    platform: "youtube",
    thumbnail: THUMBS[2],
    publishedAt: "2026-08-30",
    durationSec: 47,
    metrics: { views: 38000, likes: 2100, comments: 142, shares: 201, saves: null },
    performance: -7,
    avgWatchSec: 19.7,
    retention: [100, 89, 82, 77, 73, 70, 66, 64, 62, 60, 58, 49, 47, 45, 44, 43, 42, 41, 40, 39, 38, 37, 36, 35],
    analyzed: false,
  },
];

const analyses: Record<string, AnalysisSource> = {
  v1: {
    identity: [
      { label: "Topic", value: "Gaming setup transformation", confidence: "high" },
      { label: "Categories", value: "Gaming, Tech", confidence: "high" },
      { label: "Game", value: "Counter-Strike 2", confidence: "high" },
      { label: "Map", value: "Mirage", confidence: "medium" },
      { label: "Format", value: "Before & after / Reveal", confidence: "high" },
      { label: "Textual hook", value: "Wait until you see the final setup", confidence: "high" },
      { label: "Visual hook", value: "Quick camera push toward the unfinished setup", confidence: "medium" },
      { label: "Subtitles", value: "Detected", confidence: "high", tone: "success" },
      { label: "Sound", value: "Original sound", confidence: "high" },
      { label: "Trend", value: "No confirmed trend", confidence: "medium" },
    ],
    moments: [
      { at: 0, label: "Text hook appears", kind: "hook" },
      { at: 14, label: "Final setup reveal", kind: "peak" },
    ],
    recommendations: [
      {
        kind: "keep",
        identified: "Your “Wait until you see the final setup” hook makes a clear promise.",
        happened: "Only 22% of viewers skipped in the opening, which suggests the promise is landing.",
        action: "Keep opening with a clear promise of what's coming.",
        at: 0,
      },
      {
        kind: "improve",
        identified: "The final reveal starts at 0:14 of a 19-second video.",
        happened:
          "The average viewer watched 11.4 seconds, so many viewers may be leaving before the payoff.",
        action: "Try bringing the reveal 3–4 seconds earlier.",
        at: 14,
      },
      {
        kind: "try",
        identified: "Your visual hook is a quick camera push toward the unfinished setup.",
        happened: "The text hook doesn't appear until the push is already underway.",
        action: "Try showing the text hook from the very first frame so both hooks reinforce each other.",
        at: 0,
      },
    ],
    comparisons: [
      {
        label: "Your content",
        title: "Compare with your other CS2 videos",
        description: "See what changed in your hooks, pacing and viewer response.",
        basedOn: "Counter-Strike 2",
        otherId: "v4",
      },
      {
        label: "Similar format",
        title: "Compare with another reveal video",
        description: "See whether this reveal structure is helping or holding the video back.",
        basedOn: "Reveal format",
        otherId: "v6",
      },
      {
        label: "Your baseline",
        title: "Compare with your usual performance",
        description: "See how this video sits against your last 50 videos.",
        basedOn: "Your last 50 videos",
        otherId: "baseline",
      },
    ],
  },

  v3: {
    identity: [
      { label: "Topic", value: "CS2 settings most players miss", confidence: "high" },
      { label: "Categories", value: "Gaming, Education", confidence: "high" },
      { label: "Game", value: "Counter-Strike 2", confidence: "high" },
      { label: "Format", value: "Numbered list (3 tips)", confidence: "high" },
      { label: "Textual hook", value: "3 things you didn't know", confidence: "high" },
      { label: "Visual hook", value: "Big “3” on screen with a quick zoom on the settings menu", confidence: "medium" },
      { label: "Subtitles", value: "Detected", confidence: "high", tone: "success" },
      { label: "Sound", value: "Voiceover with light background music", confidence: "medium" },
      { label: "Trend", value: "No confirmed trend", confidence: "medium" },
    ],
    moments: [
      { at: 0, label: "Hook: “3 things you didn't know”", kind: "hook" },
      { at: 17, label: "Switch from face camera to screen recording", kind: "note" },
      { at: 31, label: "Third tip payoff", kind: "peak" },
    ],
    recommendations: [
      {
        kind: "keep",
        identified: "The hook promises exactly three tips, and the video delivers three.",
        happened: "About 91% of viewers were still watching at 0:02, so the promise holds attention at the start.",
        action: "Keep numbered promises that the video visibly counts through.",
        at: 0,
      },
      {
        kind: "improve",
        identified: "At 0:17 the video switches from the face camera to a screen recording.",
        happened:
          "This is where the biggest drop happens, suggesting the change of visual may contribute.",
        action: "Try keeping a camera cut or on-screen movement across this transition.",
        at: 17,
      },
      {
        kind: "try",
        identified: "The strongest tip lands at 0:31, near the end, where attention rises slightly.",
        happened: "Some viewers stay or return for the last tip.",
        action: "Try teasing your strongest tip in the hook and testing it as tip number one.",
        at: 31,
      },
    ],
    comparisons: [
      {
        label: "Same subject",
        title: "Compare with your other CS2 tips video",
        description: "See how structure and pacing differ between two tips videos.",
        basedOn: "CS2 tips",
        otherId: "v5",
      },
      {
        label: "Your baseline",
        title: "Compare with your usual performance",
        description: "See how this video sits against your last 50 videos.",
        basedOn: "Your last 50 videos",
        otherId: "baseline",
      },
    ],
  },

  v4: {
    identity: [
      { label: "Topic", value: "Mirage smoke lineup tutorial", confidence: "high" },
      { label: "Categories", value: "Gaming, Education", confidence: "high" },
      { label: "Game", value: "Counter-Strike 2", confidence: "high" },
      { label: "Map", value: "Mirage", confidence: "high" },
      { label: "Format", value: "Tutorial / Lineup", confidence: "high" },
      { label: "Textual hook", value: "Smoke this in 20 seconds", confidence: "high" },
      { label: "Visual hook", value: "Crosshair settling on a lineup point", confidence: "medium" },
      { label: "Subtitles", value: "Detected", confidence: "high", tone: "success" },
      { label: "Sound", value: "Original sound", confidence: "high" },
      { label: "Trend", value: "No confirmed trend", confidence: "medium" },
    ],
    moments: [
      { at: 0, label: "Text hook appears", kind: "hook" },
      { at: 8, label: "Lineup point shown", kind: "note" },
      { at: 17, label: "Smoke lands", kind: "peak" },
    ],
    recommendations: [
      {
        kind: "keep",
        identified: "“Smoke this in 20 seconds” gives a specific, checkable promise.",
        happened: "This video was saved 1.4K times, more than any of your other recent videos.",
        action: "Keep specific time promises in tutorial hooks.",
        at: 0,
      },
      {
        kind: "improve",
        identified: "The lineup point doesn't appear until 0:08.",
        happened: "The average viewer watched 12.8 of 21 seconds, so many may leave before the smoke lands.",
        action: "Try showing where the smoke lands first, then how to line it up.",
        at: 8,
      },
      {
        kind: "try",
        identified: "This tutorial format has strong saves on Mirage.",
        happened: "Saves suggest viewers want to come back to it.",
        action: "Try the same format on another map to see if the saves repeat.",
      },
    ],
    comparisons: [
      {
        label: "Your content",
        title: "Compare with your other CS2 videos",
        description: "See what changed in your hooks, pacing and viewer response.",
        basedOn: "Counter-Strike 2",
        otherId: "v1",
      },
      {
        label: "Your baseline",
        title: "Compare with your usual performance",
        description: "See how this video sits against your last 50 videos.",
        basedOn: "Your last 50 videos",
        otherId: "baseline",
      },
    ],
  },

  v5: {
    identity: [
      { label: "Topic", value: "Flashbang spots in CS2", confidence: "high" },
      { label: "Categories", value: "Gaming, Education", confidence: "high" },
      { label: "Game", value: "Counter-Strike 2", confidence: "high" },
      { label: "Format", value: "Tutorial / List", confidence: "medium" },
      { label: "Textual hook", value: "Most players never use these", confidence: "high" },
      { label: "Visual hook", value: "Flash going off over a doorway", confidence: "medium" },
      { label: "Subtitles", value: "Detected", confidence: "high", tone: "success" },
      { label: "Sound", value: "Voiceover", confidence: "medium" },
      { label: "Trend", value: "No confirmed trend", confidence: "medium" },
    ],
    moments: [
      { at: 0, label: "Hook: “Most players never use these”", kind: "hook" },
      { at: 21, label: "Move to the second location", kind: "note" },
      { at: 34, label: "Best spot shown", kind: "peak" },
    ],
    recommendations: [
      {
        kind: "keep",
        identified: "The hook sets up a knowledge gap (“Most players never use these”).",
        happened: "89% of viewers were still watching at 0:02.",
        action: "Keep hooks that name what the viewer is missing.",
        at: 0,
      },
      {
        kind: "improve",
        identified: "At 0:21 the video moves to a new location with a hard cut.",
        happened: "The biggest drop happens here, which suggests the jump may contribute.",
        action: "Try adding a short on-screen label before each new spot.",
        at: 21,
      },
      {
        kind: "try",
        identified: "The best spot is shown at 0:34, in the last third.",
        happened: "Attention is already low by then.",
        action: "Try showing your best spot second and ending on a quick recap.",
        at: 34,
      },
    ],
    comparisons: [
      {
        label: "Same subject",
        title: "Compare with your other CS2 tips video",
        description: "See how structure and pacing differ between two tips videos.",
        basedOn: "CS2 tips",
        otherId: "v3",
      },
      {
        label: "Your baseline",
        title: "Compare with your usual performance",
        description: "See how this video sits against your last 50 videos.",
        basedOn: "Your last 50 videos",
        otherId: "baseline",
      },
    ],
  },

  // TikTok: Lite until the creator uploads the file.
  v2: {
    identity: [
      { label: "Topic", value: "A small gameplay detail viewers often miss", confidence: "medium" },
      { label: "Categories", value: "Gaming", confidence: "high" },
      // Low confidence, so Blumea stays broad instead of naming a game.
      { label: "Game", value: "First-person shooter gameplay", confidence: "low" },
      { label: "Format", value: "Spot the detail", confidence: "medium" },
      { label: "Textual hook", value: "You missed this detail", confidence: "high" },
    ],
    locked: [
      { label: "Visual hook", value: "Red circle appears over the minimap in the first second", confidence: "medium" },
      { label: "Subtitles", value: "Detected", confidence: "high", tone: "success" },
      { label: "Sound", value: "Original sound", confidence: "high" },
      { label: "Trend", value: "No confirmed trend", confidence: "medium" },
    ],
    moments: [],
    deepMoments: [
      { at: 0, label: "Red circle on the minimap", kind: "hook" },
      { at: 11, label: "Detail revealed", kind: "peak" },
    ],
    recommendations: [
      {
        kind: "keep",
        identified: "The cover text “You missed this detail” creates a curiosity gap.",
        happened: "18% of viewers watched all the way to the end.",
        action: "Keep hooks that make the viewer want to check for themselves.",
      },
      {
        kind: "try",
        identified: "Blumea could only read the cover and caption for this video.",
        happened: "It can't yet see how the video opens or where the detail is shown.",
        action: "Upload the video to see your visual hook and exact moments.",
      },
    ],
    deepRecommendations: [
      {
        kind: "improve",
        identified: "The detail is revealed at 0:11, more than a third of the way in.",
        happened: "The average viewer watched 13.2 of 27 seconds, so many may leave before the reveal.",
        action: "Try revealing the detail within the first 6–8 seconds.",
        at: 11,
      },
    ],
    comparisons: [
      {
        label: "Your baseline",
        title: "Compare with your usual performance",
        description: "See how this video sits against your last 50 videos.",
        basedOn: "Your last 50 videos",
        otherId: "baseline",
      },
    ],
  },

  v6: {
    identity: [
      { label: "Topic", value: "Desk makeover", confidence: "high" },
      { label: "Categories", value: "Tech, Lifestyle", confidence: "medium" },
      { label: "Format", value: "Before & after / Reveal", confidence: "medium" },
      { label: "Textual hook", value: "Wait for the end", confidence: "high" },
    ],
    locked: [
      { label: "Visual hook", value: "Cluttered desk shown in a fast timelapse", confidence: "medium" },
      { label: "Subtitles", value: "Not detected", confidence: "medium" },
      { label: "Sound", value: "Original sound", confidence: "high" },
      { label: "Trend", value: "No confirmed trend", confidence: "medium" },
    ],
    moments: [],
    deepMoments: [
      { at: 0, label: "Cluttered desk timelapse", kind: "hook" },
      { at: 19, label: "Finished desk reveal", kind: "peak" },
    ],
    recommendations: [
      {
        kind: "keep",
        identified: "The cover text “Wait for the end” promises a payoff.",
        happened: "24% of viewers watched to the end, and 730 people shared it.",
        action: "Keep hooks that promise a payoff at the end.",
      },
      {
        kind: "try",
        identified: "Blumea could only read the cover and caption for this video.",
        happened: "It can't yet see the reveal or how the video opens.",
        action: "Upload the video to see when the reveal happens.",
      },
    ],
    deepRecommendations: [
      {
        kind: "improve",
        identified: "The finished desk appears at 0:19 of a 24-second video.",
        happened: "The average viewer watched 14.6 seconds, so many may leave before the reveal.",
        action: "Try showing a glimpse of the finished desk earlier.",
        at: 19,
      },
    ],
    comparisons: [
      {
        label: "Similar format",
        title: "Compare with another reveal video",
        description: "See how the reveal timing differs between two reveal videos.",
        basedOn: "Reveal format",
        otherId: "v1",
      },
    ],
  },

  // Instagram with licensed music: the video file isn't shared, so Lite until upload.
  v7: {
    identity: [
      { label: "Topic", value: "Gaming setup tour", confidence: "high" },
      { label: "Categories", value: "Gaming, Tech", confidence: "high" },
      { label: "Format", value: "Room / setup tour", confidence: "medium" },
      { label: "Sound", value: "Licensed music", confidence: "high" },
    ],
    locked: [
      { label: "Textual hook", value: "Tour of my setup in 17 seconds", confidence: "medium" },
      { label: "Visual hook", value: "Slow pan across the monitor wall", confidence: "medium" },
      { label: "Subtitles", value: "Not detected", confidence: "medium" },
      { label: "Trend", value: "Trending-audio format", confidence: "low" },
    ],
    moments: [],
    deepMoments: [
      { at: 0, label: "Slow pan across the monitors", kind: "hook" },
      { at: 12, label: "Full setup shown", kind: "peak" },
    ],
    recommendations: [
      {
        kind: "try",
        identified: "This video uses licensed music, so Instagram doesn't share the video file.",
        happened: "Blumea can read your metrics and caption, but not what happens on screen.",
        action: "Upload the video to see your hooks and key moments.",
      },
    ],
    deepRecommendations: [
      {
        kind: "improve",
        identified: "The full setup is shown at 0:12, and there is no text on screen before that.",
        happened: "38% of viewers skipped in the opening, higher than on your other Instagram videos.",
        action: "Try adding a short text hook in the first second.",
        at: 0,
      },
    ],
    comparisons: [
      {
        label: "Your baseline",
        title: "Compare with your usual performance",
        description: "See how this video sits against your last 50 videos.",
        basedOn: "Your last 50 videos",
        otherId: "baseline",
      },
    ],
  },
};

export const seedAnalyzedIds = videos.filter((video) => video.analyzed).map((video) => video.id);

export function getVideo(id: string): Video | undefined {
  return videos.find((video) => video.id === id);
}

export function getAnalysisMode(video: Video, deepIds: string[]): AnalysisMode {
  if (video.platform === "youtube") {
    return "full";
  }

  if (video.platform === "instagram" && video.audioType === "ORIGINAL_SOUND") {
    return "full";
  }

  return deepIds.includes(video.id) ? "deep" : "lite";
}

export function getAnalysis(video: Video, deepIds: string[]): ResolvedAnalysis | undefined {
  const source = analyses[video.id];

  if (!source) {
    return undefined;
  }

  const mode = getAnalysisMode(video, deepIds);

  if (mode === "lite") {
    return {
      mode,
      identity: source.identity,
      lockedLabels: (source.locked ?? []).map((field) => field.label),
      recommendations: source.recommendations,
      moments: source.moments,
      comparisons: source.comparisons,
    };
  }

  return {
    mode,
    identity: [...source.identity, ...(source.locked ?? [])],
    lockedLabels: [],
    recommendations: [...source.recommendations, ...(source.deepRecommendations ?? [])],
    moments: source.deepMoments ?? source.moments,
    comparisons: source.comparisons,
  };
}

// The creator's typical video, used as a baseline (median of the last 50 videos).
export const baseline = {
  metrics: { views: 41000, likes: 2600, comments: 110, shares: 480, saves: 620 } as VideoMetrics,
  avgWatchPct: 48,
};

const recent = {
  metrics: { views: 63000, likes: 4200, comments: 150, shares: 690, saves: 520 } as VideoMetrics,
  avgWatchPct: 51,
};

export type Subject = {
  id: string;
  kind: "video" | "aggregate";
  label: string;
  sublabel: string;
  thumbnail?: string;
  platform?: VideoPlatformId;
  durationSec?: number;
  metrics: VideoMetrics;
  avgWatchPct?: number;
  identity?: IdentityField[];
};

export function getSubject(id: string): Subject | undefined {
  if (id === "baseline") {
    return {
      id,
      kind: "aggregate",
      label: "Your usual video",
      sublabel: "Median of your last 50 videos",
      metrics: baseline.metrics,
      avgWatchPct: baseline.avgWatchPct,
    };
  }

  if (id === "recent") {
    return {
      id,
      kind: "aggregate",
      label: "Last 30 days",
      sublabel: "Average per video",
      metrics: recent.metrics,
      avgWatchPct: recent.avgWatchPct,
    };
  }

  const video = getVideo(id);

  if (!video) {
    return undefined;
  }

  return {
    id,
    kind: "video",
    label: video.title,
    sublabel: `${platformLabels[video.platform]} · ${video.durationSec} sec`,
    thumbnail: video.thumbnail,
    platform: video.platform,
    durationSec: video.durationSec,
    metrics: video.metrics,
    avgWatchPct: (video.avgWatchSec / video.durationSec) * 100,
    identity: analyses[video.id]?.identity,
  };
}

export const platformLabels: Record<PlatformId, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
};

export function engagementRate(metrics: VideoMetrics): number {
  const interactions = metrics.likes + metrics.comments + metrics.shares + (metrics.saves ?? 0);

  return (interactions / metrics.views) * 100;
}

// Newest video that hasn't been analyzed yet: the one-click suggestion in Analyze.
export function suggestVideo(analyzedIds: string[]): Video | undefined {
  return videos.find((video) => !analyzedIds.includes(video.id));
}

export function biggestDrop(retention: number[]): number | null {
  let bestIndex = -1;
  let bestDrop = 0;

  for (let i = 0; i < retention.length - 1; i += 1) {
    const drop = retention[i] - retention[i + 1];

    if (drop > bestDrop) {
      bestDrop = drop;
      bestIndex = i;
    }
  }

  // Points are 2 seconds apart, so the drop sits between them.
  return bestIndex === -1 ? null : bestIndex * 2 + 1;
}

export const recentComparisons = [
  { a: "v1", b: "v2", type: "Video vs Video", ago: "2 days ago", focus: "Hook · Engagement · Watch time" },
  { a: "v3", b: "baseline", type: "Video vs baseline", ago: "5 days ago", focus: "Performance · Watch time" },
  { a: "recent", b: "baseline", type: "Recent vs baseline", ago: "1 week ago", focus: "Views · Engagement" },
];

export type Insight = {
  id: string;
  tone: "working" | "opportunity" | "watch";
  title: string;
  body: string;
  evidence: string;
  confidence: Confidence;
  videoIds: string[];
};

export const insights: Insight[] = [
  {
    id: "short-videos",
    tone: "working",
    title: "Short gaming videos are holding attention best.",
    body: "Videos under 30 seconds keep a larger share of their runtime watched than your longer videos.",
    evidence: "Based on 6 videos with watch-time data",
    confidence: "medium",
    videoIds: ["v1", "v2", "v6"],
  },
  {
    id: "late-payoff",
    tone: "opportunity",
    title: "The payoff often comes after many viewers have left.",
    body: "In several videos the key moment arrives past the average watch time, which suggests moving it earlier may help.",
    evidence: "Seen in 4 analyzed videos",
    confidence: "medium",
    videoIds: ["v1", "v4", "v3"],
  },
  {
    id: "interactions-dip",
    tone: "watch",
    title: "Comments and shares dipped this week.",
    body: "Views are up, but comments and shares are slightly lower than in your recent videos.",
    evidence: "This week vs the previous 4 weeks",
    confidence: "high",
    videoIds: ["v6", "v7"],
  },
];

export const insightsProgress = { analyzed: 4, needed: 10 };

export type PlatformCapability = {
  id: PlatformId;
  status: "available" | "soon";
  requirement?: string;
  analysis: string;
  behavior: string;
};

export const platformCapabilities: PlatformCapability[] = [
  {
    id: "youtube",
    status: "available",
    analysis: "Full analysis, automatically.",
    behavior: "Full second-by-second retention.",
  },
  {
    id: "instagram",
    // Not built yet (no Meta app review): shown as "coming later" instead of the
    // prototype's fake "Connected" state.
    status: "soon",
    requirement: "Business or Creator account",
    analysis: "Coming later.",
    behavior: "Coming later.",
  },
  {
    id: "tiktok",
    status: "available",
    analysis: "Upload a video you saved from TikTok for a full analysis.",
    behavior: "TikTok does not share watch time with apps, so Blumea can't show how viewers watched.",
  },
  {
    id: "facebook",
    status: "soon",
    analysis: "Coming later.",
    behavior: "Coming later.",
  },
];

export function formatPublished(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
