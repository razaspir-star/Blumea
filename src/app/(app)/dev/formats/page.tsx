"use client";

import { DevLabelTool } from "@/components/DevLabelTool";

// Dev-only (see src/components/DevLabelTool.tsx and
// src/app/api/dev/format-candidates-2/route.ts). Only exists in `next dev`.
export default function DevFormatsPage() {
  return (
    <DevLabelTool
      apiPath="/api/dev/format-candidates-2"
      title="Format examples (dev tool)"
      intro="For each format, open a candidate, and mark ✓ if it is a clear example of that format, ✗ if not sure. Saved automatically. You can also paste your own YouTube link under any format."
      itemNoun="format"
    />
  );
}