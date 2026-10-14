"use client";
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useAppRouter } from "@/lib/use-app-router";
import { getCurrentProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import BlumeaLoader from "@/components/BlumeaLoader";
import BlumeaFlowerLoader from "@/components/BlumeaFlowerLoader";
import LanguageSwitch from "@/components/LanguageSwitch";
import { useT } from "@/lib/i18n/client";
import type { TextKey } from "@/lib/i18n/translate";


import {
  Utensils,
  Music,
  Gamepad2,
  Dumbbell,
  Sparkles,
  Laptop,
  Plane,
  ChartNoAxesCombined,
  GraduationCap,
  Drama,
  House,
  Trophy,
  Car,
  Palette,
  Ellipsis,
  ChevronDown,
  ChevronUp,
} from "lucide-react";


export default function OnboardingPage() {
  const t = useT();
  const router = useAppRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [profile, setProfile] = useState<{
  id: string;
  full_name: string | null;
  onboarding_completed: boolean;
  onboarding_step: number;
  goals: string[] | null;
  content_categories: string[] | null;
  platforms: string[] | null;
} | null>(null);



const goalsRef = useRef<HTMLElement | null>(null);
const categoriesRef = useRef<HTMLElement | null>(null);
const platformsRef = useRef<HTMLElement | null>(null);
const mainRef = useRef<HTMLElement | null>(null);
const connectRef = useRef<HTMLElement | null>(null);
const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

 const goals = [
  "get_more_views",
  "gain_followers",
  "understand_content",
  "improve_engagement",
  "find_uniqueness",
  "improve_content",
  "no_specific_goal",
].map((id) => ({ id, label: t(`onboarding.goal.${id}` as TextKey) }));

const contentCategories = [
  {
    id: "food",
    icon: Utensils,
  },
  {
    id: "music",
    icon: Music,
  },
  {
    id: "gaming",
    icon: Gamepad2,
  },
  {
    id: "fitness_wellness",
    icon: Dumbbell,
  },
  {
    id: "fashion_beauty",
    icon: Sparkles,
  },
  {
    id: "tech",
    icon: Laptop,
  },
  {
    id: "travel",
    icon: Plane,
  },
  {
    id: "business_finance",
    icon: ChartNoAxesCombined,
  },
  {
    id: "education",
    icon: GraduationCap,
  },
  {
    id: "entertainment_comedy",
    icon: Drama,
  },
  {
    id: "lifestyle",
    icon: House,
  },
  {
    id: "sports",
    icon: Trophy,
  },
  {
    id: "automotive",
    icon: Car,
  },
  {
    id: "art_creative",
    icon: Palette,
  },
  {
    id: "other",
    icon: Ellipsis,
  },
];

const platforms = [
  {
    id: "youtube",
    label: "YouTube",
    image: "/platforms/youtube1.png",
  },
  {
    id: "instagram",
    label: "Instagram",
    image: "/platforms/instagram.png",
  },
  {
    id: "tiktok",
    label: "TikTok",
    image: "/platforms/tiktok.png",
  },
  {
    id: "facebook",
    label: "Facebook",
    image: "/platforms/facebook.png",
  },
];

  async function toggleGoal(goalId: string) {
  if (!profile) {
    return;
  }

  let nextGoals: string[];

  if (goalId === "no_specific_goal") {
    nextGoals = ["no_specific_goal"];
  } else if (selectedGoals.includes("no_specific_goal")) {
    nextGoals = [goalId];
  } else if (selectedGoals.includes(goalId)) {
    nextGoals = selectedGoals.filter((goal) => goal !== goalId);
  } else {
    nextGoals = [...selectedGoals, goalId];
  }

  setSelectedGoals(nextGoals);

  const { error } = await supabase
    .from("profiles")
    .update({
      goals: nextGoals,
    })
    .eq("id", profile.id);

  if (error) {
    console.error("Failed to save goals:", error.message);
  }
}

  async function toggleCategory(categoryId: string) {
  if (!profile) {
    return;
  }

  const nextCategories = selectedCategories.includes(categoryId)
    ? selectedCategories.filter(
        (category) => category !== categoryId
      )
    : [...selectedCategories, categoryId];

  setSelectedCategories(nextCategories);

  const { error } = await supabase
    .from("profiles")
    .update({
      content_categories: nextCategories,
    })
    .eq("id", profile.id);

  if (error) {
    console.error("Failed to save categories:", error.message);
  }
}

async function togglePlatform(platformId: string) {
  if (!profile) {
    return;
  }

  const nextPlatforms = selectedPlatforms.includes(platformId)
    ? selectedPlatforms.filter(
        (platform) => platform !== platformId
      )
    : [...selectedPlatforms, platformId];

  setSelectedPlatforms(nextPlatforms);

  const { error } = await supabase
    .from("profiles")
    .update({
      platforms: nextPlatforms,
    })
    .eq("id", profile.id);

  if (error) {
    console.error("Failed to save platforms:", error.message);
  }
}

 async function handleContinue() {
  if (!profile) {
    return;
  }

  // מגיבים מיד ללחיצה
  categoriesRef.current?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  // מעדכנים מיד את React
  setProfile({
    ...profile,
    onboarding_step: 2,
  });

  // השמירה ל-Supabase קורית אחרי שהאנימציה כבר התחילה
  const { error } = await supabase
    .from("profiles")
    .update({
      goals: selectedGoals,
      onboarding_step: 2,
    })
    .eq("id", profile.id);

  if (error) {
    console.error("Failed to save goals:", error.message);
  }
}

async function handleBackStep() {
  if (!profile) {
    return;
  }

  if (profile.onboarding_step <= 1) {
    return;
  }

  const previousStep = profile.onboarding_step - 1;

  const target =
    previousStep === 1
      ? goalsRef.current
      : previousStep === 2
        ? categoriesRef.current
        : previousStep === 3
          ? platformsRef.current
          : profile.onboarding_step === 4
          ? connectRef.current
          : null;

  target?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  setProfile({
    ...profile,
    onboarding_step: previousStep,
  });

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_step: previousStep,
    })
    .eq("id", profile.id);

  if (error) {
    console.error("Failed to go back:", error.message);
  }
}
async function handleCategoriesContinue() {
  if (!profile) {
    return;
  }

  platformsRef.current?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  setProfile({
    ...profile,
    onboarding_step: 3,
    content_categories: selectedCategories,
  });

  const { error } = await supabase
    .from("profiles")
    .update({
      content_categories: selectedCategories,
      onboarding_step: 3,
    })
    .eq("id", profile.id);

  if (error) {
    console.error("Failed to save categories:", error.message);
  }
}

