import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";
import { platformLabels, type AnalysisMode, type PlatformId } from "@/lib/mock-data";

const icons = {
  youtube: FaYoutube,
  instagram: FaInstagram,
  tiktok: FaTiktok,
  facebook: FaFacebook,
};

export function PlatformIcon({ platform, size = 14 }: { platform: PlatformId; size?: number }) {
  const Icon = icons[platform];

  return <Icon size={size} />;
}

export default function PlatformBadge({
  platform,
  className = "bg-blumea-mist",
}: {
  platform: PlatformId;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-blumea-navy ${className}`}
    >
      <PlatformIcon platform={platform} size={12} />
      {platformLabels[platform]}
    </span>
  );
}

const modeLabels: Record<AnalysisMode, string> = {
  full: "Full analysis",
  lite: "Lite analysis",
  deep: "Deep analysis",
};

export function ModeBadge({ mode }: { mode: AnalysisMode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-blumea-slate">
      {modeLabels[mode]}
    </span>
  );
}
