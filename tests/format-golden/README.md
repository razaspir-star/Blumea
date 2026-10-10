# Format regression set

Hand-labelled example videos for the format library (`src/lib/format-library.ts`,
`doc/Insight_Engine_Spec.md` §3.5 and §12.4). Re-run it whenever the format
prompt, the format/layout definitions or the Gemini model change.

| File | What it is |
|---|---|
| `golden-main.json` | 108 videos the definitions were tuned on (purpose × layout labels) |
| `golden-heldout.json` | 98 videos the definitions were never tuned on — the honest number |
| `golden-smoke.json` | 2 videos, to check the runner works (cost: nothing) |
| `owner-ticks-batch1.json`, `owner-ticks-batch2.json` | the owner's raw ✓ / ✗ in the labelling tool (✗ means "not sure", not "rejected") |
| `history-one-label-*.json` | the same sets in the earlier single-label form, for history |

Label fields: `purpose` = the video's `format` (what it is for), `layout` = how it is
shown, `purposeAlt` = a second label the owner also accepts, `purpose: null` = the old
label was a pure layout and the owner has not given a purpose yet.

## Run

```
node tests/format-golden/run.mjs golden-main.json results-main
node tests/format-golden/run.mjs golden-heldout.json results-heldout
node tests/format-golden/compare.mjs golden-main.json results-main
node tests/format-golden/compare.mjs golden-heldout.json results-heldout
```

Needs `GEMINI_API_KEY` in `.env.local`. Each run is 3 calls per video (~600 calls for
both sets, roughly ₪1). The Gemini credit is topped up by hand — say the number of
calls before running. Results go to `results-*` here (regenerable, delete freely);
a rerun skips videos that already have a result and never keeps an all-error result.

## Last scores (2026-10-06, shipped prompt v6)

| | tuned set | held-out |
|---|---|---|
| purpose (format), primary | 95 / 101 (94%) | 77 / 85 (91%) |
| purpose, primary or secondary | 96 / 101 | 82 / 85 |
| layout | 37 / 38 (97%) | 31 / 35 (89%) |

## Production prompt, one run per video (2026-10-10)

The runs above use the lean format-only prompt (`src/lib/format-eval-prompt.ts`). The shipped
prompt (`src/lib/analysis-prompt.ts`) was first measured on 2026-10-10 with
`PROMPT_MODE=prod RUNS=1 node tests/format-golden/run.mjs ...` (`prod-v7` = same prompt without the hook
fields). Score one run on its own with `node tests/format-golden/single-run.mjs`.

| | tuned: purpose | tuned: layout | held-out: purpose | held-out: layout |
|---|---|---|---|---|
| v7 (no hooks), 1 run | 93 / 100 | 35 / 37 | 78 / 90 | 30 / 35 |
| v8 (with hooks), 1 run | 92 / 101 | 34 / 38 | 76 / 90 | 30 / 35 |

v8 vs v7 differ by 1-2 videos (noise); the hook fields do not visibly hurt format recognition. Both are a few
points under the lean prompt's 3-run majority numbers (a longer prompt and one run instead of three). The held-out
denominator is now 90 (5 meme-edit videos were added after the earlier 85).

The held-out set has since gained 5 meme-edit videos (not in these numbers). Quote the
held-out figures, not the tuned ones. Videos are other creators' public Shorts, used only
to test the AI; nothing here is stored in the product database.
