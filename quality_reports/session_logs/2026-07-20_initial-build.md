# Session Log — 2026-07-20 — Initial build

**Goal:** Build the PowerMath Trainer v1 end-to-end per the approved plan
(`quality_reports/plans/2026-07-20_powermath-trainer-v1.md`).

## Key context

- Decisions: English · full Y5 (17 official units → ~30 daily topics) · AI tutor
  (Claude Haiku, parent-entered key, browser-direct via
  `anthropic-dangerous-direct-browser-access`) + FAQ fallback · on-device storage
  + backup export.
- Official Power Maths Y5 yearly overview obtained (Pegasus Primary PDF,
  extracted with pdftotext; lesson-level titles available in scratchpad).

## Decisions during build

- **2026-07-20 — Stack deviation: no-build vanilla JS instead of Vite+React+TS.**
  Node.js is not installed on this machine (checked PATH + common install
  locations). Rather than installing a runtime unprompted, the app is plain ES
  modules served statically — zero build step, deployable to GitHub Pages
  as-is. Tests run in a browser-based runner (verified via the in-app browser)
  instead of Vitest. Python 3.14 + Pillow available for tooling (icons, checks).
  All plan deliverables unchanged. Revisit React/Vite only if Sebastian installs
  Node and asks for it.
- **2026-07-20 — SW registration skipped on localhost** after the precache
  served stale modules to the test runner mid-loop.
- **2026-07-20 — Dev server sends `Cache-Control: no-store`** (`tools/serve.py`)
  after the browser pane kept executing a stale `gen.js` from the HTTP cache
  even through a hard reload. Root-caused by comparing fetched source (fresh)
  with executed behaviour (stale).

## End of session (2026-07-20)

**Delivered:** complete v1 across five commits — engine (mastery/scheduler/
storage), UI (5 screens, 5 question input types, TTS segment player), 32 topics
+ diagnostic grounded in the official Power Maths Y5 lesson list, AI tutor +
parent corner, PWA (manifest/icons/SW), Pages workflow, docs.

**Verification evidence:**
- Test suite: **54/54 green** — includes a 3,840-question generator sweep
  (32 topics × 3 tiers × 40 seeds; well-formedness + checker round-trip) and
  a 20-seed diagnostic sweep. Five duplicate-MC-option bugs found and fixed.
- E2E at 768×1024 through the real UI (scripted clicks): diagnostic (18 items,
  4 deliberately wrong) → mastery seeded 85/63/40 by strand exactly as designed
  → topic day (explanation player, alt-text toggle, FAQ bubbles) → 11-item
  practice (3 stars) → simulated next day → 11 practice + 7 review items,
  weakest-due topic reviewed and rescheduled +7d → mid-session abandon +
  resume → parent corner (gate, overview 2/32, name → greeting, export).
  Zero console errors.

**Open:** Sebastian creates the GitHub repo → push → Pages live → iPad
acceptance checklist (README). Quality self-assessment: ~90 (send-ready;
95 pending real-device audio/offline confirmation).
