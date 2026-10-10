"use client";

import { DevLabelTool } from "@/components/DevLabelTool";

// Dev-only (see src/app/api/dev/hook-review/route.ts). Only exists in `next dev`.
export default function DevHookReviewPage() {
  return (
    <DevLabelTool
      apiPath="/api/dev/hook-review"
      title="Hook review (dev tool)"
      intro="Gemini sorted the examples by what it thinks the opening does, and wrote one line on why. Open the video, watch the first 3 seconds, and mark ✓ if that hook is right, ✗ if it is not (or you are not sure). Only your ticks count. The small line under each picture is what was said or written in the opening, as Gemini read it. Videos you approved earlier are already ticked."
      itemNoun="hook"
    />
  );
}