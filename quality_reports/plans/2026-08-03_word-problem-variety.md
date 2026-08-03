# Plan: Word-problem variety (anti-repetition)

**Status:** COMPLETED — 2026-08-03 (129 tests green; see session log)
**Trigger:** "die aufgaben sind teilweise zu repetitiv (multiplication: 5 mal die
gleiche stands-in-stadium textaufgabe mit anderen zahlen) … insbes bei
textaufgaben, wo das textverständnis im vordergrund steht."

## Diagnosis

- Story slots in `gen(rng, tier)` are hardcoded to 1–2 scenarios. Worst
  offenders: `u07-written-mult` tier 3 (stadium only), `u16-metric` tier 3
  (baker only), `u07-long-mult` tier 3 (hall only).
- `session.js` dedupes on exact prompt strings, so "same story, new numbers"
  passes through.
- Pedagogical cost: the child pattern-matches ("stadium → multiply the two
  numbers") instead of reading.

## Changes

1. **`app/js/content/gen.js`** — new `scenario(rng, key, builders)` helper:
   per-key shuffled deck of builder indices, dealt without replacement, no
   immediate repeat across deck boundaries. Deck state is per page load;
   shuffles draw from the caller's rng so the test sweep stays deterministic.
2. **Scenario pools** (each builder computes its own answer; hint/explain match
   the story; UK Year-5 contexts):
   - `c5b` u07-written-mult t3: 8 (stadium, ferry+distractor, newsletter,
     library, warehouse, cinema two-step, bottling+distractor, week-as-word)
   - `c5b` u07-long-mult t3: 7 (bare, hall, coaches, seedlings, egg-farm
     +distractor, February days, chairs+extra two-step)
   - `c5b` u07-division t3: 9 (bare, 3× round-up, 3× round-down, remainder
     itself, sharing)
   - `c5b` u09-addsub-frac t3: 6 · u09-mixed-addsub t3: 6 · u10-mult-frac t3
     story branch: 6 · u10-frac-amounts t3: 8 · u11-percent t3 "100−p": 4
   - `c5a` u03-problems: rotate t3 over 4 structures (+2 new: distractor,
     comparison two-step); vary nouns in t1/t2
   - `c5a` u05-perimeter t3 fence branch: 3 contexts
   - `c5c` u12-addsub-dec t3: 5 · t2 money nouns varied
   - `c5c` u16-metric t3: 4 (mixed-unit conversions incl. one subtraction)
3. **`app/sw.js`** — CACHE_VERSION v11 → v12 (no new files; gen.js etc.
   already in ASSETS — verify).
4. **`app/tests/main.js`** — update pinned SW version check (v12, not v11);
   new unit test for `scenario()` rotation; variety regression tests
   (≥6 distinct digit-normalised prompts in 12 tier-3 draws for
   u07-written-mult; ≥4/8 for u16-metric).

## Verification

- Tests page at `http://localhost:8124/tests/tests.html` → 0 failed
  (includes the 3,840-question generator sweep).
- Manual pass: browser preview at 768×1024, generate a batch of tier-3
  prompts for the touched topics via console and eyeball the variety.
- Commit (project "done" bar). No push (deploy) without explicit request.
