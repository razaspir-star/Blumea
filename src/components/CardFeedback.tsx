"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useProfile } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n/client";

// "Was this right?" under an insight. One tap, so it costs the creator nothing, and it tells us which insights miss.
export default function CardFeedback({ target }: { target: string }) {
  const t = useT();
  const profile = useProfile();
  const [rating, setRating] = useState<"up" | "down" | null>(null);

  async function rate(value: "up" | "down") {
    if (rating) return;
    setRating(value);
    await supabase.from("feedback").insert({ profile_id: profile.id, kind: "card", target: target.slice(0, 300), rating: value });
  }

  if (rating) return <p className="mt-4 text-xs text-blumea-slate">{t("feedback.cardThanks")}</p>;
  return (
    <div className="mt-4 flex items-center gap-2 text-xs text-blumea-slate">
      <span>{t("feedback.cardAsk")}</span>
      <button type="button" aria-label={t("feedback.yes")} onClick={() => rate("up")} className="rounded-full p-1.5 hover:bg-blumea-mist">
        <ThumbsUp size={14} strokeWidth={1.8} />
      </button>
      <button type="button" aria-label={t("feedback.no")} onClick={() => rate("down")} className="rounded-full p-1.5 hover:bg-blumea-mist">
        <ThumbsDown size={14} strokeWidth={1.8} />
      </button>
    </div>
  );
}
