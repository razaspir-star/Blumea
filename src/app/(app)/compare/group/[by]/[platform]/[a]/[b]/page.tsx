"use client";

import { use } from "react";
import GroupCompare from "@/components/GroupCompare";

// Format against format, or hook against hook, on one platform (all formats).
export default function GroupComparePage({ params }: { params: Promise<{ by: string; platform: string; a: string; b: string }> }) {
  const { by, platform, a, b } = use(params);
  return <GroupCompare by={by} platform={platform} idA={a} idB={b} />;
}
