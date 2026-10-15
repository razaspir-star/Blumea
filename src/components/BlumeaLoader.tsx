"use client";

import Image from "next/image";
import { useT } from "@/lib/i18n/client";

export default function BlumeaLoader() {
  const t = useT();
  const petals = [
    "/blumea-loader/petal-1-top.png",
    "/blumea-loader/petal-2-right.png",
    "/blumea-loader/petal-3-bottom-right.png",
    "/blumea-loader/petal-4-bottom-left.png",
    "/blumea-loader/petal-5-left.png",
  ];

return (
  <main className="relative min-h-screen bg-gradient-to-b from-white to-blumea-mist px-6 py-6">
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

    {/* Loader */}
    <div className="flex min-h-[calc(100vh-48px)] flex-col items-center justify-center">
      <div className="relative h-24 w-24">
        {petals.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            priority
            className="blumea-loader-petal object-contain"
            style={{
              animationDelay: `${index * 160}ms`,
            }}
          />
        ))}
      </div>

      <p className="mt-5 text-base font-medium text-blumea-slate">
        {t("common.loading")}
      </p>
    </div>
  </main>
);
}