# PowerMath Trainer — Year 5 Summer Review App

**Status:** DRAFT (pending approval) · **Date:** 2026-07-20 · **Identity:** Builder

## Context

Sebastian's son has finished Year 5 at an international school using the Power Maths curriculum (Pearson, White Rose-aligned). Over the summer he will do daily 20-30 minute training sessions on an iPad. The app must: run as a web app deployed via GitHub (Pages), save progress, adaptively repeat weak topics, present one new topic per day starting with an explanation whose segments he can re-listen to, and let him ask questions.

**Decisions confirmed 2026-07-20:** English throughout · full Year 5 coverage · AI tutor (Claude Haiku) with parent-entered API key + offline FAQ fallback · progress on-device with backup export.

**Verified facts:**
- Official Power Maths Y5 structure obtained (yearly overview PDF, saved locally): 17 units across textbooks 5A/5B/5C, 143 lessons. Lesson-level titles available for content authoring.
- Anthropic API supports direct browser calls via the `anthropic-dangerous-direct-browser-access: true` header — the "bring your own key" pattern works on a static site, no proxy server needed. Model: `claude-haiku-4-5` ($1/$5 per MTok; a few questions/day ≈ cents/month).

## Assumptions (veto any at review)

- **Light gamification:** daily streak, stars per session, progress map. No accounts, no ads.
- **Schedule-agnostic:** the app serves "today's session" whenever opened; no hard calendar. New topics run out after ~30 sessions, then sessions become pure adaptive review. Works for any remaining holiday length.
- **Audio via the iPad's built-in speech synthesis** (Web Speech API, en-GB voice, slightly slowed). No pre-recorded audio files. Text is always visible alongside.
- Son's name set once in parent settings for personalized greetings.

## Architecture

- **Stack:** Vite + React + TypeScript, static single-page app. PWA (vite-plugin-pwa): installable to the iPad home screen, works offline after first load.
- **Hosting:** new GitHub repo `powermath-trainer`, GitHub Pages deployed by a GitHub Actions workflow on every push to `main`.
- **Storage:** `localStorage` (versioned JSON schema — attempts, per-topic mastery, settings; ~200 KB/summer, well under limits). One-tap **backup export** (JSON file via share sheet) + import. Daily use + home-screen install prevents Safari's storage eviction; a weekly backup reminder covers the residual risk.
- **AI Q&A:** direct `fetch` to the Messages API with `x-api-key` + `anthropic-dangerous-direct-browser-access` headers. Key entered once in parent settings, stored only on the device, never in the repo. System prompt: patient UK Year 5 maths tutor, Power Maths methods/vocabulary, answers under ~120 words, kid-safe, never reveals the answer to the exercise currently on screen. Recent Q&A visible in the parent corner for transparency. No key or offline → FAQ chips + "ask a parent".

## Content model

17 official units grouped into **~30 daily topics** (unit → days): Place value within 100,000 →1 · Place value within 1,000,000 →2 (incl. negative numbers, sequences) · Addition and subtraction →2 · Graphs and tables →1 · Multiplication and division (1) →2 · Area and perimeter →2 · Multiplication and division (2) →3 · Fractions (1) →2 · Fractions (2) →2 · Fractions (3) →2 · Decimals and percentages →2 · Decimals →3 · Properties of shapes (1)+(2) →2 · Position and direction →1 · Converting units →2 · Volume and capacity →1. Day 1 additionally starts with a **diagnostic quiz** (~18 mixed items) that seeds the mastery scores.

Each topic is a TypeScript module:
- `explanation`: 4-7 short segments, each with text, a **"say it differently"** simpler rephrasing, and where useful an SVG visual (bar model, part-whole model, place-value grid, number line, fraction diagrams — matching Power Maths methods: column methods with exchange, area model, short division).
- `workedExample`: one step-through example.
- `faqs`: 4-5 pre-written Q&A pairs.
- `questionBank`: parameterized generators with seeded RNG (arithmetic — unlimited fresh variants across 3 difficulty tiers) plus curated fixed items (word problems, diagram questions).

Question types: multiple choice, numeric keypad entry, fraction entry, true/false, ordering — all touch-first with large targets. Fractions rendered with a small CSS component (no LaTeX dependency needed at this level).

## Adaptive engine

- Per-topic **mastery score 0-100** from recency-weighted accuracy (misses on easier tiers weigh more).
- Leitner-style review intervals: struggling (<60) → due every 1-2 days · developing (60-85) → every 3-4 days · secure (>85) → weekly.
- **Daily session ≈ 25 min:** explanation with replayable audio (~6 min) → 10-12 practice items on the new topic → review block of 6-8 items drawn from due/weak topics. Soft timer ends the session gracefully; leftovers roll over. After all 30 topics: full adaptive review sessions.

## Screens

1. **Today** (kid): greeting, streak, one big "Start" button → explanation player → practice → review → summary with stars.
2. **Explanation player:** segment list, per-segment play/replay, "explain it differently", Q&A box.
3. **Progress map** (kid): islands per strand with stars.
4. **Parent corner** (behind a simple hold-to-open gate): mastery heatmap per topic, session history, AI Q&A log, API key entry, backup export/import, name/voice settings, reset.

## Build phases

1. **Scaffold** — repo init, Vite + React + TS + PWA, Pages workflow, base theme (large type, high contrast, kid-friendly).
2. **Engines** — storage layer, mastery model + scheduler, session composer, question renderer + input components, TTS player. Vitest unit tests for scheduler, generators, mastery math, storage round-trip.
3. **Content** — all ~30 topics + diagnostic, authored from the official lesson list (largest phase). Early gate: Sebastian reviews 2-3 sample topics for method fidelity before the rest are written.
4. **Q&A** — FAQ UI + Anthropic integration + parent settings.
5. **Polish & deploy** — gamification, backup flows, iPad-viewport testing in the browser pane, deploy to Pages, on-device acceptance checklist.
6. **Housekeeping** — project CLAUDE.md (Builder), MEMORY.md, README, quality_reports skeleton, session log, copy of this plan to `quality_reports/plans/`.

## Verification

- **Vitest:** scheduler surfaces weak topics more often (simulated histories); every generator's stored answer is mathematically correct (property tests over seeds); mastery updates stay bounded; storage export→import round-trips.
- **Build & render:** `npm run build` clean; browser-pane pass at iPad viewport (768×1024): TTS plays, inputs work, offline reload after SW install, export produces valid JSON.
- **Acceptance (Sebastian, on the real iPad):** install to home screen → run one full session → audio replay → answer questions → progress persists after closing → enter API key → ask the tutor one question. Checklist provided at handover.

## Needed from Sebastian

- Create the empty GitHub repo `powermath-trainer` when we reach deploy (I handle everything else; push uses existing git credentials — `gh` is not installed).
- An Anthropic API key (console.anthropic.com), entered directly on the iPad — never shared with me or committed.
- Optional: any topics the teacher flagged as weak, to seed the scheduler; son's name.
