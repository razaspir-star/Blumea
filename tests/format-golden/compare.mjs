// Scores a results dir against a golden set. Usage:
//   node tests/format-golden/compare.mjs <golden-file> <results-dir>
// purpose = the `format` field; layout = the `layout` field. A video counts as a
// hit when the majority answer over 3 runs equals the owner's label (or the
// label he also accepted: `purposeAlt`); "with secondary" also counts the label
// appearing as the AI's secondary format in at least 2 of 3 runs. Videos whose
// `purpose` is null (old label was a pure layout) are listed, not scored.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const readJson = async (f) => JSON.parse((await readFile(path.join(here, f), "utf8")).replace(/^﻿/, ""));
const golden = await readJson(process.argv[2]);
const dir = process.argv[3];

const majority = (values) => {
  const counts = {};
  values.filter(Boolean).forEach((x) => (counts[x] = (counts[x] || 0) + 1));
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return { top: top?.[0] ?? null, n: top?.[1] ?? 0, counts };
};

let pTotal = 0, pHit = 0, pHit2 = 0, lTotal = 0, lHit = 0, errors = 0, missing = 0;
const pMiss = [], lMiss = [], unknown = [];

for (const v of golden.videos) {
  let data;
  try {
    data = await readJson(path.join(dir, `${v.id}.json`));
  } catch {
    missing += 1;
    continue;
  }
  const ok = data.results.filter((r) => !r.error);
  errors += data.results.length - ok.length;
  const p = majority(ok.map((r) => r.format));
  const l = majority(ok.map((r) => r.layout));
  const secondaryRuns = (id) => ok.filter((r) => r.format_secondary === id).length;

  if (v.purpose) {
    pTotal += 1;
    const hit = p.top === v.purpose || (v.purposeAlt && p.top === v.purposeAlt);
    if (hit) pHit += 1;
    if (hit || secondaryRuns(v.purpose) >= 2 || (v.purposeAlt && secondaryRuns(v.purposeAlt) >= 2)) pHit2 += 1;
    else pMiss.push(`${v.id} want=${v.purpose} got=${JSON.stringify(p.counts)}`);
  } else {
    unknown.push(`${v.id} (old: ${v.oldFormat}) AI purpose=${JSON.stringify(p.counts)}`);
  }

  if (v.layout) {
    lTotal += 1;
    if (l.top === v.layout) lHit += 1;
    else lMiss.push(`${v.id} want=${v.layout} got=${JSON.stringify(l.counts)}`);
  }
}

console.log(`errors: ${errors}   videos with no result file: ${missing}`);
console.log(`PURPOSE (format): primary ${pHit}/${pTotal}   primary-or-secondary ${pHit2}/${pTotal}`);
console.log(`LAYOUT: ${lHit}/${lTotal}`);
console.log("\nPURPOSE MISSES"); pMiss.forEach((x) => console.log(" ", x));
console.log("\nLAYOUT MISSES"); lMiss.forEach((x) => console.log(" ", x));
console.log("\nPURPOSE UNKNOWN (old label was a pure layout) - AI's guess for the owner to confirm"); unknown.forEach((x) => console.log(" ", x));
