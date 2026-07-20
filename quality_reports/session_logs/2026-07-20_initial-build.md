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
