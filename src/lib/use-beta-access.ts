"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// "loading" until the server answers; "approved" or "waiting" (not on the guest list yet).
export function useBetaAccess(enabled = true): "loading" | "approved" | "waiting" {
  const [state, setState] = useState<"loading" | "approved" | "waiting">("loading");
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    async function check() {
      const { data } = await supabase.auth.getSession();
      const response = await fetch("/api/access/status", { headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` } }).catch(() => null);
      const body = response?.ok ? await response.json().catch(() => null) : null;
      // If the check itself fails, do not lock a creator out of their own data: the server routes still guard the costly parts.
      if (!cancelled) setState(body && body.approved === false ? "waiting" : "approved");
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return state;
}
