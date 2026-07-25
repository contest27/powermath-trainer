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
- **2026-07-23 — Watch episodes (video-like explainers) are in-app animations,
  not MP4s.** Decision by Sebastian after rejecting audio-only podcasts:
  scene player (`watch-scenes.js`, 5 SVG primitives in the vis.js palette) +
  per-step MP3 narration (edge-tts, en-GB Sonia/Maisie, free and keyless) on
  ONE reused `<audio>` element with blob URLs. `vis.js` untouched (string
  builders without hooks; 65 call sites). MP3s live in the deploy-surviving
  `pmtrainer-media-v1` cache, whitelisted in sw.js activate. edge-tts is the
  first pip dependency of tools/ (`tools/narrate.py`); rendering needs the
  sandbox disabled (network), `--check` does not.

- **2026-07-24 — Map screen is a single-SVG pirate treasure map** („Abenteuer-
  Pfad"/„Schatzkarte", Sebastian's call for his son): pure builder
  `ui/map-scene.js` + shared `ui/svg.js` (s/di extracted from watch-scenes);
  32 stations in topicOrder, 10 regions from contiguous strand runs, fog after
  the current region, chest opens at 32/32. Mastery band moved into the coin
  ring colour (bandDot stays parent-corner only); Watch signs stay unit-scoped
  (two signs for unit 8, parity with the old list). The v5→v6 SW bump doubles
  as the real-world probe that `pmtrainer-media-v1` survives version bumps —
  record the outcome after the iPad check.
- **2026-07-24 — Tap a map station to practise that topic.** A confirm sheet
  (not the old toast) launches focused practice: current topic → explanation
  then the 11-item ramp (completes the topic, advances the journey); completed
  topic → 8 adaptive review items (no completion change). Scope = completed +
  current only; far/locked stay under the fog. Runs in a NEW top-level
  `focusSession` slot (boot-cleared, precedence over `activeSession`) so a
  half-finished daily lesson is never destroyed; pure logic in leaf `ui/focus.js`
  (buildFocusSession/applySessionEnd/stationAction), engine untouched. Streak:
  focus-new counts, focus-review does not. Same-day topic pacing is
  deliberately uncapped (summer catch-up). SW v7.

- **2026-07-24 — AI tutor answers stream.** `qa/tutor.js` `askTutor` gained an
  optional `onText` callback: with it, the call uses `stream: true` and a raw
  SSE reader (`drainSSE`/`textDelta`, exported + unit-tested) that hands each
  `text_delta` to the callback; without it, the original non-streaming path is
  byte-identical (keeps `testKey` simple). `TutorError` kinds preserved; a
  mid-stream `error`/`refusal` event maps into one. `session.js` qaBox fills the
  tutor bubble live via `textContent` (tutor emits plain text — no escapeHtml
  needed). Model stays `claude-haiku-4-5` (no thinking/effort). Pattern copied
  from the Facharzttrainer `ai.js` `streamMessage`. SW v8.

## Learnings

- [LEARN:web] The embedded browser pane serves **stale ES modules from the HTTP
  cache even after Ctrl+Shift+R**; `python -m http.server` sends no
  `Cache-Control`. Dev servers here must send `no-store` (`tools/serve.py`).
  Diagnose by `fetch(url, {cache:'reload'})` (network) vs executed behaviour
  (module cache) — they can differ.
- [LEARN:pwa] Register the service worker only off-localhost, or local testing
  fights the precache. Deploys must bump `CACHE_VERSION` (see CLAUDE.md).
- [LEARN:pwa] An installed iOS PWA shows a new deploy only on the SECOND real
  launch: first launch installs the new SW in the background, and swiping the
  app away then reopening immediately often just thaws the frozen instance.
  Ritual: open with network ~30 s → kill via app switcher → reopen. Confirmed
  2026-07-24 (Watch-PoC rollout). Corollary: a release whose visible change
  is buried (Watch ▶ lives on the map's fractions island; Today looked
  identical) is indistinguishable from a failed update — the app has no
  version indicator yet (candidate: CACHE_VERSION row + "check for update"
  button in the Parent corner).
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
