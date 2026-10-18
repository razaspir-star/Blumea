// Comparisons are not stored, only counted (table compare_events: the key of what was opened). The key says what it
// was, so the History page can rebuild a link to open it again. Keys: "idA,idB" (video vs video), "usual:<id>",
// "platforms", "group:<format|hook>:<platform>:<format|all>:<a,b>", "group:besthook:<platform>:<format>",
// "group:inside:<platform>:<hook>:<format|all>".
export type ParsedComparison =
  | { type: "pair"; ids: [string, string]; href: string }
  | { type: "usual"; id: string; href: string }
  | { type: "platforms"; href: string }
  | { type: "group"; by: "format" | "hook"; platform: string; format: string | null; a: string; b: string; href: string }
  | { type: "bestHook"; platform: string; format: string; href: string }
  | { type: "inside"; platform: string; hook: string; format: string | null; href: string };

export function parseComparisonKey(key: string): ParsedComparison | null {
  if (key === "platforms") return { type: "platforms", href: "/compare/platforms" };
  if (key.startsWith("usual:")) {
    const id = key.slice(6);
    return id ? { type: "usual", id, href: `/compare/usual/${id}` } : null;
  }
  if (key.startsWith("group:")) {
    const parts = key.split(":");
    if (parts[1] === "besthook" && parts.length === 4) return { type: "bestHook", platform: parts[2], format: parts[3], href: `/compare/hooks/${parts[2]}/${parts[3]}` };
    if (parts[1] === "inside" && parts.length === 5) {
      const format = parts[4] === "all" ? null : parts[4];
      return { type: "inside", platform: parts[2], hook: parts[3], format, href: `/compare/inside/${parts[2]}/${parts[3]}${format ? `/${format}` : ""}` };
    }
    if ((parts[1] === "format" || parts[1] === "hook") && parts.length === 5) {
      const [a, b] = parts[4].split(",");
      if (!a || !b) return null;
      const format = parts[3] === "all" ? null : parts[3];
      const href = format ? `/compare/hooks/${parts[2]}/${format}/${a}/${b}` : `/compare/group/${parts[1]}/${parts[2]}/${a}/${b}`;
      return { type: "group", by: parts[1], platform: parts[2], format, a, b, href };
    }
    return null;
  }
  const ids = key.split(",");
  if (ids.length === 2 && ids[0] && ids[1]) return { type: "pair", ids: [ids[0], ids[1]], href: `/compare/${ids[0]}/${ids[1]}` };
  return null;
}
