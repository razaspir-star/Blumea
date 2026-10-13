"use client";

import { useRef } from "react";
import { Camera, Check, ImagePlus } from "lucide-react";
import { MAX_SCREENSHOTS } from "@/lib/tiktok-upload-client";

// What to look for on each screenshot: the words TikTok prints on that screen, so
// the creator can tell at a glance they are on the right one.
const SHOTS: { title: string; where: string; see: string[] }[] = [
  {
    title: "Screenshot 1",
    where: "On the Overview tab, at the top.",
    see: ["Key metrics", "Video views", "Total play time", "Average watch time", "Watched full video"],
  },
  {
    title: "Screenshot 2",
    where: "Still on Overview: scroll down a little.",
    see: ["Retention rate (the graph)", "Traffic sources", "For You"],
  },
  {
    title: "Screenshot 3",
    where: "Tap the Viewers tab. Stay at the top.",
    see: ["Total viewers", "Viewer types", "New / Returning viewers", "Followers / Non-followers"],
  },
];

// Optional: the creator shares screenshots of the video's analytics screens in
// the TikTok app, so Blumea can show how people watched it (TikTok gives apps no
// watch time). Says exactly how to get there and what to capture, and takes
// several pictures in one go. Used on the phone page, in the upload step and on
// the analysis page.
export default function TiktokScreensPicker({
  files,
  onChange,
  compact = false,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={compact ? "" : "sm:grid sm:grid-cols-[minmax(0,1fr)_200px] sm:items-start sm:gap-5"}>
      {/* Muted loop that starts by itself: the three screens, the screenshot moments and the way back to Blumea.
          Stacked above the steps on a phone, beside the steps and the upload button on a wide screen. */}
      <video
        className="mx-auto mb-3 w-full max-w-[170px] rounded-xl bg-slate-100 sm:order-2 sm:mb-0 sm:max-w-none"
        src="/guides/tiktok-analytics-guide.mp4?v=2"
        poster="/guides/tiktok-analytics-guide-poster.jpg"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-label="Short animation: how to take the three screenshots in TikTok"
      />

      <div className="sm:order-1">
      <p className="text-sm font-semibold text-blumea-navy">How to get to the numbers</p>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm leading-6 text-blumea-slate">
        <li>
          In TikTok, go to your <span className="font-semibold text-blumea-navy">Profile</span> and open the video{" "}
          <span className="font-semibold text-blumea-navy">from there</span>. (Opened from a link, TikTok doesn&apos;t show the button.)
        </li>
        <li>
          Tap <span className="font-semibold text-blumea-navy">More insights</span> under the video. A screen called{" "}
          <span className="font-semibold text-blumea-navy">Video analysis</span> opens.
        </li>
        <li>Take the three screenshots below (side button and volume up). No need to crop.</li>
      </ol>

      <div className="mt-3 space-y-2">
        {SHOTS.map((shot) => (
          <div key={shot.title} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-blumea-navy">
              <Camera size={15} strokeWidth={1.8} className="text-blumea-blue" />
              {shot.title}
              <span className="font-normal text-blumea-slate">· {shot.where}</span>
            </p>
            <p className="mt-2 flex flex-wrap gap-1.5">
              {shot.see.map((word) => (
                <span key={word} className="rounded-md bg-blumea-mist px-2 py-1 text-xs text-blumea-slate">
                  {word}
                </span>
              ))}
            </p>
          </div>
        ))}
      </div>

      {!compact && (
        <p className="mt-2 text-xs leading-5 text-blumea-slate">
          Two are enough, three are best; a few extra don&apos;t hurt. The words above are what to look for on the screen (they may
          look a little different in your language). Choose all the pictures together, in one go. Blumea reads the numbers and deletes
          the pictures right after, and marks these numbers as coming from your screenshots.
        </p>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-blumea-mist/50 px-4 py-4 text-sm font-semibold text-blumea-navy"
      >
        {files.length > 0 ? (
          <>
            <Check size={18} strokeWidth={2.2} className="text-blumea-success" />
            {files.length} {files.length === 1 ? "screenshot" : "screenshots"} chosen
          </>
        ) : (
          <>
            <ImagePlus size={18} strokeWidth={1.8} className="text-blumea-blue" />
            Choose the screenshots
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => onChange(Array.from(event.target.files ?? []).slice(0, MAX_SCREENSHOTS))}
      />
      </div>
    </div>
  );
}
