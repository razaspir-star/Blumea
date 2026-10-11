"use client";

import { useRef } from "react";
import { Check, ImagePlus } from "lucide-react";
import { MAX_SCREENSHOTS } from "@/lib/tiktok-upload-client";

// Optional: the creator shares screenshots of the video's analytics screens in
// the TikTok app, so Blumea can show how people watched it (TikTok gives apps no
// watch time). Says exactly what to capture, and takes several pictures in one
// go. Used on the phone page, in the upload step and on the analysis page.
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
    <div>
      <p className="text-sm leading-6 text-blumea-slate">
        TikTok shows how people watched a video only inside its own app. To see it in Blumea, open the video in TikTok, tap{" "}
        <span className="font-semibold text-blumea-navy">⋯ then Analytics</span> (the name can differ a little in your language), and
        take screenshots of:
      </p>

      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-blumea-slate">
        <li>
          <span className="font-semibold text-blumea-navy">Overview, the top:</span> views, play time, average watch time.
        </li>
        <li>
          <span className="font-semibold text-blumea-navy">Overview, scrolled down:</span> retention rate and traffic sources.
        </li>
        <li>
          <span className="font-semibold text-blumea-navy">Viewers, the top:</span> new vs returning, followers vs non-followers.
        </li>
      </ol>

      {!compact && (
        <p className="mt-2 text-xs leading-5 text-blumea-slate">
          Two is enough, three is best. Choose them all together in one go. Blumea reads the numbers and deletes the pictures right
          after, and marks these numbers as coming from your screenshots.
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
  );
}