async function handlePlatformsContinue() {
  if (!profile) {
    return;
  }

  connectRef.current?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  setProfile({
    ...profile,
    onboarding_step: 4,
    platforms: selectedPlatforms,
  });

  const { error } = await supabase
    .from("profiles")
    .update({
      platforms: selectedPlatforms,
      onboarding_step: 4,
      onboarding_completed: false,
    })
    .eq("id", profile.id);

  if (error) {
    console.error("Failed to continue to account connection:", error.message);
  }
}

// Real connection (the same OAuth flow as the Connections page): YouTube and
// TikTok go to the platform's own sign-in page and come back through
// /connections; the connected state is read from the database below.
async function handleConnect(platformId: string) {
  if (connectedPlatforms.includes(platformId)) {
    return;
  }

  if (platformId !== "youtube" && platformId !== "tiktok") {
    return;
  }

  setConnectingPlatform(platformId);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    setConnectingPlatform(null);
    return;
  }

  const response = await fetch(`/api/connections/${platformId}/authorize`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!response.ok) {
    setConnectingPlatform(null);
    return;
  }

  const { url } = await response.json();
  window.location.assign(url);
}

async function handleFinishOnboarding() {
  if (!profile) {
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_completed: true,
    })
    .eq("id", profile.id);

  if (error) {
    console.error("Failed to finish onboarding:", error.message);
    return;
  }

  // Connecting is optional here: it can also be done later in Connections.
  router.replace("/dashboard");
}

