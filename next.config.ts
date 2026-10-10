import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets the dev server serve/hydrate correctly when reached through a tunnel
  // instead of localhost (e.g. testing OAuth flows that require https, like
  // TikTok's). Dev-only; production builds don't use this dev-server check.
  allowedDevOrigins: ["*.trycloudflare.com"],
  images: {
    remotePatterns: [
      // Real YouTube video thumbnails (Analyze flow, doc/Insight_Engine_Spec.md §13#6).
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;
