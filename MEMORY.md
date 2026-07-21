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
- [LEARN:api] **Anthropic promotional credit does not pay for API usage.** A
  console account showing a healthy balance can still fail every API call if
  that balance is promotional; the key itself is valid. Cost us several
  round-trips on 2026-07-21 because the app collapsed every failure into
  "Could not reach the API". Fix: buy paid credit (min $5).
- [LEARN:errors] Never collapse distinct failure modes into one message. The
  catch-all above hid the real cause; `TutorError` now carries kind + HTTP
  status + the API's own wording, and `app/check.html` is a cache-proof
  diagnostic page (self-contained, no module imports) for field debugging.
- [LEARN:web] `navigator.onLine` is unreliable in installed iOS web apps — it
  can report false while the network works. Never gate a request on it;
  attempt the call and use the flag only to word a failure afterwards.
- [LEARN:content] `pdftotext -layout` (TeXLive) reads the "password-protected"
  Power Maths overview PDFs that both WebFetch and the PDF Read tool reject —
  owner-locked PDFs are usually extractable.
