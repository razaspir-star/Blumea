"use client";

import Image from "next/image";
import { useAppRouter } from "@/lib/use-app-router";
import { useEffect, useState } from "react";
import { useProfile } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { formatCount } from "@/lib/format";
import {
  accountTotals,
  deriveDashboard,
  loadDashboardData,
  type Change,
  type DashboardData,
  type DashboardVideo,
} from "@/lib/dashboard-data";
import { platformName } from "@/lib/platform-capabilities";
import { realInsightCards } from "@/lib/insight-cards";
import {
  Users,
  Eye,
  Activity,
  MousePointerClick,
  PlaySquare,
} from "lucide-react";

const platformLabel = platformName;

const INSIGHT_TONE = {
  working: { label: "What's working", text: "text-emerald-600", chip: "bg-emerald-50 text-emerald-600", icon: "/logo-colors/blumea-green-v1.png" },
  opportunity: { label: "Opportunity", text: "text-blumea-blue", chip: "bg-slate-100 text-blumea-slate", icon: "/blumea-logo-v2.png" },
  watch: { label: "Worth watching", text: "text-red-500", chip: "bg-red-50 text-red-500", icon: "/logo-colors/blumea-red-v1.png" },
} as const;

// Real data for the whole Dashboard (src/lib/dashboard-data.ts). Null while
// loading. No time series exists yet, so nothing here is a week-over-week delta.
//
// Daily sync (src/lib/sync.ts): when the newest account snapshot is older than a
// day, the Dashboard asks /api/sync for fresh numbers, then reloads. A scheduler
// can do the same for creators who don't open the app (/api/sync/all).
const STALE_AFTER_MS = 20 * 3_600_000;

function agoLabel(iso: string | null, now: number): string | null {
  if (!iso) return null;
  const hours = (now - new Date(iso).getTime()) / 3_600_000;
  if (hours < 1) return "Updated just now";
  if (hours < 24) return `Updated ${Math.round(hours)} h ago`;
  const days = Math.round(hours / 24);
  return `Updated ${days} ${days === 1 ? "day" : "days"} ago`;
}

function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [updatedLabel, setUpdatedLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const newestCapture = (loaded: DashboardData) =>
      loaded.accounts.reduce<string | null>(
        (best, account) => (account.capturedAt && (!best || account.capturedAt > best) ? account.capturedAt : best),
        null
      );

    async function run() {
      const loaded = await loadDashboardData();
      if (cancelled) return;
      setData(loaded);
      setUpdatedLabel(agoLabel(newestCapture(loaded), Date.now()));

      const newest = newestCapture(loaded);
      const stale = loaded.accounts.length > 0 && (!newest || Date.now() - new Date(newest).getTime() > STALE_AFTER_MS);
      if (!stale) return;

      setSyncing(true);
      try {
        const { data: session } = await supabase.auth.getSession();
        await fetch("/api/sync", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.session?.access_token ?? ""}` },
        });
        const fresh = await loadDashboardData();
        if (!cancelled) {
          setData(fresh);
          setUpdatedLabel(agoLabel(newestCapture(fresh), Date.now()));
        }
      } finally {
        if (!cancelled) setSyncing(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, syncing, updatedLabel };
}

// "↑ 23 (0.7%) since 6 days ago" -- only when a comparison snapshot exists; no
// change is ever invented.
function ChangeBadge({ change, unit }: { change: Change | null; unit: string }) {
  if (!change) return <span className="text-xs text-blumea-slate">Change shows after a few days of syncing</span>;
  const up = change.amount >= 0;
  const flat = change.amount === 0;
  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          flat ? "bg-slate-100 text-blumea-slate" : up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
        }`}
      >
        {flat ? "No change" : `${up ? "↑" : "↓"} ${formatCount(Math.abs(change.amount))}`}
        {!flat && change.percent !== null ? ` (${Math.abs(change.percent).toFixed(1)}%)` : ""}
      </span>
      <span className="text-[11px] text-blumea-slate">
        {unit}, {change.daysAgo} {change.daysAgo === 1 ? "day" : "days"} ago
      </span>
    </div>
  );
}

