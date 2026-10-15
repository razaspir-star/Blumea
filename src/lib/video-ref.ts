// A video mentioned inside a sentence. Insight texts are plain strings built in the lib
// files; a video's title is written into them as a marker (private-use characters, so it
// can never clash with real text) and the screen turns the marker into a link to that
// video's analysis (components/VideoText.tsx), so a creator who does not remember the
// video can open it.
const START = "\uE000";
const MID = "\uE001";
const END = "\uE002";

export function videoRef(id: string, title: string): string {
  return `${START}${id}${MID}${title.replace(/\s+/g, " ").trim()}${END}`;
}

export type VideoTextPart = { text: string } | { id: string; title: string };

export function splitVideoRefs(text: string): VideoTextPart[] {
  const parts: VideoTextPart[] = [];
  let rest = text;
  while (rest.length > 0) {
    const start = rest.indexOf(START);
    if (start === -1) break;
    const mid = rest.indexOf(MID, start);
    const end = rest.indexOf(END, mid);
    if (mid === -1 || end === -1) break;
    if (start > 0) parts.push({ text: rest.slice(0, start) });
    parts.push({ id: rest.slice(start + 1, mid), title: rest.slice(mid + 1, end) });
    rest = rest.slice(end + 1);
  }
  if (rest) parts.push({ text: rest });
  return parts;
}

// The same text with markers replaced by plain titles (for places that cannot show links).
export function stripVideoRefs(text: string): string {
  return splitVideoRefs(text)
    .map((part) => ("text" in part ? part.text : part.title))
    .join("");
}
