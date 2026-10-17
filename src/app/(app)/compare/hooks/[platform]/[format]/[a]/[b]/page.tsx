"use client";

import { use } from "react";
import GroupCompare from "@/components/GroupCompare";

// Hook against hook inside one format, on one platform.
export default function HooksInFormatPage({ params }: { params: Promise<{ platform: string; format: string; a: string; b: string }> }) {
  const { platform, format, a, b } = use(params);
  return <GroupCompare by="hook" platform={platform} idA={a} idB={b} format={format} />;
}
