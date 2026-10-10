"use client";

import { useRef, useState } from "react";
import { Check, UploadCloud } from "lucide-react";
import BlumeaFlowerLoader from "@/components/BlumeaFlowerLoader";
import { supabase } from "@/lib/supabase";

type TiktokUploadStepProps = {
  video: { platformVideoId: string; title: string };
  // Called with the real video UUID (Supabase row id) once analysis succeeds.
  onDone: (realVideoId: string) => void;
};

// Real Deep-upload analysis for a TikTok video the creator saved and is now
// uploading (see AnalyzeModal.tsx). Unlike mock UploadStep.tsx, this file is
// actually sent -- to Gemini's Files API, via /api/analyze/tiktok-upload --
// and deleted right after analysis (doc/CLAUDE.md §8).
export default function TiktokUploadStep({ video, onDone }: TiktokUploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startAnalysis() {
    if (!file) return;
    setUploading(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError("Not signed in.");
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("platformVideoId", video.platformVideoId);

    const response = await fetch("/api/analyze/tiktok-upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "Analysis failed.");
      setUploading(false);
      return;
    }

    onDone(body.video.id);
  }

  if (uploading) {
    return (
      <div className="mt-5 flex flex-col items-center py-8 text-center">
        <BlumeaFlowerLoader size={56} />

        <h3 className="mt-5 text-lg font-semibold text-blumea-navy">Analyzing your video</h3>

        <p className="mt-2 max-w-sm text-sm text-blumea-slate">
          Uploading and reading the file — full files take a bit longer than usual.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const dropped = event.dataTransfer.files?.[0];
          if (dropped) setFile(dropped);
        }}
        className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 bg-blumea-mist/50 px-6 py-8 text-center"
      >
        <UploadCloud size={28} strokeWidth={1.6} className="text-blumea-blue" />

        <p className="mt-3 text-sm font-semibold text-blumea-navy">Drop the saved video here</p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-full border border-blumea-navy px-4 py-2 text-sm font-semibold text-blumea-navy transition-colors hover:bg-blumea-navy hover:text-white"
        >
          Choose file
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </div>

      {file && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
          <Check size={16} strokeWidth={2.2} className="shrink-0 text-blumea-success" />
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-blumea-navy">{file.name}</p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          disabled={!file}
          onClick={startAnalysis}
          className={
            file
              ? "rounded-full bg-blumea-navy px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blumea-blue"
              : "cursor-not-allowed rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-400"
          }
        >
          Analyze video
        </button>
      </div>
    </div>
  );
}
