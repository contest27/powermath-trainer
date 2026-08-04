# Plan: Shorter sessions + finish-by-target pacing

**Status:** COMPLETED — 2026-08-04 (133 tests green; see session log)
**Trigger:** "die übungen sind zu lang. bei 18 aufgaben pro übung werden wir
nicht fertig bis zum 16.8."

## Diagnosis

Daily = 11-item new-topic ramp (NEW_TOPIC_TIERS) + up to 7 review items
(REVIEW_ITEMS_DAILY) = 18 questions. Independently, the scheduler hands out
strictly ONE new topic per day, so with ~2 weeks left and more than ~13 of the
32 topics still open, the journey cannot finish by 16 Aug no matter how short
the session is. Two levers are needed: shorter sessions AND catch-up
throughput.

## Changes (settings chosen, flagged for Sebastian)

1. **Shorter sessions** (`scheduler.js`, `focus.js`):
   - NEW_TOPIC_TIERS 11 → 7: [1,1,2,2,2,3,3]
   - REVIEW_ITEMS_DAILY 7 → 4 → daily = 11 questions (was 18)
   - REVIEW_ITEMS_ONLY 16 → 10 (post-curriculum review day)
   - FOCUS_REVIEW_ITEMS 8 → 6 (map practice)
2. **Star fairness** (`progress.js`): 3-star threshold 0.9 → 0.85 so one slip
   in a 7-item ramp (6/7 = 85.7 %) still earns 3 stars. Existing test pins
   (10/11 → 3, 8/11 → 2, 5/11 → 1) remain valid.
3. **Target-date pacing** (`scheduler.js` `pacing()`, `storage.js`):
   - `settings.targetDate`, default '2026-08-16', editable in the Parent
     corner (clear = off; past date = feature silent).
   - pacing = { remaining, daysLeft (incl. today), perDay, needTwo:
     perDay > 1 }; null when no target/finished/target passed.
   - `load()`/`parseImport()` gain a nested settings merge (top-level
     Object.assign would drop new settings keys for existing states) via a
     shared exported `hydrate()`.
4. **Catch-up flow** (`session.js`, `focus.js`, `today.js`, `parent.js`):
   - Summary screen after a completed topic: if pacing().needTwo and a next
     topic exists → "🚀 One more topic today" button → focus-new session for
     the next topic (existing tested path; completes + advances journey),
     origin 'today' (buildFocusSession/startFocusSession gain an origin
     param, default 'map').
   - Today screen journey card: "🏁 To finish by …: N a day (X left, Y days)"
     when pacing is active.
   - Parent corner: date input for the target.
5. **sw.js** v12 → v13; tests: version pin, focus lengths 11→7 / 8→6, new
   pacing() tests, 6/7-stars test, hydrate() settings-merge test.

## Verification

Tests page 0 failed; browser pass at 768×1024: daily plan length ≤ 11,
summary shows the catch-up button when needTwo, second topic completes and
advances the journey. Commit; push only on Sebastian's go.
