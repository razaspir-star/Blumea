import type { SupabaseClient } from "@supabase/supabase-js";

// The private beta is by guest list: an email the owner approved (a request from the homepage, or added by
// hand) may use the app. The owner and Pro accounts are always in. The check is made by the server on
// the routes that cost money or connect an account, and by the app shell for the screens.
export async function isApproved(admin: SupabaseClient, userId: string, email: string | null | undefined): Promise<boolean> {
  const { data: profile } = await admin.from("profiles").select("plan").eq("id", userId).maybeSingle();
  if (profile?.plan === "owner" || profile?.plan === "pro") return true;
  if (!email) return false;
  const { data } = await admin.from("access_requests").select("status").ilike("email", email).maybeSingle();
  return data?.status === "approved";
}
