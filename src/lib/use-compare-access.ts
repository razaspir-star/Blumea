"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CompareAccess, CompareKind } from "@/lib/compare-access";

// Asks the server for a comparison's allowance under the creator's plan (and counts it once per month).
export async function askCompareAccess(kind: CompareKind, key: string): Promise<CompareAccess | null> {
  const { data } = await supabase.auth.getSession();
  const response = await fetch("/api/compare/access", {
    method: "POST",
    headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, "Content-Type": "application/json" },
    body: JSON.stringify({ kind, key }),
  }).catch(() => null);
  if (!response || !response.ok) return null;
  return (await response.json()) as CompareAccess;
}

// The opening of a comparison page: null while asking.
export function useCompareAccess(key: string): CompareAccess | null {
  const [access, setAccess] = useState<{ key: string; value: CompareAccess | null } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    askCompareAccess("regular", key).then((value) => {
      if (!cancelled) setAccess({ key, value });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return access && access.key === key ? (access.value ?? { allowed: false, plan: "free", kind: "regular", used: 0, cap: 0, resetsOn: "" }) : null;
}

export const pairKey = (a: string, b: string) => [a, b].sort().join(",");
