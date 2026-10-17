"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile, type Profile } from "@/lib/auth";
import BlumeaLoader from "@/components/BlumeaLoader";
import AppSidebar, { MobileNav } from "@/components/AppSidebar";
import BetaWaiting from "@/components/BetaWaiting";
import FeedbackButton from "@/components/FeedbackButton";
import ErrorReporter from "@/components/ErrorReporter";
import ReconnectBanner from "@/components/ReconnectBanner";
import { useBetaAccess } from "@/lib/use-beta-access";

const ProfileContext = createContext<Profile | null>(null);

export function useProfile(): Profile {
  const profile = useContext(ProfileContext);

  if (!profile) {
    throw new Error("useProfile must be used inside AppShell");
  }

  return profile;
}

// Guards every signed-in screen: no session goes to login, unfinished onboarding
// goes back to onboarding. The check runs in the browser, so real data access
// still has to be protected on the server (Supabase RLS).
export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const access = useBetaAccess();

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const currentProfile = await getCurrentProfile();

      if (!active) {
        return;
      }

      if (!currentProfile) {
        router.replace("/login");
        return;
      }

      if (!currentProfile.onboarding_completed) {
        router.replace("/onboarding");
        return;
      }

      setProfile(currentProfile);
    }

    checkAccess();

    return () => {
      active = false;
    };
  }, [router]);

  if (!profile || access === "loading") {
    return <BlumeaLoader />;
  }

  if (access === "waiting") return <BetaWaiting />;

  return (
    <ProfileContext value={profile}>
      <div className="min-h-screen bg-blumea-mist md:flex">
        <AppSidebar />

        <div className="min-w-0 flex-1">
          <MobileNav />

          <ReconnectBanner />
          <main className="p-4 sm:p-6 md:p-8">{children}</main>
          <FeedbackButton />
          <ErrorReporter />
        </div>
      </div>
    </ProfileContext>
  );
}
