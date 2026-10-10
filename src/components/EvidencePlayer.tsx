"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { formatTime } from "@/lib/format";
import type { Moment } from "@/lib/mock-data";

type EvidencePlayerProps = {
  title: string;
  thumbnail: string;
  durationSec: number;
  moments: Moment[];
  time: number;
  playing: boolean;
  onTimeChange: Dispatch<SetStateAction<number>>;
  onPlayingChange: (playing: boolean) => void;
};

// Mock of the Evidence Player. The real one will use each platform's own
// player/embed and seek it to the same timestamps. Blumea doesn't host video.
export default function EvidencePlayer({
  title,
  thumbnail,
  durationSec,
  moments,
  time,
  playing,
  onTimeChange,
  onPlayingChange,
}: EvidencePlayerProps) {
  useEffect(() => {
    if (!playing) {
      return;
    }

    const interval = setInterval(() => {
      onTimeChange((current) => Math.min(durationSec, current + 0.25));
    }, 250);

    return () => clearInterval(interval);
  }, [playing, durationSec, onTimeChange]);

  useEffect(() => {
    if (playing && time >= durationSec) {
      onPlayingChange(false);
    }
  }, [playing, time, durationSec, onPlayingChange]);

  const activeMoment = moments.find((moment) => Math.abs(moment.at - time) <= 1.5);

  function togglePlay() {
    if (!playing && time >= durationSec) {
      onTimeChange(0);
    }

    onPlayingChange(!playing);
  }

  function seek(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;

    onTimeChange(Math.min(durationSec, Math.max(0, ratio * durationSec)));
  }

  return (
    <div className="w-full max-w-[220px]">
      <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-blumea-navy shadow-sm">
        <Image src={thumbnail} alt={title} fill className="object-cover" />

        <div className="absolute inset-0 bg-gradient-to-t from-blumea-navy/70 via-transparent to-blumea-navy/10" />

        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-blumea-navy shadow-md transition-transform hover:scale-105"
        >
          {playing ? <Pause size={20} /> : <Play size={20} className="translate-x-px" />}
        </button>

        {activeMoment && (
          <div className="absolute inset-x-3 bottom-10 rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-blumea-navy shadow-sm">
            {activeMoment.label}
          </div>
        )}

        <div className="absolute inset-x-3 bottom-3">
          <div
            onClick={seek}
            role="slider"
            aria-label="Video position"
            aria-valuemin={0}
            aria-valuemax={durationSec}
            aria-valuenow={Math.round(time)}
            tabIndex={0}
            className="relative h-1.5 cursor-pointer rounded-full bg-white/40"
          >
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${(time / durationSec) * 100}%` }}
            />

            {moments.map((moment) => (
              <span
                key={`${moment.at}-${moment.label}`}
                className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blumea-navy bg-blumea-blue"
                style={{ left: `${(moment.at / durationSec) * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-blumea-slate">
        {formatTime(time)} / {formatTime(durationSec)}
      </p>
    </div>
  );
}
