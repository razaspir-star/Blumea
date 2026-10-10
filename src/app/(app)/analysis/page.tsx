import { redirect } from "next/navigation";

// Analyses are opened from a specific video: /analysis/[id].
export default function AnalysisIndexPage() {
  redirect("/analyze");
}
