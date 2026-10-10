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
  { id: "get_more_views", label: "Get more views" },
  { id: "gain_followers", label: "Gain more followers" },
  { id: "understand_content", label: "Understand my content" },
  { id: "improve_engagement", label: "Improve engagement" },
  { id: "find_uniqueness", label: "Find what makes me unique" },
  { id: "improve_content", label: "Improve my content" },
  { id: "no_specific_goal", label: "I'm just exploring" },
];

const contentCategories = [
  {
    id: "food",
    label: "Food",
    description: "Cooking, recipes, reviews & more",
    icon: Utensils,
  },
  {
    id: "music",
    label: "Music",
    description: "Singing, instruments, production & more",
    icon: Music,
  },
  {
    id: "gaming",
    label: "Gaming",
    description: "Gameplay, streaming, esports & more",
    icon: Gamepad2,
  },
  {
    id: "fitness_wellness",
    label: "Fitness & Wellness",
    description: "Workouts, nutrition, wellness & more",
    icon: Dumbbell,
  },
  {
    id: "fashion_beauty",
    label: "Fashion & Beauty",
    description: "Fashion, makeup, skincare & more",
    icon: Sparkles,
  },
  {
    id: "tech",
    label: "Tech",
    description: "Gadgets, software, AI & more",
    icon: Laptop,
  },
  {
    id: "travel",
    label: "Travel",
    description: "Destinations, adventures, travel tips & more",
    icon: Plane,
  },
  {
    id: "business_finance",
    label: "Business & Finance",
    description: "Business, investing, entrepreneurship & more",
    icon: ChartNoAxesCombined,
  },
  {
    id: "education",
    label: "Education",
    description: "Tutorials, explainers, learning & more",
    icon: GraduationCap,
  },
  {
    id: "entertainment_comedy",
    label: "Entertainment & Comedy",
    description: "Comedy, sketches, reactions & more",
    icon: Drama,
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    description: "Daily life, routines, home & more",
    icon: House,
  },
  {
    id: "sports",
    label: "Sports",
    description: "Sports, training, commentary & more",
    icon: Trophy,
  },
  {
    id: "automotive",
    label: "Automotive",
    description: "Cars, motorcycles, reviews & more",
    icon: Car,
  },
  {
    id: "art_creative",
    label: "Art & Creative",
    description: "Design, photography, drawing & more",
    icon: Palette,
  },
  {
    id: "other",
    label: "Other",
    description: "Something else? Choose this",
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

async function handleMockConnect(platformId: string) {
  if (connectedPlatforms.includes(platformId)) {
    return;
  }

  setConnectingPlatform(platformId);

  await new Promise((resolve) => setTimeout(resolve, 2400));

  setConnectedPlatforms((current) => [
    ...current,
    platformId,
  ]);

  setConnectingPlatform(null);
}

async function handleFinishOnboarding() {
  if (!profile || connectedPlatforms.length === 0) {
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

  // The First Scan runs right after onboarding, then lands on the dashboard.
  router.replace("/analyzing");
}

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
  <div className="fixed left-6 top-6 z-50 flex items-center gap-3">
<Image
            src="/blumea-logo-v2.png"
            alt="Blumea logo"
            width={44}
            height={44}
            priority
          />

     <span className="text-2xl font-semibold tracking-tight text-blumea-navy">
            Blum<span className="text-blumea-blue">ea</span>
          </span>
  </div>


  {/* STEP 1 - GOALS */}

  <section
  ref={goalsRef}
  className="relative flex h-screen w-full shrink-0 items-center justify-center overflow-hidden px-6"
>
      <div className="flex w-full max-w-2xl flex-col gap-4">
        <h1 className="text-center text-3xl font-semibold tracking-tight text-blumea-navy">
          What are your goals?
        </h1>

        <p className="mb-2 text-center text-sm text-blumea-slate">
          Choose what you want Blumea to help you achieve.
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
            aria-label="Continue"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-blumea-navy text-white transition-all duration-300 hover:translate-y-1 hover:bg-blumea-blue disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0"
          >
            <ChevronDown size={26} strokeWidth={2} />
          </button>

          <span className="text-xs font-medium text-blumea-slate">
            Continue
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
      aria-label="Back"
      className="flex h-12 w-12 items-center justify-center rounded-full bg-blumea-navy text-white transition-all duration-300 hover:-translate-y-1 hover:bg-blumea-blue"
    >
      <ChevronUp size={26} strokeWidth={2} />
    </button>

    <span className="text-xs font-medium text-blumea-slate">
      Back
    </span>
  </div>

  {/* Content */}
  <div className="flex w-full max-w-3xl flex-col gap-3 px-2">
    <h1 className="text-center text-3xl font-semibold tracking-tight text-blumea-navy">
      What kind of content do you create?
    </h1>

    <p className="mb-2 text-center text-sm text-blumea-slate">
      Choose all that apply. Blumea will learn the rest from your content.
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
              {category.label}
            </span>

            <span className="mt-2 text-xs leading-5 text-blumea-slate">
              {category.description}
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
      aria-label="Continue"
      className="flex h-12 w-12 items-center justify-center rounded-full bg-blumea-navy text-white transition-all duration-300 hover:translate-y-1 hover:bg-blumea-blue disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0"
    >
      <ChevronDown size={26} strokeWidth={2} />
    </button>

    <span className="text-xs font-medium text-blumea-slate">
      Continue
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
        aria-label="Back"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-blumea-navy text-white transition-all duration-300 hover:-translate-y-1 hover:bg-blumea-blue"
      >
        <ChevronUp size={26} strokeWidth={2} />
      </button>

      <span className="text-xs font-medium text-blumea-slate">
        Back
      </span>
    </div>

    {/* Title */}
    <div className="text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy">
        Where do you create?
      </h1>

      <p className="mt-2 text-sm text-blumea-slate">
        Choose all platforms you currently use.
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
              alt={`${platform.label} logo`}
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
       aria-label="Continue"
       className="flex h-12 w-12 items-center justify-center rounded-full bg-blumea-navy text-white transition-all duration-300 hover:translate-y-1 hover:bg-blumea-blue disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0"
     >
    <ChevronDown size={26} strokeWidth={2} />
     </button>

  <span className="text-xs font-medium text-blumea-slate">
    Continue
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
      aria-label="Back"
      className="flex h-12 w-12 items-center justify-center rounded-full bg-blumea-navy text-white transition-all duration-300 hover:-translate-y-1 hover:bg-blumea-blue"
    >
      <ChevronUp size={26} strokeWidth={2} />
    </button>

    <span className="text-xs font-medium text-blumea-slate">
      Back
    </span>
  </div>

  {/* Content */}
  <div className="flex w-full max-w-4xl flex-col items-center gap-8">
    <div className="text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-blumea-navy">
        Connect your accounts
      </h1>

      <p className="mt-2 text-sm text-blumea-slate">
        Connect at least one account so Blumea can start analyzing your content.
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
            alt={`${platform.label} logo`}
            width={64}
            height={64}
            className="h-16 w-16 object-contain"
          />

          <span className="mt-4 font-semibold text-blumea-navy">
            {platform.label}
          </span>

        <button
  onClick={() => handleMockConnect(platform.id)}
  disabled={isConnecting || isConnected}
  className={
    isConnected
      ? "mt-4 cursor-default rounded-full border border-blumea-blue bg-blumea-mist px-5 py-2 text-sm font-medium text-blumea-blue"
      : "mt-4 flex min-h-[38px] min-w-[110px] items-center justify-center rounded-full bg-blumea-navy px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blumea-blue disabled:cursor-wait"
  }
>
  {isConnecting ? (
    <BlumeaFlowerLoader size={24} />
  ) : isConnected ? (
    "Connected ✓"
  ) : (
    "Connect"
  )}
</button>
        </div>
      );
    })}

   <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
  <button
    onClick={handleFinishOnboarding}
    disabled={connectedPlatforms.length === 0}
    className="flex items-center justify-center gap-2 rounded-full bg-blumea-navy px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-1 hover:bg-blumea-blue disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0"
  >
    <span>Go to my Dashboard</span>

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