useEffect(() => {
  supabase
    .from("connected_accounts")
    .select("platform")
    .then(({ data }) => {
      if (data) setConnectedPlatforms(data.map((row) => row.platform as string));
    });
}, []);

useEffect(() => {
  async function checkAccess() {
    const currentProfile = await getCurrentProfile();

    if (!currentProfile) {
      router.replace("/login");
      return;
    }

    if (currentProfile.onboarding_completed) {
      router.replace("/dashboard");
      return;
    }

    setSelectedGoals(currentProfile.goals ?? []);
    setSelectedCategories(currentProfile.content_categories ?? []);
    setSelectedPlatforms(currentProfile.platforms ?? []);

    setProfile(currentProfile);
    setIsCheckingAuth(false);
  }

  checkAccess();
}, [router]);

useEffect(() => {
  if (!profile) {
    return;
  }

  const target =
    profile.onboarding_step === 1
      ? goalsRef.current
      : profile.onboarding_step === 2
        ? categoriesRef.current
        : profile.onboarding_step === 3
          ? platformsRef.current
          : null;

  if (!target) {
    return;
  }

  target.scrollIntoView({
    behavior: "auto",
    block: "start",
  });
}, [profile?.id]);

  if (isCheckingAuth) {
  return <BlumeaLoader />;
}



