"use client";

import { use, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, ExternalLink, UploadCloud } from "lucide-react";
import BlumeaFlowerLoader from "@/components/BlumeaFlowerLoader";
import { uploadTiktokVideo, type UploadStage } from "@/lib/tiktok-upload-client";

// The video id carried by the link (not a secret: it is the creator's own video).
function videoIdOf(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.v === "string" ? payload.v : null;
  } catch {
    return null;
  }
}

// The page a creator's phone opens after scanning the QR code on the computer.
// No sign-in: the link itself (signed, one video, 15 minutes) carries the
// permission. Mobile first; see src/lib/handoff-token.ts.
export default function HandoffPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const videoId = videoIdOf(token);
  const [expired, setExpired] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/handoff/tiktok?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) setExpired(true);
        else {
          setTitle(body.title);
          setShareUrl(body.shareUrl ?? null);
        }
      })
      .catch(() => setExpired(true));
  }, [token]);

  async function send() {
    if (!file || !videoId) return;
    setError(null);
    const result = await uploadTiktokVideo({ file, platformVideoId: videoId, handoffToken: token, onStage: setStage });
    setStage(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-white to-sky-50 px-6 py-10">
      <Image src="/blumea-logo-v2.png" alt="Blumea" width={56} height={56} />

      <div className="mt-8 w-full max-w-md rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
        {expired || !videoId ? (
          <>
            <h1 className="text-xl font-semibold text-blumea-navy">This link has expired</h1>
            <p className="mt-2 text-sm leading-6 text-blumea-slate">Open Blumea on your computer and scan a new code.</p>
          </>
        ) : done ? (
          <>
            <div className="flex items-center gap-2 text-blumea-success">
              <Check size={22} strokeWidth={2.4} />
              <h1 className="text-xl font-semibold text-blumea-navy">Done</h1>
            </div>
            <p className="mt-2 text-sm leading-6 text-blumea-slate">
              Your video was read. Go back to your computer, where Blumea shows what it understood. The file has been deleted.
            </p>
          </>
        ) : stage ? (
          <div className="flex flex-col items-center py-6 text-center">
            <BlumeaFlowerLoader size={56} />
            <h1 className="mt-5 text-lg font-semibold text-blumea-navy">
              {stage === "uploading" ? "Uploading your video" : "Reading your video"}
            </h1>
            <p className="mt-2 text-sm text-blumea-slate">
              {stage === "uploading" ? "Keep this page open." : "This takes about a minute."}
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-blumea-navy">Upload your TikTok video</h1>
            <p className="mt-2 text-sm leading-6 text-blumea-slate">{title ? `For: ${title}` : "Loading…"}</p>

            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-blumea-slate">Step 1 · Get the video</p>

            {shareUrl ? (
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-blumea-navy px-4 py-4 text-sm font-semibold text-white"
              >
                <ExternalLink size={18} strokeWidth={1.8} />
                Open the video in TikTok
              </a>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-blumea-slate">
              In TikTok tap Share, then Save video. Then come back to this page. If the video is already saved on your phone, skip
              to step 2.
            </p>

            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-blumea-slate">Step 2 · Send it to Blumea</p>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-blumea-mist/50 px-4 py-6 text-sm font-semibold text-blumea-navy"
            >
              <UploadCloud size={20} strokeWidth={1.8} className="text-blumea-blue" />
              {file ? file.name : "Choose the saved video"}
            </button>

            <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <button
              type="button"
              disabled={!file}
              onClick={send}
              className={
                file
                  ? "mt-4 w-full rounded-full bg-blumea-navy px-5 py-3 text-sm font-semibold text-white"
                  : "mt-4 w-full cursor-not-allowed rounded-full bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-400"
              }
            >
              Send to Blumea
            </button>

            <p className="mt-4 text-xs leading-5 text-blumea-slate">
              The video is only held while Blumea reads it, and deleted right after.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
