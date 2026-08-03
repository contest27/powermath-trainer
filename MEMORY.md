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

- **2026-07-25 — Global AI Buddy.** Floating FAB + bottom-sheet chat, reachable
  everywhere except the explanation screen (qaBox owns the chat there); on a
  practice question an intent choice ("help me / side question"). MILD dampening:
  `updateMastery(m, tier, ok, {assisted})` halves the *correct* EWMA weight
  (`wRight/2`); wrong stays fully wrong; the review interval follows the score
  band automatically (no schedule clamp); **stars stay** (results.ok unchanged).
  Signal = `item.assisted` on the persisted session object (set live at tap by
  `onAssist`, read by `recordResult`). Chat streaming extracted to leaf
  `ui/chat.js` (`createChat({ask,onExchange})`), shared by qaBox + buddy;
  `escapeHtml`/`friendlyTutorError` moved there. `buddySystemPrompt(ctx)` in
  tutor.js (`askTutor` gained a `system` param); passes the question stem, never
  the answer. Global chrome mounts once to `document.body` and refreshes via
  `core.js onAfterRender`. New top-level `chats` (CHAT_CAP 100, backup-only).
  Diagnostic guard is structural (no intent button in the warm-up, so a helped
  answer can't inflate the seeded prior). Flaw B accepted: earlier review is
  cumulative / band-crossing, not guaranteed per answer — that is what MILD
  means. Model stays haiku. SW v9.

- **2026-07-25 — Guided explanation + German on demand.** The child's English is
  still weak, so a new topic is now stepped through part by part (`ui/lesson.js`,
  pure: `lessonSteps` = segments + example + check-in, `canPractise`), and
  practice is gated behind a check-in ("understood, or shall I translate?").
  BOTH check-in answers unlock — asking for German must never trap him. The step
  position revives `segIdx`, a field both session builders wrote and nothing read,
  so it persists with the session and resumes mid-lesson. Translation =
  `translateSystemPrompt()` through the existing `askTutor` system override
  (German, English maths term in brackets, never gives away an answer); the
  offline/no-key fallback is the `alt` rephrasing that already exists for every
  segment — never a dead end. `tts.speak` gained a `lang` option +
  `germanVoice()`, because `chooseVoice` always fell back to English and German
  read by an English voice is unusable; the play button appears only when a
  German voice exists. Translations log to `qaLog` with `source:'translate'` so
  the parent sees what he stumbled over. Review/repeat sessions are untouched
  (no explanation phase). SW v10.

- **2026-07-25 — Language help on questions ("Was heißt das?").** A second,
  deliberately different help path: `wordHelpSystemPrompt()` explains the
  English *wording* of a practice question in German and is forbidden — several
  ways over — to solve, calculate, reveal the first step or hint. It does **not**
  set `item.assisted`, so it gives **full** mastery credit (Sebastian's call: the
  app measures maths, not English; dampening it would make the child avoid the
  button and guess instead). The buddy's "help me with this" stays the only
  dampening path. Shown on every question **including the diagnostic** — language
  confusion there would corrupt the seeded priors for the whole summer, so
  helping actually protects the measurement (this does not weaken the earlier
  structural guard, which only bars *maths* help from the warm-up). Questions are
  generated, so there is no offline rephrasing: without a key the button is not
  rendered at all rather than promising help. Logged as `source:'wordhelp'` (🔤)
  distinct from `'translate'` (🇩🇪) so the parent can tell "didn't understand the
  lesson" from "couldn't read the question". SW v11.

- **2026-08-03 — Word problems rotate through scenario pools.** Sebastian's
  complaint: tier-3 story slots were one hardcoded scenario ("5× the stadium
  problem with new numbers"), so the child pattern-matched instead of reading.
  `gen.js scenario(rng, key, builders)` deals a per-key shuffled deck of
  builder indices without replacement (no repeat until the pool is exhausted;
  no immediate repeat across deck boundaries; state per page load, shuffle from
  the caller's rng so tests stay deterministic). Pools of 4–9 stories per slot
  across c5a/c5b/c5c with deliberate STRUCTURE variety, not just nouns:
  distractor numbers ("the crossing takes 45 minutes"), two-step twists
  (× then −), the second number hidden in a word ("in a week"), and for
  division all four remainder readings (round up / round down / remainder
  itself / share out). Regression-tested: rotation unit test + distinct
  digit-masked prompt shells across consecutive draws. SW v12.

## Learnings

- [LEARN:ui] `Element.append(null)` inserts a **visible text node "null"** —
  native append stringifies non-nodes; only our `h()` helper filters falsy
  children. Guard optional rows at the call site (`const x = maybeRow(); if (x)
  card.append(x)`). Found 2026-08-03: every question card showed "null" when no
  API key is stored (wordHelpRow returns null) — invisible on the iPad because
  the key is set there, real for any fresh install.

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
