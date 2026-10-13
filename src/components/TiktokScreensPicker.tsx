"use client";

import { useRef } from "react";
import { Check, ImagePlus } from "lucide-react";
import { MAX_SCREENSHOTS } from "@/lib/tiktok-upload-client";

// Optional: the creator shares screenshots of the video's analytics screens in
// the TikTok app, so Blumea can show how people watched it (TikTok gives apps no
// watch time). The looping guide video does most of the explaining; the text
// stays short. Takes several pictures in one go. Used on the phone page, in the
// upload step and on the analysis page.
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
        src="/guides/tiktok-analytics-guide.mp4?v=4"
        poster="/guides/tiktok-analytics-guide-poster.jpg"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-label="Short animation: how to take the three screenshots in TikTok"
      />

      <div className="sm:order-1">
        <p className="text-sm font-semibold text-blumea-navy">Add your TikTok numbers</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm leading-6 text-blumea-slate">
          <li>
            In TikTok, open the video <span className="font-semibold text-blumea-navy">from your Profile</span> (not from a link) and tap{" "}
            <span className="font-semibold text-blumea-navy">More insights</span>.
          </li>
          <li>
            Take 3 screenshots in <span className="font-semibold text-blumea-navy">Video analysis</span>:
            <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
              <li>Overview, top of the screen</li>
              <li>Overview, scrolled down to the graph</li>
              <li>Viewers tab, top of the screen</li>
            </ul>
          </li>
          <li>Back here, choose them all together.</li>
        </ol>

        {!compact && (
          <p className="mt-2 text-xs leading-5 text-blumea-slate">
            Two are enough. Blumea reads the numbers and deletes the pictures right after.
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
