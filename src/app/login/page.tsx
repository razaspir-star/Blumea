"use client";

import { useState } from "react";
import Image from "next/image";
import AppLink from "@/components/AppLink";
import LanguageSwitch from "@/components/LanguageSwitch";
import { useAppRouter } from "@/lib/use-app-router";
import { useT } from "@/lib/i18n/client";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const t = useT();
  const router = useAppRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoginError("");
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoginError(t("login.invalid"));
      setIsLoading(false);
      return;
    }

    const user = data.user;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    if (profileError) {
      setLoginError(t("login.profileError"));
      setIsLoading(false);
      return;
    }

    if (profile.onboarding_completed) {
      router.push("/dashboard");
    } else {
      router.push("/onboarding");
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-blumea-mist px-6">
      {/* Brand */}
      <div className="absolute start-6 top-6 sm:start-8">
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

      <LanguageSwitch className="absolute end-6 top-7 sm:end-8" />

      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm"
      >
        <h1 className="text-center text-3xl font-semibold text-blumea-navy">
          {t("login.title")}
        </h1>

        <div className="mt-8 space-y-4">
          <input
            type="email"
            placeholder={t("auth.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            dir="ltr"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blumea-blue rtl:placeholder-shown:text-right"
          />

          <input
            type="password"
            placeholder={t("auth.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            dir="ltr"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blumea-blue rtl:placeholder-shown:text-right"
          />

          {loginError && (
            <p className="text-center text-sm text-red-500">
              {loginError}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-blumea-blue px-4 py-3 font-semibold text-white transition hover:bg-blumea-blue-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? t("login.submitting") : t("login.submit")}
          </button>
        </div>

        <p className="mt-5 text-center text-sm text-blumea-slate">
          {t("login.newHere")}{" "}
          <AppLink href="/register" className="font-semibold text-blumea-blue hover:underline">
            {t("login.createAccount")}
          </AppLink>
        </p>

        <p className="mt-4 text-center text-xs text-blumea-slate">
          <AppLink href="/privacy" className="hover:text-blumea-blue hover:underline">
            {t("legal.privacy")}
          </AppLink>
          {" · "}
          <AppLink href="/terms" className="hover:text-blumea-blue hover:underline">
            {t("legal.terms")}
          </AppLink>
        </p>
      </form>
    </main>
  );
}
