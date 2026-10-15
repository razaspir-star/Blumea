"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, Smartphone, UploadCloud } from "lucide-react";
import BlumeaFlowerLoader from "@/components/BlumeaFlowerLoader";
import { supabase } from "@/lib/supabase";
import { uploadTiktokVideo, type UploadStage } from "@/lib/tiktok-upload-client";
import TiktokScreensPicker from "@/components/TiktokScreensPicker";
import { useT } from "@/lib/i18n/client";

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
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [screens, setScreens] = useState<File[]>([]);
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
  // The parent passes a new onDone function on every render. Keep the latest in a
  // ref so the polling below is NOT restarted each time (a restart before the
  // first tick meant it could never fire).
  // The analyses this video already had when the step opened (no clocks involved:
  // anything new that appears later is the one we are waiting for).
  const knownProfiles = useRef<Set<string> | null>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    async function poll() {
      const { data: progress } = await supabase
        .from("upload_progress")
        .select("stage, message")
        .eq("platform_video_id", video.platformVideoId)
        .maybeSingle();
      setRemote(progress ? { stage: progress.stage as string, message: (progress.message as string | null) ?? null } : null);

      // Only an analysis that appears AFTER this step opened counts: a video
      // analyzed before must not jump straight to its old result.
      const { data } = await supabase
        .from("videos")
        .select("id, video_ai_profiles(id)")
        .eq("platform", "tiktok")
        .eq("platform_video_id", video.platformVideoId)
        .maybeSingle();
      const profiles = (data as { id: string; video_ai_profiles: { id: string }[] } | null)?.video_ai_profiles ?? [];
      if (knownProfiles.current === null) {
        knownProfiles.current = new Set(profiles.map((profile) => profile.id));
        return;
      }
      if (data && profiles.some((profile) => !knownProfiles.current?.has(profile.id))) onDoneRef.current(data.id);
    }
    poll();
    const timer = setInterval(poll, 2000);
    return () => clearInterval(timer);
  }, [video.platformVideoId]);

  async function startAnalysis() {
    if (!file) return;
    setError(null);
    const result = await uploadTiktokVideo({ file, screenshots: screens, platformVideoId: video.platformVideoId, onStage: setStage, t });
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
        ? { title: t("tiktokUpload.phoneOpenedTitle"), body: t("tiktokUpload.phoneOpenedBody") }
        : remote.stage === "uploading"
          ? { title: t("tiktokUpload.phoneUploadingTitle"), body: t("tiktokUpload.phoneUploadingBody") }
          : { title: t("tiktokUpload.phoneReadingTitle"), body: t("tiktokUpload.phoneReadingBody") };
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
          {stage === "uploading" ? t("tiktokUpload.uploadingTitle") : t("tiktokUpload.readingTitle")}
        </h3>

        <p className="mt-2 max-w-sm text-sm text-blumea-slate">
          {stage === "uploading" ? t("tiktokUpload.uploadingBody") : t("tiktokUpload.readingBody")}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5">
      {qr && (
        <div className="hidden items-center gap-5 rounded-2xl border border-slate-200 bg-white p-4 sm:flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={t("tiktokUpload.qrAlt")} width={110} height={110} className="shrink-0" />
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-blumea-navy">
              <Smartphone size={16} strokeWidth={1.8} className="text-blumea-blue" />
              {t("tiktokUpload.easier")}
            </p>
            <p className="mt-1 text-sm leading-6 text-blumea-slate">
              {t("tiktokUpload.qrBody")}
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

        <p className="mt-3 text-sm font-semibold text-blumea-navy">{t("tiktokUpload.drop")}</p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-full border border-blumea-navy px-4 py-2 text-sm font-semibold text-blumea-navy transition-colors hover:bg-blumea-navy hover:text-white"
        >
          {t("tiktokUpload.chooseFile")}
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

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-blumea-navy">{t("tiktokUpload.optional")}</p>
        <div className="mt-2">
          <TiktokScreensPicker files={screens} onChange={setScreens} compact />
        </div>
      </div>

      {remote?.stage === "failed" && (
        <p className="mt-3 text-sm text-red-500">{remote.message ?? t("tiktokUpload.phoneFailed")}</p>
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
          {t("tiktokUpload.analyze")}
        </button>
      </div>
    </div>
  );
}
