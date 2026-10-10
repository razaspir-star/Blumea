"use client";

import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useProfile } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { useMockStore, type ConnectionStatus } from "@/lib/mock-store";
import { platformCapabilities, platformLabels, seedAnalyzedIds, type PlatformId } from "@/lib/mock-data";

const youtubeErrorMessages: Record<string, string> = {
  missing_params: "The connection didn't complete. Please try again.",
  invalid_state: "That connection link expired. Please try again.",
  token_exchange_failed: "Google didn't accept the connection. Please try again.",
  no_refresh_token: "Google didn't grant lasting access — please try again and accept the prompt.",
  secret_storage_failed: "Something went wrong saving the connection. Please try again.",
  save_failed: "Something went wrong saving the connection. Please try again.",
  access_denied: "Connection cancelled.",
};

const tiktokErrorMessages: Record<string, string> = {
  missing_params: "The connection didn't complete. Please try again.",
  invalid_state: "That connection link expired. Please try again.",
  token_exchange_failed: "TikTok didn't accept the connection. Please try again.",
  no_refresh_token: "TikTok didn't grant lasting access. Please try again.",
  secret_storage_failed: "Something went wrong saving the connection. Please try again.",
  save_failed: "Something went wrong saving the connection. Please try again.",
  access_denied: "Connection cancelled.",
};

// Real for YouTube and TikTok (the platforms actually reachable today, see
// doc/CLAUDE.md §10); Instagram stays mock until its app review is approved.
function usePlatformConnection(
  platform: "youtube" | "tiktok",
  connectedParam: string,
  errorParam: string,
  connectedMessage: string,
  errorMessages: Record<string, string>
) {
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const connectedNotice = searchParams.get(connectedParam) ? connectedMessage : null;
  const errorCode = searchParams.get(errorParam);
  const errorNotice = errorCode ? errorMessages[errorCode] ?? "Something went wrong." : null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("connected_accounts")
        .select("handle")
        .eq("platform", platform)
        .maybeSingle();
      if (!cancelled) {
        setConnected(Boolean(data));
        setHandle(data?.handle ?? null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [connectedNotice, platform]);

  async function connect() {
    setBusy(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setBusy(false);
      return;
    }

    const response = await fetch(`/api/connections/${platform}/authorize`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!response.ok) {
      setBusy(false);
      return;
    }

    const { url } = await response.json();
    window.location.href = url;
  }

  async function disconnect() {
    setBusy(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setBusy(false);
      return;
    }

    await fetch(`/api/connections/${platform}/disconnect`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setConnected(false);
    setHandle(null);
    setBusy(false);
  }

  return { connected, handle, busy, connect, disconnect, connectedNotice, errorNotice };
}

const logos: Record<PlatformId, string> = {
  youtube: "/platforms/youtube1.png",
  instagram: "/platforms/instagram.png",
  tiktok: "/platforms/tiktok.png",
  facebook: "/platforms/facebook.png",
};

const statusText: Record<ConnectionStatus, { label: string; className: string }> = {
  connected: { label: "Connected", className: "bg-emerald-50 text-emerald-600" },
  needs_reconnect: { label: "Needs reconnecting", className: "bg-amber-50 text-amber-600" },
  disconnected: { label: "Not connected", className: "bg-slate-100 text-blumea-slate" },
};

export default function ConnectionsPage() {
  return (
    <Suspense fallback={null}>
      <ConnectionsPageInner />
    </Suspense>
  );
}

// YouTube and TikTok use the real OAuth flow (see usePlatformConnection above);
// Instagram stays mock (local prototype state) until its app review is approved
// (doc/CLAUDE.md §10).
function ConnectionsPageInner() {
  const profile = useProfile();
  const { connections, setConnection } = useMockStore(seedAnalyzedIds);
  const youtube = usePlatformConnection(
    "youtube",
    "youtube_connected",
    "youtube_error",
    "YouTube connected.",
    youtubeErrorMessages
  );
  const tiktok = usePlatformConnection(
    "tiktok",
    "tiktok_connected",
    "tiktok_error",
    "TikTok connected.",
    tiktokErrorMessages
  );
  const real: Partial<Record<PlatformId, ReturnType<typeof usePlatformConnection>>> = {
    youtube,
    tiktok,
  };

  function statusOf(id: PlatformId): ConnectionStatus {
    const connection = real[id];
    if (connection) {
      return connection.connected ? "connected" : "disconnected";
    }
    return connections[id] ?? ((profile.platforms ?? []).includes(id) ? "connected" : "disconnected");
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">
        Connections
      </h1>

      <p className="mt-2 text-blumea-slate">
        Connect the accounts you want Blumea to read. You can disconnect at any time.
      </p>

      {(youtube.connectedNotice || tiktok.connectedNotice) && (
        <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {youtube.connectedNotice || tiktok.connectedNotice}
        </p>
      )}
      {(youtube.errorNotice || tiktok.errorNotice) && (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {youtube.errorNotice || tiktok.errorNotice}
        </p>
      )}

      <section className="mt-8 space-y-4 pb-6">
        {platformCapabilities.map((platform) => {
          const soon = platform.status === "soon";
          const status = statusOf(platform.id);
          const badge = statusText[status];

          return (
            <article
              key={platform.id}
              className={`rounded-3xl border bg-white p-5 shadow-sm sm:p-6 ${
                soon ? "border-dashed border-slate-300 opacity-70" : "border-slate-200/70"
              }`}
            >
              <div className="flex flex-wrap items-center gap-4">
                <Image
                  src={logos[platform.id]}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 object-contain"
                />

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-blumea-navy">
                    {platformLabels[platform.id]}
                  </h2>

                  {soon ? (
                    <span className="mt-1 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-blumea-slate">
                      Coming later
                    </span>
                  ) : (
                    <span
                      className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                      {real[platform.id]?.handle ? ` · ${real[platform.id]?.handle}` : ""}
                    </span>
                  )}
                </div>

                {!soon && (
                  <div className="flex gap-2">
                    {status === "connected" && (
                      <button
                        type="button"
                        disabled={real[platform.id]?.busy}
                        onClick={() =>
                          real[platform.id]
                            ? real[platform.id]!.disconnect()
                            : setConnection(platform.id, "disconnected")
                        }
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-blumea-navy transition-colors hover:border-red-300 hover:text-red-500 disabled:opacity-60"
                      >
                        Disconnect
                      </button>
                    )}

                    {status === "needs_reconnect" && (
                      <button
                        type="button"
                        onClick={() => setConnection(platform.id, "connected")}
                        className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
                      >
                        Reconnect
                      </button>
                    )}

                    {status === "disconnected" && (
                      <button
                        type="button"
                        disabled={real[platform.id]?.busy}
                        onClick={() =>
                          real[platform.id]
                            ? real[platform.id]!.connect()
                            : setConnection(platform.id, "connected")
                        }
                        className="rounded-full bg-blumea-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blumea-blue disabled:opacity-60"
                      >
                        {real[platform.id]?.busy ? "Connecting…" : "Connect"}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {!soon && (
                <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-blumea-slate">
                      What Blumea can analyze
                    </dt>

                    <dd className="mt-1 leading-6 text-blumea-navy">{platform.analysis}</dd>
                  </div>

                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-blumea-slate">
                      Viewer behavior
                    </dt>

                    <dd className="mt-1 leading-6 text-blumea-navy">{platform.behavior}</dd>
                  </div>

                  {platform.requirement && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-blumea-slate">
                        Requires
                      </dt>

                      <dd className="mt-1 text-blumea-navy">{platform.requirement}</dd>
                    </div>
                  )}
                </dl>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
