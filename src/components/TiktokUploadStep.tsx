"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, Smartphone, UploadCloud } from "lucide-react";
import BlumeaFlowerLoader from "@/components/BlumeaFlowerLoader";
import { supabase } from "@/lib/supabase";
import { uploadTiktokVideo, type UploadStage } from "@/lib/tiktok-upload-client";

type TiktokUploadStepProps = {
  video: { platformVideoId: string; title: string };
  // Called with the real video UUID (Supabase row id) once analysis succeeds.
  onDone: (realVideoId: string) => void;
};

// Real Deep-upload analysis for a TikTok video the creator saved (see
// AnalyzeModal.tsx). Two ways in: choose the saved file on this device, or scan a
// QR code on the computer and upload from the phone, where TikTok's "Save video"
// exists. The file goes straight to temporary storage and is deleted right after
// analysis (doc/CLAUDE.md §8).
export default function TiktokUploadStep({ video, onDone }: TiktokUploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  // What the phone is doing (live progress written by the server).
  const [remote, setRemote] = useState<{ stage: string; message: string | null } | null>(null);

  // A link for the creator's phone, shown as a QR code. Valid for 15 minutes.
  useEffect(() => {
    let cancelled = false;
    async function makeQr() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const response = await fetch("/api/handoff/tiktok", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ platformVideoId: video.platformVideoId }),
      });
      if (!response.ok) return;
      const { url } = await response.json();
      const image = await QRCode.toDataURL(url, { margin: 1, width: 220 });
      if (!cancelled) setQr(image);
    }
    makeQr().catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [video.platformVideoId]);

  // When the upload is made from the phone, the analysis appears in the creator's
  // library: notice it here and move on.
  useEffect(() => {
    const timer = setInterval(async () => {
      const { data: progress } = await supabase
        .from("upload_progress")
        .select("stage, message")
        .eq("platform_video_id", video.platformVideoId)
        .maybeSingle();
      setRemote(progress ? { stage: progress.stage as string, message: (progress.message as string | null) ?? null } : null);

      const { data } = await supabase
        .from("videos")
        .select("id, video_ai_profiles(id)")
        .eq("platform", "tiktok")
        .eq("platform_video_id", video.platformVideoId)
        .maybeSingle();
      const profiles = (data as { id: string; video_ai_profiles: unknown[] } | null)?.video_ai_profiles;
      if (data && Array.isArray(profiles) && profiles.length > 0) onDone(data.id);
    }, 2000);
    return () => clearInterval(timer);
  }, [video.platformVideoId, onDone]);

  async function startAnalysis() {
    if (!file) return;
    setError(null);
    const result = await uploadTiktokVideo({ file, platformVideoId: video.platformVideoId, onStage: setStage });
    if (!result.ok) {
      setError(result.error);
      setStage(null);
      return;
    }
    onDone(result.videoId);
  }

  // The phone is working on it: show that right away, with what it is doing.
  if (!stage && remote && ["opened", "uploading", "analyzing"].includes(remote.stage)) {
    const text =
      remote.stage === "opened"
        ? { title: "Your phone opened the page", body: "Choose the saved video there, and tap Send to Blumea." }
        : remote.stage === "uploading"
          ? { title: "Uploading from your phone", body: "Keep the page open on your phone. This can take a little, depending on the connection." }
          : { title: "Blumea is reading your video", body: "About a minute. This window moves on by itself when it is done." };
    return (
      <div className="mt-5 flex flex-col items-center py-8 text-center">
        <BlumeaFlowerLoader size={56} />
        <h3 className="mt-5 text-lg font-semibold text-blumea-navy">{text.title}</h3>
        <p className="mt-2 max-w-sm text-sm text-blumea-slate">{text.body}</p>
      </div>
    );
  }

  if (stage) {
    return (
      <div className="mt-5 flex flex-col items-center py-8 text-center">
        <BlumeaFlowerLoader size={56} />

        <h3 className="mt-5 text-lg font-semibold text-blumea-navy">
          {stage === "uploading" ? "Uploading your video" : "Reading your video"}
        </h3>

        <p className="mt-2 max-w-sm text-sm text-blumea-slate">
          {stage === "uploading"
            ? "Keep this window open. The file is only held for the analysis and deleted right after."
            : "This takes about a minute."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5">
      {qr && (
        <div className="hidden items-center gap-5 rounded-2xl border border-slate-200 bg-white p-4 sm:flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code to upload from your phone" width={110} height={110} className="shrink-0" />
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-blumea-navy">
              <Smartphone size={16} strokeWidth={1.8} className="text-blumea-blue" />
              Easier from your phone
            </p>
            <p className="mt-1 text-sm leading-6 text-blumea-slate">
              Scan this with your phone camera. On the page that opens you can open the video in TikTok to save it, then pick it. This
              window shows what your phone is doing and moves on by itself when it&apos;s done.
            </p>
          </div>
        </div>
      )}

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const dropped = event.dataTransfer.files?.[0];
          if (dropped) setFile(dropped);
        }}
        className="mt-4 flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 bg-blumea-mist/50 px-6 py-8 text-center"
      >
        <UploadCloud size={28} strokeWidth={1.6} className="text-blumea-blue" />

        <p className="mt-3 text-sm font-semibold text-blumea-navy">Or drop the saved video here</p>

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

      {remote?.stage === "failed" && (
        <p className="mt-3 text-sm text-red-500">{remote.message ?? "Something went wrong with the upload from your phone."}</p>
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
