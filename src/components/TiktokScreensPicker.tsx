"use client";

import { useRef } from "react";
import { Check, ImagePlus } from "lucide-react";
import { MAX_SCREENSHOTS } from "@/lib/tiktok-upload-client";
import { useT } from "@/lib/i18n/client";
import { rich } from "@/lib/i18n/rich";

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
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const bold = (text: string) => <span className="font-semibold text-blumea-navy">{text}</span>;

  return (
    <div className={compact ? "" : "sm:grid sm:grid-cols-[minmax(0,1fr)_200px] sm:items-start sm:gap-5"}>
      {/* Muted loop that starts by itself: the three screens, the screenshot moments and the way back to Blumea.
          Stacked above the steps on a phone, beside the steps and the upload button on a wide screen.
          (Two versions of the video: English and Hebrew captions, built by C:\TiktokGuide\build-guide-v3.mjs.) */}
      <video
        className="mx-auto mb-3 w-full max-w-[170px] rounded-xl bg-slate-100 sm:order-2 sm:mb-0 sm:max-w-none"
        key={t.locale}
        src={t.locale === "he" ? "/guides/tiktok-analytics-guide-he.mp4?v=1" : "/guides/tiktok-analytics-guide.mp4?v=4"}
        poster={t.locale === "he" ? "/guides/tiktok-analytics-guide-he-poster.jpg" : "/guides/tiktok-analytics-guide-poster.jpg"}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-label={t("picker.videoLabel")}
      />

      <div className="sm:order-1">
        <p className="text-sm font-semibold text-blumea-navy">{t("picker.title")}</p>
        <ol className="mt-1 list-decimal space-y-1 ps-5 text-sm leading-6 text-blumea-slate">
          <li>
            {rich(t("picker.step1"), {
              profile: bold(t("picker.step1Profile")),
              more: <span dir="ltr" className="font-semibold text-blumea-navy">{t("picker.step1More")}</span>,
            })}
          </li>
          <li>
            {rich(t("picker.step2"), {
              video: <span dir="ltr" className="font-semibold text-blumea-navy">{t("picker.step2Video")}</span>,
            })}
            <ul className="mt-0.5 list-disc space-y-0.5 ps-4">
              <li>{t("picker.shot1")}</li>
              <li>{t("picker.shot2")}</li>
              <li>{t("picker.shot3")}</li>
            </ul>
          </li>
          <li>{t("picker.step3")}</li>
        </ol>

        {!compact && <p className="mt-2 text-xs leading-5 text-blumea-slate">{t("picker.note")}</p>}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-blumea-mist/50 px-4 py-4 text-sm font-semibold text-blumea-navy"
        >
          {files.length > 0 ? (
            <>
              <Check size={18} strokeWidth={2.2} className="text-blumea-success" />
              {t.plural("picker.chosen", files.length)}
            </>
          ) : (
            <>
              <ImagePlus size={18} strokeWidth={1.8} className="text-blumea-blue" />
              {t("picker.choose")}
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
