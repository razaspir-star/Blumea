"use client";

import { useEffect, useRef, useState } from "react";
import { Check, UploadCloud } from "lucide-react";
import BlumeaFlowerLoader from "@/components/BlumeaFlowerLoader";
import { useMockStore } from "@/lib/mock-store";
import { getAnalysisMode, seedAnalyzedIds, videos, type Video } from "@/lib/mock-data";

type UploadStepProps = {
  video: Video;
  onDone: (uploadedIds: string[]) => void;
};

// Mock of the optional Deep upload, shared by the Analyze flow (offered in the
// same step as Lite, per the locked upload flow) and the analysis page (offered
// later as an upgrade). Files are never sent anywhere in this prototype. The
// real flow accepts several files at once and matches each one to a video from
// the API (by duration and cover similarity), so the creator doesn't pick per file.
export default function UploadStep({ video, onDone }: UploadStepProps) {
  const { deepIds, markDeep } = useMockStore(seedAnalyzedIds);
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);

  // Candidates for auto-matching: this video first, then other videos that also need an upload.
  const candidates = [
    video,
    ...videos.filter(
      (other) => other.id !== video.id && getAnalysisMode(other, deepIds) === "lite"
    ),
  ];

  const matches = files.map((file, index) => ({ file, video: candidates[index] }));
  const matched = matches.filter((match) => match.video);
  const matchedIds = matched.map((match) => match.video.id).join(",");

  useEffect(() => {
    if (!processing) {
      return;
    }

    const timer = setTimeout(() => {
      const ids = matchedIds.split(",").filter(Boolean);
      markDeep(ids);
      onDone(ids);
    }, 2400);

    return () => clearTimeout(timer);
  }, [processing, matchedIds, markDeep, onDone]);

  function addFiles(list: FileList | null) {
    if (!list) {
      return;
    }

    setFiles((current) => [...current, ...Array.from(list)]);
  }

  if (processing) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <BlumeaFlowerLoader size={64} />

        <h3 className="mt-6 text-xl font-semibold text-blumea-navy">Going deeper</h3>

        <p className="mt-2 max-w-sm text-sm text-blumea-slate">
          Reading frames, audio and on-screen text.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
        className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 bg-blumea-mist/50 px-6 py-8 text-center"
      >
        <UploadCloud size={30} strokeWidth={1.6} className="text-blumea-blue" />

        <p className="mt-3 text-sm font-semibold text-blumea-navy">
          Drop one or more videos here
        </p>

        <p className="mt-1 text-xs text-blumea-slate">
          Blumea matches each file to the right video for you.
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-full border border-blumea-navy px-4 py-2 text-sm font-semibold text-blumea-navy transition-colors hover:bg-blumea-navy hover:text-white"
        >
          Choose files
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(event) => addFiles(event.target.files)}
        />
      </div>

      {matches.length > 0 && (
        <ul className="mt-5 space-y-2">
          {matches.map((match, index) => (
            <li
              key={`${match.file.name}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5"
            >
              <Check size={16} strokeWidth={2.2} className="shrink-0 text-blumea-success" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-blumea-navy">
                  {match.file.name}
                </p>

                <p className="truncate text-xs text-blumea-slate">
                  {match.video ? `Matched to “${match.video.title}”` : "No matching video found"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={matched.length === 0}
          onClick={() => setProcessing(true)}
          className={
            matched.length > 0
              ? "rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blumea-blue"
              : "cursor-not-allowed rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-400"
          }
        >
          Analyze {matched.length > 1 ? `${matched.length} videos` : "video"}
        </button>
      </div>
    </div>
  );
}
