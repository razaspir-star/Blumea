"use client";

import AppLink from "@/components/AppLink";
import { splitVideoRefs } from "@/lib/video-ref";

// A sentence from the insight engine; every video it names is a link to that video's analysis.
export default function VideoText({ text }: { text: string }) {
  return (
    <>
      {splitVideoRefs(text).map((part, index) =>
        "text" in part ? (
          <span key={index}>{part.text}</span>
        ) : (
          <AppLink key={index} href={`/analysis/${part.id}`} className="font-semibold text-blumea-blue hover:underline">
            {part.title}
          </AppLink>
        )
      )}
    </>
  );
}
