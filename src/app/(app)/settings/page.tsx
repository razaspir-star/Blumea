"use client";

import { useState } from "react";
import { useAppRouter } from "@/lib/use-app-router";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/components/AppShell";

const labels: Record<string, string> = {
  get_more_views: "Get more views",
  gain_followers: "Gain more followers",
  understand_content: "Understand my content",
  improve_engagement: "Improve engagement",
  find_uniqueness: "Find what makes me unique",
  improve_content: "Improve my content",
  no_specific_goal: "I'm just exploring",
  food: "Food",
  music: "Music",
  gaming: "Gaming",
  fitness_wellness: "Fitness & Wellness",
  fashion_beauty: "Fashion & Beauty",
  tech: "Tech",
  travel: "Travel",
  business_finance: "Business & Finance",
  education: "Education",
  entertainment_comedy: "Entertainment & Comedy",
  lifestyle: "Lifestyle",
  sports: "Sports",
  automotive: "Automotive",
  art_creative: "Art & Creative",
  other: "Other",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
};

function Chips({ ids }: { ids: string[] | null }) {
  if (!ids || ids.length === 0) {
    return <p className="mt-2 text-sm text-blumea-slate">Nothing selected.</p>;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {ids.map((id) => (
        <span
          key={id}
          className="rounded-full bg-blumea-mist px-3 py-1.5 text-sm font-medium text-blumea-navy"
        >
          {labels[id] ?? id}
        </span>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const router = useAppRouter();
  const profile = useProfile();

  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setDeleting(false);
      setDeleteError("You are not signed in.");
      return;
    }

    const response = await fetch("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE" }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setDeleting(false);
      setDeleteError(body?.error ?? "Something went wrong. Please try again.");
      return;
    }

    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy sm:text-4xl">
        Settings
      </h1>

      <p className="mt-2 text-blumea-slate">Your profile and what Blumea knows about you.</p>

      <section className="mt-8 space-y-4 pb-6">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-blumea-navy">Profile</h2>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-blumea-slate">
            Name
          </p>

          <p className="mt-1 text-sm text-blumea-navy">{profile.full_name?.trim() || "Not set"}</p>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-blumea-navy">Your setup</h2>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-blumea-slate">
            Goals
          </p>

          <Chips ids={profile.goals} />

          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-blumea-slate">
            Content categories
          </p>

          <Chips ids={profile.content_categories} />

          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-blumea-slate">
            Platforms
          </p>

          <Chips ids={profile.platforms} />

          <p className="mt-5 text-xs text-blumea-slate">
            Editing these from Settings is coming. Blumea also refines categories as it learns from
            your content.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-blumea-navy">Language</h2>

          <p className="mt-2 text-sm text-blumea-slate">
            English for now. Hebrew is planned.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-blumea-navy">Your data</h2>

          <p className="mt-2 text-sm leading-6 text-blumea-slate">
            Blumea keeps the numbers your connected accounts report and the results of its analysis. Full videos
            are only used temporarily for analysis and are never stored. Disconnecting an account removes
            Blumea&apos;s access to it and deletes the videos and analysis collected through it.
          </p>

          <p className="mt-3 text-sm leading-6 text-blumea-slate">
            You can also delete your Blumea account. That disconnects every account and permanently deletes
            everything Blumea holds about you.
          </p>

          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="mt-4 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              Delete my account and data
            </button>
          ) : (
            <div className="mt-4 rounded-2xl bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">This cannot be undone.</p>

              <p className="mt-1 text-sm text-red-700">Type DELETE to confirm.</p>

              <input
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                aria-label="Type DELETE to confirm"
                className="mt-3 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm"
              />

              {deleteError && <p className="mt-2 text-sm text-red-700">{deleteError}</p>}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={confirmText !== "DELETE" || deleting}
                  onClick={handleDelete}
                  className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                >
                  {deleting ? "Deleting…" : "Delete everything"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    setConfirmText("");
                    setDeleteError(null);
                  }}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-blumea-navy"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-blumea-navy transition-colors hover:border-blumea-blue hover:text-blumea-blue"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
