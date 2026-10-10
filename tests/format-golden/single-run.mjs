// Scores every single run on its own (not the majority of 3), so a 1-run result
// (e.g. the production prompt, RUNS=1) can be compared fairly with the lean
// prompt's 3 runs. Usage: node tests/format-golden/single-run.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const rd = (f) => JSON.parse(fs.readFileSync(path.join(here, f), "utf8").replace(/^﻿/, ""));

const sets = [
  ["golden-main.json", ["results-main", "results-prod-v8-main", "results-prod-v7-main"]],
  ["golden-heldout.json", ["results-heldout", "results-prod-v8-heldout", "results-prod-v7-heldout"]],
];
for (const [g, dirs] of sets) {
  const golden = rd(g);
  for (const dir of dirs) {
    if (!fs.existsSync(path.join(here, dir))) continue;
    const runs = dir.includes("prod") ? 1 : 3;
    const out = [];
    for (let k = 0; k < runs; k++) {
      let p = 0, pt = 0, l = 0, lt = 0;
      for (const v of golden.videos) {
        const file = `${dir}/${v.id}.json`;
        if (!fs.existsSync(path.join(here, file))) continue;
        const r = rd(file).results[k];
        if (!r || r.error) continue;
        if (v.purpose) { pt++; if (r.format === v.purpose || (v.purposeAlt && r.format === v.purposeAlt)) p++; }
        if (v.layout) { lt++; if (r.layout === v.layout) l++; }
      }
      out.push(`run${k + 1}: purpose ${p}/${pt}  layout ${l}/${lt}`);
    }
    console.log(g.padEnd(20), dir.padEnd(26), out.join(" | "));
  }
}
