"use client";

import { use } from "react";
import HookInside from "@/components/HookInside";

// The videos of one hook inside one format on one platform, best first.
export default function HookInsideFormatPage({ params }: { params: Promise<{ platform: string; hook: string; format: string }> }) {
  const { platform, hook, format } = use(params);
  return <HookInside platform={platform} hook={hook} format={format} />;
}
