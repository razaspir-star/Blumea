import type { SupabaseClient } from "@supabase/supabase-js";

// How many comparisons a plan may make per calendar month (UTC). Owner decision 2026-10-17, numbers are
// proposals to revisit with real usage: free creators open a few regular comparisons and get no
// in-depth one; Pro opens regular comparisons without limit and gets a monthly number of in-depth ones;
// the owner has no limits. A comparison is counted once per month however often it is reopened.
export const FREE_REGULAR_PER_MONTH = 3;
export const PRO_DEEP_PER_MONTH = 20;

export type CompareKind = "regular" | "deep";

export type CompareAccess = {
  allowed: boolean;
  plan: string;
  kind: CompareKind;
  used: number;
  // null = unlimited; 0 = not part of the plan
  cap: number | null;
  resetsOn: string;
};

// Video vs your other videos (key starts with "usual:") is for Pro and owner only.
function capFor(plan: string, kind: CompareKind, key: string): number | null {
  if (plan === "owner") return null;
  if (kind === "regular") return plan === "pro" ? null : key.startsWith("usual:") ? 0 : FREE_REGULAR_PER_MONTH;
  return plan === "pro" ? PRO_DEEP_PER_MONTH : 0;
}

// Checks the plan's allowance for this comparison and, when it is allowed and new this month, records it.
export async function registerComparison(admin: SupabaseClient, profileId: string, kind: CompareKind, key: string): Promise<CompareAccess> {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const resetsOn = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

  const [{ data: profile }, { data: existing }, { count }] = await Promise.all([
    admin.from("profiles").select("plan").eq("id", profileId).maybeSingle(),
    admin.from("compare_events").select("id").eq("profile_id", profileId).eq("kind", kind).eq("key", key).eq("month", month).maybeSingle(),
    admin.from("compare_events").select("id", { count: "exact", head: true }).eq("profile_id", profileId).eq("kind", kind).eq("month", month),
  ]);

  const plan = (profile?.plan as string | undefined) ?? "free";
  const cap = capFor(plan, kind, key);
  const used = count ?? 0;

  // Already counted this month: open again for free. Otherwise it needs room under the cap.
  if (existing) return { allowed: true, plan, kind, used, cap, resetsOn };
  if (cap !== null && used >= cap) return { allowed: false, plan, kind, used, cap, resetsOn };

  await admin.from("compare_events").upsert({ profile_id: profileId, kind, key, month }, { onConflict: "profile_id,kind,key,month", ignoreDuplicates: true });
  return { allowed: true, plan, kind, used: used + 1, cap, resetsOn };
}
