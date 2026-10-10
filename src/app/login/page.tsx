"use client";

import { useState } from "react";
import Image from "next/image";
import AppLink from "@/components/AppLink";
import { useAppRouter } from "@/lib/use-app-router";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
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
      setLoginError("Invalid email or password.");
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
      setLoginError("We couldn't load your Blumea profile.");
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
      <div className="absolute left-6 top-6 flex items-center gap-3 sm:left-8">
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

      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm"
      >
        <h1 className="text-center text-3xl font-semibold text-blumea-navy">
          Welcome back
        </h1>

        <div className="mt-8 space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blumea-blue"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blumea-blue"
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
            {isLoading ? "Logging in..." : "Log In"}
          </button>
        </div>

        <p className="mt-5 text-center text-sm text-blumea-slate">
          New to Blumea?{" "}
          <AppLink href="/register" className="font-semibold text-blumea-blue hover:underline">
            Create an account
          </AppLink>
        </p>

        <p className="mt-4 text-center text-xs text-blumea-slate">
          <AppLink href="/privacy" className="hover:text-blumea-blue hover:underline">
            Privacy Policy
          </AppLink>
          {" · "}
          <AppLink href="/terms" className="hover:text-blumea-blue hover:underline">
            Terms of Service
          </AppLink>
        </p>
      </form>
    </main>
  );
}