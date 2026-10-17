"use client";

import { use } from "react";
import HookInside from "@/components/HookInside";

// The videos of one hook on one platform, best first.
export default function HookInsidePage({ params }: { params: Promise<{ platform: string; hook: string }> }) {
  const { platform, hook } = use(params);
  return <HookInside platform={platform} hook={hook} />;
}
