# Session log — 2026-08-03 — Word-problem variety

## Goal

Sebastian: "die aufgaben sind teilweise zu repetitiv (multiplication: 5 mal
die gleiche stands-in-stadium textaufgabe mit anderen zahlen). das sollte
abwechslungsreicher sein. insbes bei textaufgaben, wo das textverständnis im
vordergrund steht."

## Diagnosis

Story slots in the topic generators were hardcoded to 1–2 scenarios; tier 3 of
`u07-written-mult` was 100 % the stadium problem, `u16-metric` 100 % the baker.
The session dedupe (`seen`, last 6 prompts) compares exact strings, so "same
story, new numbers" passed. Pedagogical cost: the child learns "stadium →
multiply the two numbers" instead of reading.

## What was built

1. **`gen.js` → `scenario(rng, key, builders)`**: per-key shuffled deck of
   builder indices, dealt without replacement — a story cannot reappear until
   the whole pool has been seen, and never twice in a row across deck
   boundaries. Deck state is per page load (a session builds in one go);
   shuffles draw from the caller's rng, so the test sweep stays deterministic.
2. **Scenario pools** (every answer computed; hint/explain story-specific):
   - c5b u07-written-mult t3: **8** (stadium, ferry + 45-min distractor, print
     shop, library, warehouse, cinema ×-then-− two-step, bottling + crate
     distractor, "in a week" — the second number hidden in a word)
   - c5b u07-long-mult t3: **7** (bare, hall, coaches, seedlings, egg farm +
     lorry distractor, February = 28 days, rows + extra chairs two-step)
   - c5b u07-division t3: **9** — the remainder's MEANING varies: round up
     (minibus, tents, lift), round down (eggs, ribbon, teams), the remainder
     itself (left-over balls), sharing (marbles each), bare
   - c5b u09-addsub-frac t3: **6** · u09-mixed-addsub t3: **6** ·
     u10-mult-frac t3 story branch: **6** · u10-frac-amounts t3: **8** ·
     u11-percent "100 − p" branch: **4**
   - c5a u03-problems: t3 rotates **4** structures (+ fun-run distractor,
     "y MORE than x → together" comparison two-step); t1/t2 nouns now vary
   - c5a u05-perimeter fence branch: **3** contexts
   - c5c u12-addsub-dec t3: **5** (change, relay, two-step change, jug,
     recipe + 180 °C distractor); t2 shopping items vary
   - c5c u16-metric t3: **4** mixed-unit stories (incl. one subtraction)
3. **sw.js**: CACHE_VERSION v11 → v12 (no new files; all content files were
   already in ASSETS).
4. **Tests**: pinned SW version check moved to v12; new unit test for the
   rotation (full coverage per deck round, no immediate repeats); new
   regression "variety: tier-3 word problems rotate stories" (distinct
   digit-masked prompt shells across consecutive draws).

## Verification

- Tests page: **129 passed, 0 failed** (includes the 3,840-question generator
  sweep) — run twice, after all edits.
- Prompt sampling in the browser: 10 consecutive written-mult t3 draws → 8
  distinct stories, no immediate repeat; 9 division draws → 9 distinct
  stories with all four remainder treatments. Answers spot-checked by hand
  (e.g. 79 scouts ÷ 4 per tent → 20; 134 ÷ 8 → 17 minibuses; 4×224−170=726).
- UI pass at 768×1024: focus session on u07-written-mult renders cleanly, no
  horizontal overflow; five questions answered through the real number pad
  (render → check → advance) including two different t3 stories.

## Side find + fix

`session.js` appended `wordHelpRow(q, item)` unconditionally; without a stored
API key the function returns `null` and `Element.append(null)` renders a
visible text node "null" under EVERY question. Invisible on the iPad (key is
set), but real for a fresh install. Fixed with a guard; `[LEARN:ui]` added.

## Open

- ~~Deploy = push to main~~ **Pushed on Sebastian's "push" and verified live:
  Pages serves sw `pmtrainer-v12` (~40 s after push).** Remaining: the iOS
  second-launch ritual on the iPad, then spot-check the story variety there.
- The plan's variety pattern can later extend to lower-priority slots
  (volume/imperial kinds, graphs) if repetition is still felt there.
