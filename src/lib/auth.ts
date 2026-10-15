import { supabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  full_name: string | null;
  onboarding_completed: boolean;
  onboarding_step: number;
  goals: string[] | null;
  content_categories: string[] | null;
  platforms: string[] | null;
  // free | pro | owner (set by hand during the beta)
  plan: string;
};

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, onboarding_completed, onboarding_step, goals, content_categories, platforms, plan"
    )
    .eq("id", user.id)
    .single();

  if (error) {
    return null;
  }

  return profile;
}