// What a total is made of, one small line per platform.
function Breakdown({ parts }: { parts: { label: string; value: number }[] }) {
  if (parts.length < 2) return null;
  return (
    <div className="flex flex-col gap-0.5 text-[11px] text-blumea-slate">
      {parts.map((part) => (
        <span key={part.label}>
          {part.label} {formatCount(part.value)}
        </span>
      ))}
    </div>
  );
}

// YouTube thumbnails are derivable from the video id; TikTok covers aren't
// stored, so those cards get a plain placeholder.
function Thumb({ video }: { video: DashboardVideo }) {
  const [broken, setBroken] = useState(false);
  if (video.platform !== "youtube" || broken) {
    return <div className="absolute inset-0 bg-gradient-to-br from-blumea-mist to-slate-100" />;
  }
  return (
    <Image
      src={`https://i.ytimg.com/vi/${video.platformVideoId}/maxresdefault.jpg`}
      alt=""
      fill
      sizes="200px"
      unoptimized
      onError={() => setBroken(true)}
      className="object-cover transition-transform duration-300 group-hover:scale-105"
    />
  );
}

import {
  FaInstagram,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa";

const allPlatforms = [
  {
    id: "youtube",
    label: "YouTube",
    image: "/platforms/youtube1.png",
  },
  {
    id: "instagram",
    label: "Instagram",
    image: "/platforms/instagram.png",
  },
  {
    id: "tiktok",
    label: "TikTok",
    image: "/platforms/tiktok.png",
  },
  {
    id: "facebook",
    label: "Facebook",
    image: "/platforms/facebook.png",
  },
];

const platformIcon: Record<string, React.ReactNode> = {
  youtube: <FaYoutube size={13} />,
  instagram: <FaInstagram size={13} />,
  tiktok: <FaTiktok size={12} />,
};

export default function DashboardPage() {
  const router = useAppRouter();
  const profile = useProfile();
  const { data, syncing, updatedLabel } = useDashboardData();

  // Platforms shown in the selector: the ones picked at onboarding plus every
  // connected account (YouTube was connected but missing from this list).
  const connectedPlatforms = (data?.accounts ?? []).map((account) => account.platform);
  const shownPlatformIds = allPlatforms
    .map((platform) => platform.id)
    .filter((id) => profile.platforms?.includes(id) || connectedPlatforms.includes(id));

  // Toggling a platform off removes it from every real number below.
  const [switchedOff, setSwitchedOff] = useState<string[]>([]);
  const selectedIds = shownPlatformIds.filter((id) => !switchedOff.includes(id));

  function toggleDashboardPlatform(platformId: string) {
    setSwitchedOff((current) => {
      if (current.includes(platformId)) return current.filter((id) => id !== platformId);
      // Always keep at least one platform selected
      if (selectedIds.length === 1) return current;
      return [...current, platformId];
    });
  }

  // Small arrays (a few dozen videos): no memoization needed.
  const selectedSet = new Set(selectedIds);
  const realTotals = data ? accountTotals(data.accounts, selectedSet) : null;
  const selectedVideos = data ? data.videos.filter((video) => selectedSet.has(video.platform)) : [];
  const derived = deriveDashboard(selectedVideos, data?.accounts ?? []);
  // Real insight cards replace the demo copy as soon as the creator has any
  // analyzed video; with none at all the original demo content stays.
  const hasRealVideos = (data?.videos.length ?? 0) > 0;

  const selectedPlatformCards = allPlatforms.filter((platform) => shownPlatformIds.includes(platform.id));

  const canAddAnotherPlatform = shownPlatformIds.length < allPlatforms.length;

  const firstName = profile.full_name?.trim().split(" ")[0] || "";

  const currentHour = new Date().getHours();

  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
        ? "Good afternoon"
        : "Good evening";

  return (
    <div>  <div className="flex items-end justify-between">
    <div>
     <h1 className="text-4xl font-semibold tracking-tight text-blumea-navy">
  {greeting}{firstName ? `, ${firstName}` : ""} 👋
</h1>
      <p className="mt-2 text-blumea-slate">
        Here&apos;s how your content is growing.
      </p>
    </div>

    {/* The old "This week / month / 3 months" selector did nothing: there is no
        time series yet (doc/CLAUDE.md §13#7), so everything shown is all-time. */}
    <div className="flex flex-col items-end gap-1">
      <span className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-blumea-slate">
        All time
      </span>
      {(syncing || updatedLabel) && (
        <span className="text-xs text-blumea-slate">{syncing ? "Syncing your accounts…" : updatedLabel}</span>
      )}
    </div>
  </div>
  

<div className="mx-auto w-full max-w-5xl">

  {/* KPI cards + Platform selector */}
  <div className="mt-0 flex flex-wrap items-start justify-center gap-6">

    {/* KPI cards: a fixed size, so toggling a platform never resizes them */}
    <div className="flex flex-wrap items-start justify-center gap-6">

  {/* Followers */}
 <div className="flex h-[240px] w-[160px] shrink-0 flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-blumea-slate">
          Followers
        </p>

        <p className="mt-1 text-2xl font-semibold tracking-tight text-blumea-navy">
          {realTotals ? formatCount(realTotals.followers) : "—"}
        </p>
      </div>

      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blumea-mist text-blumea-blue">
        <Users size={19} strokeWidth={1.8} />
      </div>
    </div>

   <div className="mt-5 flex flex-col items-start gap-2">
      {realTotals ? (
        <>
          <ChangeBadge change={realTotals.followersChange} unit="followers" />
          <Breakdown
            parts={realTotals.perPlatformFollowers.map((part) => ({ label: platformLabel(part.platform), value: part.followers }))}
          />
        </>
      ) : (
        <span className="text-xs text-blumea-slate">Connect an account to see this</span>
      )}
    </div>
  </div>

  {/* Views */}
 <div className="flex h-[240px] w-[160px] shrink-0 flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-blumea-slate">
          Views
        </p>

        <p className="mt-1 text-2xl font-semibold tracking-tight text-blumea-navy">
          {realTotals ? (realTotals.views ? formatCount(realTotals.views.total) : "—") : "—"}
        </p>
      </div>

      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blumea-mist text-blumea-blue">
        <Eye size={19} strokeWidth={1.8} />
      </div>
    </div>

   <div className="mt-5 flex flex-col items-start gap-2">
      {realTotals ? (
        realTotals.views ? (
          <>
            <ChangeBadge change={realTotals.views.change} unit="views" />
            <span className="text-xs text-blumea-slate">
              {realTotals.views.allConnectedReport
                ? "All-time, from your connected accounts"
                : `All-time, ${realTotals.views.platforms.map(platformLabel).join(" + ")} only`}
            </span>
          </>
        ) : (
          <span className="text-xs text-blumea-slate">Not reported by your connected platforms</span>
        )
      ) : (
        <span className="text-xs text-blumea-slate">Connect an account to see this</span>
      )}
    </div>
  </div>

  {/* Engagement */}
 <div className="flex h-[240px] w-[160px] shrink-0 flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-blumea-slate">
          Engagement
        </p>

        <p className="mt-1 text-2xl font-semibold tracking-tight text-blumea-navy">
          {hasRealVideos ? (derived.engagement ? `${derived.engagement.ratePct.toFixed(1)}%` : "—") : "—"}
        </p>
      </div>

      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blumea-mist text-blumea-blue">
       <Activity size={19} strokeWidth={1.8} />
      </div>
    </div>

    <div className="mt-5 flex flex-col items-start gap-2">
      {hasRealVideos ? (
        <span className="text-xs text-blumea-slate">
          Likes + comments per view, across {derived.analyzedCount} analyzed videos
        </span>
      ) : (
        <span className="text-xs text-blumea-slate">Connect an account to see this</span>
      )}
    </div>
  </div>
  {/* Interactions */}
 <div className="flex h-[240px] w-[160px] shrink-0 flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-blumea-slate">
          Interactions
        </p>

        <p className="mt-1 text-2xl font-semibold tracking-tight text-blumea-navy">
          {hasRealVideos ? (derived.interactions !== null ? formatCount(derived.interactions) : "—") : "—"}
        </p>
      </div>

      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blumea-mist text-blumea-blue">
        <MousePointerClick size={19} strokeWidth={1.8} />
      </div>
    </div>

    <div className="mt-5 flex flex-col items-start gap-2">
      {hasRealVideos ? (
        <>
          <span className="text-xs text-blumea-slate">
            Likes + comments on your {derived.analyzedCount} analyzed videos
          </span>
          <Breakdown
            parts={derived.interactionsByPlatform.map((part) => ({ label: platformLabel(part.platform), value: part.interactions }))}
          />
        </>
      ) : (
        <span className="text-xs text-blumea-slate">Connect an account to see this</span>
      )}
    </div>
  </div>
</div>
{/* Platform selector */}
<div className="flex w-[150px] flex-col gap-2">
  <p className="mb-1 text-sm font-medium text-blumea-slate">
    Platforms
  </p>

  {selectedPlatformCards.map((platform) => {
    const isSelected = selectedIds.includes(platform.id);

    return (
  <div
  key={platform.id}
  className="flex h-10 w-[170px] items-center rounded-xl border border-slate-200 bg-white px-3"
>
 <Image
  src={platform.image}
  alt=""
  width={18}
  height={18}
  className="h-[18px] w-[18px] shrink-0 object-contain"
/>

<span
  className={
    isSelected
      ? "ml-2 flex-1 text-left text-sm font-medium text-blumea-navy transition-colors duration-300"
      : "ml-2 flex-1 text-left text-sm font-medium text-slate-400 transition-colors duration-300"
  }
>
  {platform.label}
</span>
<button
  type="button"
  onClick={() => toggleDashboardPlatform(platform.id)}
  aria-pressed={isSelected}
  className={
  isSelected
    ? "relative ml-auto h-[20px] w-[36px] shrink-0 rounded-full bg-blumea-blue transition-colors duration-300"
    : "relative ml-auto h-[20px] w-[36px] shrink-0 rounded-full bg-slate-300 transition-colors duration-300"
}
>
  <span
    className={
      isSelected
        ? "absolute left-[2px] top-[2px] h-[16px] w-[16px] translate-x-[16px] rounded-full bg-white shadow-sm transition-transform duration-300"
        : "absolute left-[2px] top-[2px] h-[16px] w-[16px] translate-x-0 rounded-full bg-white shadow-sm transition-transform duration-300"
    }
  />
</button>
</div>
    );
  })}

  {canAddAnotherPlatform && (
    <button
      onClick={() => router.push("/connections")}
      className="mt-1 text-left text-xs font-semibold text-blumea-blue transition-opacity hover:opacity-70"
    >
      + Add a platform
    </button>
  )}
</div>
    </div>
    </div>
    <div className="mt-5 flex flex-col items-center">
  <button
    onClick={() => router.push("/analyze")}
    className="group flex items-center gap-2.5 rounded-full bg-blumea-navy px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-blumea-blue hover:shadow-md"
  >
   <PlaySquare
  size={19}
  strokeWidth={1.8}
  className="transition-transform duration-300 group-hover:scale-110"
/>

    Analyze my videos
  </button>

  <p className="mt-2 text-center text-xs text-blumea-slate">
    Pick a video and see what works in it.
  </p>
</div>
<section className="mt-5">
  <div className="mx-auto w-full max-w-7xl">
  
    <div className="mb-4">
    <h2 className="text-2xl font-semibold tracking-tight text-blumea-navy">
      Blumea Insights
    </h2>
  </div>

  {/* With an analyzed video the three cards are REAL (src/lib/insight-cards.ts, the
      same statements as the Insights page: each says how many videos it rests on,
      or that there isn't enough). Only an account with no analyzed video at all
      sees an empty-state note. */}
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
    {hasRealVideos
      ? realInsightCards(derived)
          .filter((card) => card.tone !== "fact")
          .map((card) => {
            const style = INSIGHT_TONE[card.tone as "working" | "opportunity" | "watch"];
            return (
              <div key={card.title} className="flex flex-col rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Image src={style.icon} alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
                  <p className={`text-sm font-medium ${style.text}`}>{style.label}</p>
                </div>

                <h3 className="text-lg font-semibold text-blumea-navy">{card.title}</h3>

                <p className="mt-2 text-sm leading-6 text-blumea-slate">{card.body}</p>

                <div className="mt-auto pt-4">
                  {card.tone === "opportunity" ? (
                    <button
                      onClick={() => router.push("/insights")}
                      className="self-start text-sm font-semibold text-blumea-blue hover:opacity-70"
                    >
                      Explore →
                    </button>
                  ) : card.evidence ? (
                    <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${style.chip}`}>{card.evidence}</span>
                  ) : null}
                </div>
              </div>
            );
          })
      : [(
          <div key="empty" className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-5 lg:col-span-3">
            <h3 className="text-lg font-semibold text-blumea-navy">Your insights will appear here.</h3>
            <p className="mt-2 text-sm leading-6 text-blumea-slate">
              Analyze a video and Blumea will start reading what works in your content. Each insight says how many of your videos it rests on.
            </p>
          </div>
        )]}
  </div>
</div>
</section>

<section className="mt-6">
  <div className="mx-auto w-full max-w-7xl">
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr_1fr]">
      
      {/* LEFT - Top Content */}
      <div>
       <div className="mb-4 flex items-end justify-between">
  <div>
    <h2 className="text-2xl font-semibold tracking-tight text-blumea-navy">
      Top Content
    </h2>

    <p className="mt-1 text-sm text-blumea-slate">
      {hasRealVideos
        ? derived.topPerPlatform
          ? "Your most-viewed analyzed video on each platform (views aren't comparable across platforms)."
          : "Your most-viewed analyzed videos."
        : "Your most-viewed videos."}
    </p>
  </div>

  <button
    onClick={() => router.push("/content")}
    className="text-sm font-semibold text-blumea-blue transition-opacity hover:opacity-70"
  >
    View all →
  </button>
</div>

       {hasRealVideos ? (
         <div className="grid grid-cols-3 gap-3">
           {derived.top.map((video, index) => (
             <button
               key={video.id}
               type="button"
               onClick={() => router.push(`/analysis/${video.id}`)}
               className="group overflow-hidden rounded-2xl border border-slate-200/70 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blumea-blue/40 hover:shadow-md"
             >
               <div className="relative aspect-[9/12] overflow-hidden bg-slate-100">
                 <Thumb video={video} />
                 {!derived.topPerPlatform && (
                   <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-blumea-navy shadow-sm">
                     #{index + 1}
                   </div>
                 )}
                 <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-blumea-navy shadow-sm">
                   {platformIcon[video.platform]}
                   <span>{platformLabel(video.platform)}</span>
                 </div>
               </div>

               <div className="p-3">
                 <p className="truncate text-sm font-semibold text-blumea-navy">{video.title}</p>
                 <div className="mt-2">
                   <span className="text-xs text-blumea-slate">{formatCount(video.views ?? 0)} views</span>
                 </div>
               </div>
             </button>
           ))}
         </div>
       ) : (
         <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-blumea-slate">
           Your most-viewed videos will show here once Blumea has analyzed some.
         </div>
       )}
      </div>


      {/* RIGHT - Trends: no real data source yet (doc/CLAUDE.md §7), so an honest note. */}
      <div>
        <div className="mb-2 text-left">
          <h2 className="text-2xl font-semibold tracking-tight text-blumea-navy">
              Trends for you

          </h2>

       
        </div>

  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5">
    <p className="text-sm font-semibold text-blumea-navy">Coming later</p>
    <p className="mt-1 text-xs leading-5 text-blumea-slate">
      Blumea shows a trend only when real data backs it up, and there is no official trend source for these platforms today.
    </p>
  </div>
      </div>

    </div>
  </div>
</section>
    </div>
  );
}
