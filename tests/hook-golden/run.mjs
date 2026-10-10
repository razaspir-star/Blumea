// Runs the hook prompt on the owner's own examples (owner-examples.json) and
// compares Gemini's pick with the hook each video was filed under.
//
//   node tests/hook-golden/run.mjs [results-file-name] [examples-file-name]
//
// One call per video; say the call count (and rough ₪) before running -- the
// Gemini credit is topped up by hand. The owner's examples are the labels. A
// rerun skips videos that already have a result; all-error results are not saved.
import fs from "node:fs";
import { ROOT, makeClient, labelVideo } from "./prompt.mjs";

const name = process.argv[2] ?? "results-owner.json";
const examplesFile = process.argv[3] ?? "owner-examples.json";
const examples = JSON.parse(fs.readFileSync(new URL(`tests/hook-golden/${examplesFile}`, ROOT), "utf8").replace(/^﻿/, ""));
const OUT = new URL(`tests/hook-golden/${name}`, ROOT);
const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};

// id -> accepted hooks (the filed one, plus any "also accepted")
const items = [];
for (const [hook, ids] of Object.entries(examples.hooks)) {
  for (const id of ids) items.push({ id, hook, accepted: [hook, ...(examples.alsoAccepted?.[id]?.match(/[a-z_]+/g)?.filter((w) => w.includes("_")) ?? [])] });
}
for (const entry of examples.unsure ?? []) {
  const id = entry.split(/\s/)[0];
  const alt = entry.match(/accept either ([a-z_]+) or ([a-z_]+)/);
  items.push({ id, hook: null, accepted: alt ? [alt[1], alt[2]] : [] });
}

// The "familiar moment" tag: expected kind per video; videos listed only there are
// checked on the tag alone.
const expectedFamiliar = {};
for (const [kind, ids] of Object.entries(examples.familiar ?? {})) for (const id of ids) expectedFamiliar[id] = kind;
for (const id of Object.keys(expectedFamiliar)) if (!items.some((i) => i.id === id)) items.push({ id, hook: null, accepted: [], tagOnly: true });
for (const item of items) if (expectedFamiliar[item.id]) item.familiar = expectedFamiliar[item.id];

const todo = items.filter((i) => !done[i.id]);
console.log(`${items.length} videos, ${todo.length} to run`);
const ai = await makeClient();
let next = 0;
async function worker() {
  while (next < todo.length) {
    const item = todo[next++];
    try {
      done[item.id] = { ...item, ai: await labelVideo(ai, item.id) };
    } catch (e) {
      done[item.id] = { ...item, error: String(e).slice(0, 160) };
      if (/402|prepayment|credit/i.test(String(e))) { console.log("OUT OF CREDIT"); process.exitCode = 2; return; }
    }
  }
}
await Promise.all([worker(), worker(), worker()]);

const ok = Object.values(done).filter((r) => !r.error);
if (ok.length > 0) fs.writeFileSync(OUT, JSON.stringify(Object.fromEntries(Object.entries(done).filter(([, v]) => !v.error)), null, 2));

let right = 0, labelled = 0, tagRight = 0, tagged = 0;
for (const r of ok) {
  if (r.familiar) {
    tagged += 1;
    const tagHit = r.ai.familiar === r.familiar;
    if (tagHit) tagRight += 1;
    console.log(`${tagHit ? "TAG OK  " : "TAG MISS"}  ${r.id}  expected: ${r.familiar}  AI: ${r.ai.familiar}`);
  }
  if (r.tagOnly) continue;
  if (!r.hook) {
    console.log(`UNSURE  ${r.id}  AI: ${r.ai.hook} (+${r.ai.hook_runner_up ?? "-"})  | ${r.ai.reason}`);
    continue;
  }
  labelled += 1;
  const hit = r.accepted.includes(r.ai.hook) || (r.ai.hook_runner_up && r.accepted.includes(r.ai.hook_runner_up));
  if (hit) right += 1;
  console.log(`${hit ? "OK  " : "MISS"}    ${r.id}  filed: ${r.hook.padEnd(18)} AI: ${r.ai.hook} (+${r.ai.hook_runner_up ?? "-"}) | ${r.ai.reason}`);
}
console.log(`\nfamiliar-moment tag: ${tagRight} / ${tagged}`);
console.log(`${right} / ${labelled} match (runner-up counts as a hit); errors: ${Object.values(done).filter((r) => r.error).length}`);
