"use client";

import { DevLabelTool } from "@/components/DevLabelTool";

// Dev-only (see src/app/api/dev/hook-candidates/route.ts). Only exists in `next dev`.
export default function DevHooksPage() {
  return (
    <DevLabelTool
      apiPath="/api/dev/hook-candidates"
      title="Hook examples (dev tool)"
      intro="A hook lives in the first seconds, so open each video and watch its beginning. Mark ✓ if the opening is a clear example of that hook, ✗ if not sure. Saved automatically. You can also paste your own YouTube link under any hook. The last blocks (Familiar moment) are a separate tag: a video there can also be an example of one of the hooks above."
      itemNoun="hook"
    />
  );
}