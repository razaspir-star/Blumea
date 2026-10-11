"use client";

import { useState } from "react";
import { Clock3 } from "lucide-react";
import BlumeaFlowerLoader from "@/components/BlumeaFlowerLoader";
import TiktokScreensPicker from "@/components/TiktokScreensPicker";
import type { TiktokScreenStats } from "@/lib/tiktok-screens";
import { uploadTiktokScreens } from "@/lib/tiktok-upload-client";
import { formatCount } from "@/lib/format";

export type SavedTiktokScreens = TiktokScreenStats & { readAt: string };

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
const pctText = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1)}%`;

// Lets the creator share (more) screenshots of this video's TikTok analytics.
function AddNumbers({ platformVideoId, label }: { platformVideoId: string; label: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    const result = await uploadTiktokScreens({ screenshots: files, platformVideoId });
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  if (busy) {
    return (
      <div className="mt-4 flex items-center gap-3">
        <BlumeaFlowerLoader size={28} />
        <p className="text-sm text-blumea-slate">Reading your screenshots…</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <TiktokScreensPicker files={files} onChange={setFiles} compact />
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <button
        type="button"
        disabled={files.length === 0}
        onClick={send}
        className={
          files.length > 0
            ? "mt-3 rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue"
            : "mt-3 cursor-not-allowed rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-400"
        }
      >
        {label}
      </button>
    </div>
  );
}

// "How viewers watched" for a TikTok video, from the creator's own screenshots of
// TikTok's video analytics. Labelled as such: these numbers come from the creator,
// not from a TikTok API.
export default function TiktokViewerCard({
  platformVideoId,
  stats,
  durationSec,
}: {
  platformVideoId: string;
  stats: SavedTiktokScreens | null;
  durationSec: number | null;
}) {
  if (!stats) {
    return (
      <section className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4">
        <div className="flex items-center gap-2 text-blumea-slate">
          <Clock3 size={16} strokeWidth={1.8} className="text-blumea-blue" />
          <span className="text-sm font-semibold">How viewers watched</span>
        </div>
        <AddNumbers platformVideoId={platformVideoId} label="Read my screenshots" />
      </section>
    );
  }

  const duration = stats.videoDurationSec ?? durationSec;
  const tiles: { label: string; value: string; note?: string }[] = [];
  if (stats.avgWatchSec !== null) {
    tiles.push({
      label: "Average watch",
      value: `${stats.avgWatchSec} s`,
      note: duration ? `of a ${Math.round(duration)} s video${stats.avgPercentWatched !== null ? ` (${pctText(stats.avgPercentWatched)})` : ""}` : undefined,
    });
  }
  if (stats.watchedFullPct !== null) tiles.push({ label: "Watched to the end", value: pctText(stats.watchedFullPct) });
  if (stats.mostStoppedAtSec !== null) tiles.push({ label: "Most stopped at", value: clock(stats.mostStoppedAtSec) });
  if (stats.newFollowers !== null) tiles.push({ label: "New followers", value: formatCount(stats.newFollowers) });
  if (stats.saves !== null) tiles.push({ label: "Saves", value: formatCount(stats.saves) });

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold tracking-tight text-blumea-navy">How viewers watched</h2>
      <p className="mt-1 text-sm text-blumea-slate">
        From your TikTok screenshots, read on {new Date(stats.readAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}. Only you can see this.
      </p>

      {tiles.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
              <p className="text-xs text-blumea-slate">{tile.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-blumea-navy">{tile.value}</p>
              {tile.note && <p className="mt-1 text-xs text-blumea-slate">{tile.note}</p>}
            </div>
          ))}
        </div>
      )}

      {stats.trafficSources.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-blumea-navy">Where viewers came from</p>
          <div className="mt-3 space-y-2">
            {stats.trafficSources
              .filter((source) => source.pct > 0)
              .map((source) => (
                <div key={source.name}>
                  <div className="flex justify-between text-sm text-blumea-slate">
                    <span>{source.name}</span>
                    <span>{pctText(source.pct)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blumea-blue" style={{ width: `${Math.min(source.pct, 100)}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {(stats.followersPct !== null || stats.newViewersPct !== null) && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {stats.followersPct !== null && stats.nonFollowersPct !== null && (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-blumea-navy">Followers and others</p>
              <p className="mt-2 text-sm text-blumea-slate">
                {pctText(stats.followersPct)} followers · {pctText(stats.nonFollowersPct)} not following you
              </p>
            </div>
          )}
          {stats.newViewersPct !== null && stats.returningViewersPct !== null && (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-blumea-navy">New and returning viewers</p>
              <p className="mt-2 text-sm text-blumea-slate">
                {pctText(stats.newViewersPct)} new · {pctText(stats.returningViewersPct)} returning
              </p>
            </div>
          )}
        </div>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold text-blumea-blue">Update with new screenshots</summary>
        <AddNumbers platformVideoId={platformVideoId} label="Read my screenshots" />
      </details>
    </section>
  );
}
