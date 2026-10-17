"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppRouter } from "@/lib/use-app-router";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/components/AppShell";
import { useT } from "@/lib/i18n/client";

type AccessRequest = {
  id: string;
  email: string;
  platform: string | null;
  handle: string | null;
  niche: string | null;
  note: string | null;
  status: "pending" | "approved" | "declined";
  created_at: string;
};

type Overview = {
  creators: number;
  aiRunsToday: number;
  dailyCap: number;
  problems: { name: string; props: Record<string, unknown> | null; created_at: string }[];
  feedback: { kind: string; target: string | null; rating: string | null; note: string | null; created_at: string }[];
};

// The owner's page. For now: the guest list of the private beta. Events, errors and cost will join it.
export default function AdminPage() {
  const t = useT();
  const router = useAppRouter();
  const profile = useProfile();
  const [requests, setRequests] = useState<AccessRequest[] | null>(null);
  const [email, setEmail] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);

  const call = useCallback(async (init?: { method: "POST"; body: object }) => {
    const { data } = await supabase.auth.getSession();
    const response = await fetch("/api/admin/access", {
      method: init?.method ?? "GET",
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, "Content-Type": "application/json" },
      body: init ? JSON.stringify(init.body) : undefined,
    });
    return response.ok ? response.json() : null;
  }, []);

  const load = useCallback(async () => {
    const body = await call();
    setRequests(body?.requests ?? []);
  }, [call]);

  useEffect(() => {
    if (profile.plan === "owner") {
      supabase.auth.getSession().then(async ({ data }) => {
        const response = await fetch("/api/admin/overview", { headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` } });
        if (response.ok) setOverview(await response.json());
      });
    }
  }, [profile.plan]);

  useEffect(() => {
    if (profile.plan !== "owner") {
      router.replace("/dashboard");
      return;
    }
    load();
  }, [profile.plan, router, load]);

  async function act(body: object) {
    await call({ method: "POST", body });
    await load();
  }

  if (profile.plan !== "owner") return null;

  const group = (status: AccessRequest["status"]) => (requests ?? []).filter((item) => item.status === status);
  const card = (item: AccessRequest) => (
    <li key={item.id} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-all text-sm font-semibold text-blumea-navy">{item.email}</p>
          <p className="mt-1 text-xs text-blumea-slate">
            {[item.platform, item.handle, item.niche].filter(Boolean).join(" · ") || "—"}
          </p>
          {item.note && <p className="mt-1 text-xs text-blumea-slate">{item.note}</p>}
          <p className="mt-1 text-[11px] text-blumea-slate">{new Date(item.created_at).toLocaleDateString(t.locale)}</p>
        </div>
        <div className="flex gap-2">
          {item.status !== "approved" && (
            <button type="button" onClick={() => act({ action: "approve", id: item.id })} className="rounded-full bg-blumea-blue px-4 py-1.5 text-xs font-semibold text-white hover:bg-blumea-blue-hover">
              {t("admin.approve")}
            </button>
          )}
          {item.status !== "declined" && (
            <button type="button" onClick={() => act({ action: "decline", id: item.id })} className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-blumea-slate hover:bg-slate-50">
              {t("admin.decline")}
            </button>
          )}
        </div>
      </div>
    </li>
  );

  const section = (status: AccessRequest["status"], title: string) => {
    const items = group(status);
    return (
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-blumea-navy">
          {title} <span className="font-normal text-blumea-slate">({items.length})</span>
        </h2>
        {items.length > 0 && <ul className="mt-3 space-y-3">{items.map(card)}</ul>}
      </section>
    );
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-semibold text-blumea-navy">{t("admin.title")}</h1>
      <p className="mt-1 text-sm text-blumea-slate">{t("admin.guestListHelp")}</p>

      {overview && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
            <p className="text-xs text-blumea-slate">{t("admin.creators")}</p>
            <p className="mt-1 text-2xl font-semibold text-blumea-navy">{overview.creators}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
            <p className="text-xs text-blumea-slate">{t("admin.aiToday")}</p>
            <p className="mt-1 text-2xl font-semibold text-blumea-navy">
              {overview.aiRunsToday} <span className="text-sm font-normal text-blumea-slate">/ {overview.dailyCap}</span>
            </p>
          </div>
        </div>
      )}

      <form
        className="mt-6 flex flex-wrap gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!email.includes("@")) return;
          await act({ action: "add", email });
          setEmail("");
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("admin.addPlaceholder")}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-blumea-navy"
        />
        <button type="submit" className="rounded-full bg-blumea-blue px-5 py-2 text-sm font-semibold text-white hover:bg-blumea-blue-hover">
          {t("admin.add")}
        </button>
      </form>

      {requests === null ? null : (
        <>
          {section("pending", t("admin.pending"))}
          {section("approved", t("admin.approved"))}
          {section("declined", t("admin.declined"))}
        </>
      )}

      {overview && (
        <>
          <section className="mt-10">
            <h2 className="text-sm font-semibold text-blumea-navy">{t("admin.problems")}</h2>
            {overview.problems.length === 0 ? (
              <p className="mt-2 text-sm text-blumea-slate">{t("admin.none")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {overview.problems.map((item, index) => (
                  <li key={index} className="rounded-xl bg-white px-4 py-2.5 text-xs text-blumea-slate shadow-sm">
                    <span className="font-semibold text-blumea-navy">{item.name}</span> · {new Date(item.created_at).toLocaleString(t.locale)}
                    <br />
                    {JSON.stringify(item.props ?? {})}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="mt-10">
            <h2 className="text-sm font-semibold text-blumea-navy">{t("admin.feedback")}</h2>
            {overview.feedback.length === 0 ? (
              <p className="mt-2 text-sm text-blumea-slate">{t("admin.none")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {overview.feedback.map((item, index) => (
                  <li key={index} className="rounded-xl bg-white px-4 py-2.5 text-xs text-blumea-slate shadow-sm">
                    <span className="font-semibold text-blumea-navy">{item.rating === "up" ? "👍" : item.rating === "down" ? "👎" : "💬"}</span> {item.note ?? item.target}
                    {item.note && item.target ? <span> · {item.target}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
