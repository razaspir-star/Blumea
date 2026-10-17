"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import Modal from "@/components/Modal";
import { useProfile } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n/client";

// A small button on every signed-in screen: anything the creator wants to tell us during the beta.
export default function FeedbackButton() {
  const t = useT();
  const profile = useProfile();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function send() {
    if (!note.trim()) return;
    setState("sending");
    const { error } = await supabase.from("feedback").insert({
      profile_id: profile.id,
      kind: "general",
      target: window.location.pathname,
      note: note.trim().slice(0, 2000),
    });
    setState(error ? "error" : "done");
  }

  function close() {
    setOpen(false);
    setNote("");
    setState("idle");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 end-4 z-30 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-blumea-navy shadow-md transition hover:bg-blumea-mist"
      >
        <MessageSquare size={15} strokeWidth={1.8} />
        {t("feedback.button")}
      </button>
      {open && (
        <Modal kicker={t("feedback.kicker")} title={t("feedback.title")} description={t("feedback.help")} onClose={close}>
          {state === "done" ? (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{t("feedback.thanks")}</p>
          ) : (
            <>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={5}
                maxLength={2000}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-blumea-navy"
              />
              {state === "error" && <p className="mt-2 text-sm text-rose-700">{t("feedback.error")}</p>}
              <button
                type="button"
                onClick={send}
                disabled={state === "sending" || !note.trim()}
                className="mt-3 rounded-full bg-blumea-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-blumea-blue-hover disabled:opacity-50"
              >
                {t("feedback.send")}
              </button>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
