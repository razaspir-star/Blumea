export function formatCount(value: number | null): string {
  if (value === null) {
    return "—";
  }

  if (value >= 1_000_000) {
    return `${trimDecimal(value / 1_000_000)}M`;
  }

  if (value >= 1_000) {
    return `${trimDecimal(value / 1_000)}K`;
  }

  return String(value);
}

function trimDecimal(value: number): string {
  return value >= 100 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, "");
}

export function formatTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");

  return `${minutes}:${rest}`;
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits).replace(/\.0$/, "")}%`;
}
