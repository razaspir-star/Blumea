// What each platform gives apps like Blumea, in one place, so every screen shows
// only what exists and says plainly what doesn't (never an empty slot, never a
// number that means something else on another platform). Verified live where
// marked; Instagram is documented but not connected yet (doc/CLAUDE.md §5).

import type { Translator } from "@/lib/i18n/translate";

export type Capability =
  | "shares"
  | "saves"
  | "reposts"
  | "avgWatch"
  | "retentionCurve"
  | "trafficSource"
  | "subscribers"
  | "accountViews";

type PlatformCapabilities = {
  name: string;
  // true = the platform gives it; false = it does not (not a "not yet").
  has: Record<Capability, boolean>;
  // Shown when the viewer-behavior section can't exist for this platform.
  viewerBehaviorNote: string | null;
};

const PLATFORMS: Record<string, PlatformCapabilities> = {
  youtube: {
    name: "YouTube",
    // Verified live: Analytics gives watch time, the retention curve, traffic
    // sources and subscriber split to the owner; no shares/saves/reposts.
    has: { shares: false, saves: false, reposts: false, avgWatch: true, retentionCurve: true, trafficSource: true, subscribers: true, accountViews: true },
    viewerBehaviorNote: null,
  },
  tiktok: {
    name: "TikTok",
    // Verified live: Display API returns views, likes, comments and shares for
    // the owner's own videos; no saves, watch time or retention. Reposts are
    // not a separate number there (folded into shares).
    has: { shares: true, saves: false, reposts: false, avgWatch: false, retentionCurve: false, trafficSource: false, subscribers: false, accountViews: false },
    viewerBehaviorNote:
      "How people watched a TikTok video (watch time, where they left) is shown only inside the TikTok app. Below is everything Blumea reads from the video itself: its format, content, sound and hook.",
  },
  instagram: {
    name: "Instagram",
    // From Meta's current docs, not connected yet: average watch time and skip
    // rate for Reels, plus saves, shares and reposts; no second-by-second curve.
    has: { shares: true, saves: true, reposts: true, avgWatch: true, retentionCurve: false, trafficSource: false, subscribers: false, accountViews: false },
    viewerBehaviorNote:
      "Instagram shares average watch time but not a second-by-second curve, so \"the biggest drop\" can't be assessed for this video.",
  },
};

export function platformHas(platform: string | null | undefined, capability: Capability): boolean {
  return !!platform && !!PLATFORMS[platform]?.has[capability];
}

export function platformName(platform: string | null | undefined, t?: Translator): string {
  return (platform && PLATFORMS[platform]?.name) || (t ? t("library.platform.thisPlatform") : "this platform");
}

export function viewerBehaviorNote(platform: string | null | undefined, t?: Translator): string | null {
  if (t && platform === "tiktok") return t("library.platform.tiktokNote");
  if (t && platform === "instagram") return t("library.platform.instagramNote");
  return (platform && PLATFORMS[platform]?.viewerBehaviorNote) || null;
}

// YouTube Analytics usually needs 2–3 days after posting before it reports
// anything for a video (seen live: a video posted the day before had none).
export const ANALYTICS_LAG_DAYS = 4;
