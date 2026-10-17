"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAppRouter } from "@/lib/use-app-router";
import {
  LayoutDashboard,
  PlaySquare,
  Sparkles,
  Lightbulb,
  Link2,
  Settings,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/components/AppShell";
import LanguageSwitch from "@/components/LanguageSwitch";
import { useT } from "@/lib/i18n/client";
import type { TextKey } from "@/lib/i18n/translate";

// Analyze isn't a sidebar item. The screens it leads to belong to Content.
const navigation = [
  {
    label: "nav.dashboard" as TextKey,
    icon: LayoutDashboard,
    path: "/dashboard",
    matches: ["/dashboard"],
  },
  {
    label: "nav.content" as TextKey,
    icon: PlaySquare,
    path: "/content",
    matches: ["/content", "/analyze", "/analysis", "/compare"],
  },
  {
    label: "nav.insights" as TextKey,
    icon: Sparkles,
    path: "/insights",
    matches: ["/insights"],
  },
  {
    label: "nav.ideas" as TextKey,
    icon: Lightbulb,
    path: "/ideas",
    matches: ["/ideas"],
  },
  {
    label: "nav.connections" as TextKey,
    icon: Link2,
    path: "/connections",
    matches: ["/connections"],
  },
];

// Only the owner sees this: the guest list, and later events, errors and cost.
const adminItem = {
  label: "nav.admin" as TextKey,
  icon: ShieldCheck,
  path: "/admin",
  matches: ["/admin"],
};

// Settings sits at the bottom of the sidebar, above the language switch.
const settingsItem = {
  label: "nav.settings" as TextKey,
  icon: Settings,
  path: "/settings",
  matches: ["/settings"],
};

function useActivePath() {
  const pathname = usePathname();

  return (matches: string[]) =>
    matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));
}

function Brand() {
  return (
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
  );
}

export default function AppSidebar() {
  const t = useT();
  const router = useAppRouter();
  const isActive = useActivePath();
  const profile = useProfile();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-slate-200 bg-white px-5 py-6 md:flex">
      <Brand />

      <nav className="mt-10 flex flex-col gap-2">
        {(profile.plan === "owner" ? [...navigation, adminItem] : navigation).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.matches);

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.path)}
              className={`relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                active
                  ? "bg-blumea-mist text-blumea-navy"
                  : "text-blumea-slate hover:bg-blumea-mist/60 hover:text-blumea-navy"
              }`}
            >
              <Icon size={19} strokeWidth={1.8} />

              <span>{t(item.label)}</span>

              {active && (
                <Image
                  src="/blumea-loader/petal-5-left.png"
                  alt=""
                  width={30}
                  height={30}
                  className="absolute end-3 h-6 w-6 rotate-180 object-contain opacity-60 rtl:rotate-0"
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto">
        {(() => {
          const Icon = settingsItem.icon;
          const active = isActive(settingsItem.matches);
          return (
            <button
              type="button"
              onClick={() => router.push(settingsItem.path)}
              className={`mb-3 flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                active ? "bg-blumea-mist text-blumea-navy" : "text-blumea-slate hover:bg-blumea-mist/60 hover:text-blumea-navy"
              }`}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{t(settingsItem.label)}</span>
            </button>
          );
        })()}
        <LanguageSwitch className="mb-3" />
      </div>

      <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blumea-mist text-sm font-semibold text-blumea-blue">
          {(profile.full_name?.trim()[0] ?? "B").toUpperCase()}
        </div>

        <p className="min-w-0 flex-1 truncate text-sm font-medium text-blumea-navy">
          {profile.full_name?.trim() || t("common.yourAccount")}
        </p>

        <button
          type="button"
          onClick={handleSignOut}
          aria-label={t("common.signOut")}
          title={t("common.signOut")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-blumea-slate transition-colors hover:bg-blumea-mist hover:text-blumea-navy"
        >
          <LogOut size={18} strokeWidth={1.8} />
        </button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const t = useT();
  const router = useAppRouter();
  const isActive = useActivePath();
  const profile = useProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
      <div className="flex items-center justify-between">
        <Brand />
        <LanguageSwitch />
      </div>

      <nav className="mt-3 flex gap-1 overflow-x-auto">
        {[...navigation, ...(profile.plan === "owner" ? [adminItem] : []), settingsItem].map((item) => {
          const Icon = item.icon;
          const active = isActive(item.matches);

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.path)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-blumea-mist text-blumea-navy"
                  : "text-blumea-slate hover:bg-blumea-mist/60"
              }`}
            >
              <Icon size={17} strokeWidth={1.8} />
              {t(item.label)}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
