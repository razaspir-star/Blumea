"use client";

import { useEffect, useState } from "react";
import AppLink from "@/components/AppLink";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n/client";

// When YouTube or TikTok refused to renew a creator's access, say so on every screen until they reconnect.
export default function ReconnectBanner() {
  const t = useT();
  const [platforms, setPlatforms] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("connected_accounts")
      .select("platform")
      .eq("needs_reconnect", true)
      .then(({ data }) => {
        if (!cancelled) setPlatforms((data ?? []).map((row) => (row.platform === "youtube" ? "YouTube" : "TikTok")));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (platforms.length === 0) return null;
  return (
    <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:mx-6 md:mx-8">
      <span>{t("feedback.reconnectBanner", { platform: platforms.join(" + ") })}</span>
      <AppLink href="/connections" className="font-semibold text-amber-900 underline">
        {t("feedback.reconnectAction")}
      </AppLink>
    </div>
  );
}
