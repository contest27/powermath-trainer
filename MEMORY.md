# MEMORY.md — PowerMath Trainer

Project-scope memory. Cross-project lessons go to `~/.claude/MEMORY.md`.

## Decisions

- **2026-07-20 — No-build vanilla JS stack.** Node.js is not installed on this
  machine; rather than installing a runtime unprompted, the app is plain ES
  modules + a browser test runner + Python tooling. Logged in the plan and
  CLAUDE.md. Revisit only if Sebastian installs Node and asks.
- **2026-07-20 — Q&A architecture.** FAQ chips offline-first; free-form AI via
  browser-direct Anthropic call (`anthropic-dangerous-direct-browser-access`
  header, model `claude-haiku-4-5`), key parent-entered on device only.
- **2026-07-20 — Adaptivity.** EWMA mastery 0–100 per topic; Leitner gaps
  1/3/7 days by band (<60 / 60–85 / >85); diagnostic seeds strand-level priors
  (40 + 45 × fraction correct). Misses on easier tiers weigh more.

## Learnings

- [LEARN:web] The embedded browser pane serves **stale ES modules from the HTTP
  cache even after Ctrl+Shift+R**; `python -m http.server` sends no
  `Cache-Control`. Dev servers here must send `no-store` (`tools/serve.py`).
  Diagnose by `fetch(url, {cache:'reload'})` (network) vs executed behaviour
  (module cache) — they can differ.
- [LEARN:pwa] Register the service worker only off-localhost, or local testing
  fights the precache. Deploys must bump `CACHE_VERSION` (see CLAUDE.md).
- [LEARN:testing] The "checker accepts its own answer" round-trip catches a
  whole class of generator bugs cheaply; duplicate-MC-options was the only
  failure class in 3,840 generated questions (5 generators, all fixed by
  dedupe-with-candidate-pools; `mcFrom` now dedupes globally).
- [LEARN:content] `pdftotext -layout` (TeXLive) reads the "password-protected"
  Power Maths overview PDFs that both WebFetch and the PDF Read tool reject —
  owner-locked PDFs are usually extractable.