return (
<main
  ref={mainRef}
  className="relative h-screen overflow-hidden bg-gradient-to-b from-white to-blumea-mist"
>
  {/* Permanent Blumea logo */}
  <div className="fixed start-6 top-6 z-50">
<div dir="ltr" className="flex items-center gap-3">
<Image
            src="/blumea-logo-v2.png"
            alt="Blumea"
            width={44}
            height={44}
            priority
          />

     <span className="text-2xl font-semibold tracking-tight text-blumea-navy">
            Blum<span className="text-blumea-blue">ea</span>
          </span>
</div>
  </div>
  <LanguageSwitch className="fixed end-6 top-7 z-50" />


  {/* STEP 1 - GOALS */}

  <section
  ref={goalsRef}
  className="relative flex h-screen w-full shrink-0 items-center justify-center overflow-hidden px-6"
>
      <div className="flex w-full max-w-2xl flex-col gap-4">
        <h1 className="text-center text-3xl font-semibold tracking-tight text-blumea-navy">
          {t("onboarding.goalsTitle")}
        </h1>

        <p className="mb-2 text-center text-sm text-blumea-slate">
          {t("onboarding.goalsSubtitle")}
        </p>

        {/* Goals */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
          {goals.map((goal) => (
            <button
              key={goal.id}
              onClick={() => toggleGoal(goal.id)}
              className={
                selectedGoals.includes(goal.id)
                  ? `flex min-h-[66px] w-full items-center justify-center rounded-full border-2 border-blumea-blue bg-white px-6 py-3 text-center font-medium text-blumea-blue transition-colors duration-[400ms] ease-in-out
                     ${goal.id === "no_specific_goal" ? "sm:col-start-2" : ""}`
                  : `flex min-h-[66px] w-full items-center justify-center rounded-full border-2 border-slate-200 bg-white px-6 py-3 text-center font-medium text-blumea-navy transition-colors duration-[400ms] ease-in-out hover:border-blumea-blue
                     ${goal.id === "no_specific_goal" ? "sm:col-start-2" : ""}`
              }
            >
              {goal.label}
            </button>
          ))}
        </div>

        {/* Continue */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            onClick={handleContinue}
            disabled={selectedGoals.length === 0}
            aria-label={t("onboarding.continue")}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-blumea-navy text-white transition-all duration-300 hover:translate-y-1 hover:bg-blumea-blue disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0"
          >
            <ChevronDown size={26} strokeWidth={2} />
          </button>

          <span className="text-xs font-medium text-blumea-slate">
            {t("onboarding.continue")}
          </span>
        </div>
      </div>
    </section>
 

  {/* STEP 2 - CATEGORIES */}

<section
  ref={categoriesRef}
  className="relative flex h-screen w-full shrink-0 items-center justify-center overflow-hidden px-6"
>
  {/* Back */}
 <div className="absolute top-3 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1">
    <button
      onClick={handleBackStep}
      aria-label={t("onboarding.back")}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-blumea-navy text-white transition-all duration-300 hover:-translate-y-1 hover:bg-blumea-blue"
    >
      <ChevronUp size={26} strokeWidth={2} />
    </button>

    <span className="text-xs font-medium text-blumea-slate">
      {t("onboarding.back")}
    </span>
  </div>

  {/* Content */}
  <div className="flex w-full max-w-3xl flex-col gap-3 px-2">
    <h1 className="text-center text-3xl font-semibold tracking-tight text-blumea-navy">
      {t("onboarding.categoriesTitle")}
    </h1>

    <p className="mb-2 text-center text-sm text-blumea-slate">
      {t("onboarding.categoriesSubtitle")}
    </p>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {contentCategories.map((category) => {
        const Icon = category.icon;
        const isSelected = selectedCategories.includes(category.id);

        return (
          <button
            key={category.id}
            onClick={() => toggleCategory(category.id)}
            className={
  isSelected
    ? "flex min-h-[150px] flex-col items-center justify-center rounded-3xl border-2 border-blumea-blue bg-white px-4 py-3 text-center shadow-sm transition-colors duration-[400ms] ease-in-out"
    : "flex min-h-[150px] flex-col items-center justify-center rounded-3xl border-2 border-slate-200 bg-white px-4 py-3 text-center transition-colors duration-[400ms] ease-in-out hover:border-blumea-blue hover:shadow-md"
}
          >
            <div
              className={
                isSelected
                  ? "mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blumea-blue text-white transition-colors duration-[400ms]"
                  : "mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blumea-mist text-blumea-blue transition-colors duration-[400ms]"
              }
            >
              <Icon size={27} strokeWidth={1.7} />
            </div>

            <span className="font-semibold text-blumea-navy">
              {t(`onboarding.category.${category.id}` as TextKey)}
            </span>

            <span className="mt-2 text-xs leading-5 text-blumea-slate">
              {t(`onboarding.category.${category.id}_desc` as TextKey)}
            </span>
          </button>
        );
      })}
    </div>
  </div>

  {/* Continue */}
  <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1">
    <button
      onClick={handleCategoriesContinue}
      disabled={selectedCategories.length === 0}
      aria-label={t("onboarding.continue")}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-blumea-navy text-white transition-all duration-300 hover:translate-y-1 hover:bg-blumea-blue disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0"
    >
      <ChevronDown size={26} strokeWidth={2} />
    </button>

    <span className="text-xs font-medium text-blumea-slate">
      {t("onboarding.continue")}
    </span>
  </div>
</section>

{/* STEP 3 - PLATFORMS */}
<section
  ref={platformsRef}
  className="relative flex h-screen w-full shrink-0 items-center justify-center overflow-hidden px-6"
>
  <div className="flex w-full max-w-3xl flex-col items-center gap-6">

    {/* Back */}
    <div className="absolute top-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
      <button
        onClick={handleBackStep}
        aria-label={t("onboarding.back")}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-blumea-navy text-white transition-all duration-300 hover:-translate-y-1 hover:bg-blumea-blue"
      >
        <ChevronUp size={26} strokeWidth={2} />
      </button>

      <span className="text-xs font-medium text-blumea-slate">
        {t("onboarding.back")}
      </span>
    </div>

    {/* Title */}
    <div className="text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy">
        {t("onboarding.platformsTitle")}
      </h1>

      <p className="mt-2 text-sm text-blumea-slate">
        {t("onboarding.platformsSubtitle")}
      </p>
    </div>

    {/* Platforms */}
    <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
      {platforms.map((platform) => {
        const isSelected = selectedPlatforms.includes(platform.id);

        return (
          <button
            key={platform.id}
            onClick={() => togglePlatform(platform.id)}
            className={
              isSelected
                ? "flex h-[165px] flex-col items-center justify-center rounded-3xl border-2 border-blumea-blue bg-white px-4 py-4 text-center shadow-sm transition-colors duration-[400ms] ease-in-out"
                : "flex h-[165px] flex-col items-center justify-center rounded-3xl border-2 border-slate-200 bg-white px-4 py-4 text-center transition-colors duration-[400ms] ease-in-out hover:border-blumea-blue hover:shadow-md"
            }
          >
            <Image
              src={platform.image}
              alt={platform.label}
              width={64}
              height={64}
              className="mb-4 h-16 w-16 object-contain"
            />

            <span className="font-semibold text-blumea-navy">
              {platform.label}
            </span>
          </button>
        );
      })}
    </div>

    {/* Finish */}
    <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
       <button
        onClick={handlePlatformsContinue}
        disabled={selectedPlatforms.length === 0}
       aria-label={t("onboarding.continue")}
       className="flex h-12 w-12 items-center justify-center rounded-full bg-blumea-navy text-white transition-all duration-300 hover:translate-y-1 hover:bg-blumea-blue disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0"
     >
    <ChevronDown size={26} strokeWidth={2} />
     </button>

  <span className="text-xs font-medium text-blumea-slate">
    {t("onboarding.continue")}
  </span>
</div>
  </div>
</section>
{/* STEP 4 - CONNECT ACCOUNTS */}
<section
  ref={connectRef}
  className="relative flex h-screen w-full shrink-0 items-center justify-center overflow-hidden px-6"
>
  {/* Back */}
  <div className="absolute top-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
    <button
      onClick={handleBackStep}
      aria-label={t("onboarding.back")}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-blumea-navy text-white transition-all duration-300 hover:-translate-y-1 hover:bg-blumea-blue"
    >
      <ChevronUp size={26} strokeWidth={2} />
    </button>

    <span className="text-xs font-medium text-blumea-slate">
      {t("onboarding.back")}
    </span>
  </div>

  {/* Content */}
  <div className="flex w-full max-w-4xl flex-col items-center gap-8">
    <div className="text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy">
        {t("onboarding.connectTitle")}
      </h1>

      <p className="mt-2 text-sm text-blumea-slate">
        {t("onboarding.connectSubtitle")}
      </p>
    </div>

  <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
  {platforms
    .filter((platform) => selectedPlatforms.includes(platform.id))
    .map((platform) => {
      const isConnected = connectedPlatforms.includes(platform.id);
      const isConnecting = connectingPlatform === platform.id;

      return (
        <div
          key={platform.id}
          className="flex h-[180px] flex-col items-center justify-center rounded-3xl border-2 border-slate-200 bg-white p-5 text-center shadow-sm"
        >
          <Image
            src={platform.image}
            alt={platform.label}
            width={64}
            height={64}
            className="h-16 w-16 object-contain"
          />

          <span className="mt-4 font-semibold text-blumea-navy">
            {platform.label}
          </span>

        <button
  onClick={() => handleConnect(platform.id)}
  disabled={isConnecting || isConnected || (platform.id !== "youtube" && platform.id !== "tiktok")}
  className={
    isConnected
      ? "mt-4 cursor-default rounded-full border border-blumea-blue bg-blumea-mist px-5 py-2 text-sm font-medium text-blumea-blue"
      : "mt-4 flex min-h-[38px] min-w-[110px] items-center justify-center rounded-full bg-blumea-navy px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blumea-blue disabled:cursor-wait"
  }
>
  {isConnecting ? (
    <BlumeaFlowerLoader size={24} />
  ) : isConnected ? (
    t("onboarding.connected")
  ) : platform.id !== "youtube" && platform.id !== "tiktok" ? (
    t("onboarding.comingLater")
  ) : (
    t("onboarding.connect")
  )}
</button>
        </div>
      );
    })}

   <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
  <button
    onClick={handleFinishOnboarding}
    className="flex items-center justify-center gap-2 rounded-full bg-blumea-navy px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-1 hover:bg-blumea-blue"
  >
    <span>{t("onboarding.goToDashboard")}</span>

    <Image
      src="/blumea-logo-v2.png"
      alt=""
      width={22}
      height={22}
      className="h-[22px] w-[22px] object-contain"
    />
  </button>
</div>
</div>
  </div>
</section>

</main>
);
}