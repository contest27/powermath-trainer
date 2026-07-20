# CLAUDE.md — PowerMath Trainer

**Identity: Builder** (see user-scope CLAUDE.md). Side project: Year 5 maths
summer-revision web app for Sebastian's son. iPad-first PWA on GitHub Pages.

## Stack decision (do not silently change)

**No-build vanilla JavaScript** — plain ES modules served statically. Chosen
because this machine has **no Node.js**; there is no bundler, no framework, no
`package.json`. Python 3.14 (+ Pillow) covers tooling. Do not introduce a build
step or npm dependencies without an explicit decision logged in MEMORY.md.

## Commands

| Task | Command |
|---|---|
| Serve locally | `python3 tools/serve.py 8124` (no-cache; SW skipped on localhost) |
| Tests | open `http://localhost:8124/tests/tests.html` — must show 0 failed |
| Icons | `python3 tools/make_icons.py` |
| Deploy | push to `main`; Pages workflow publishes `app/` |

## Non-negotiables

1. **Bump `CACHE_VERSION` in `app/sw.js` on every deploy** that changes app
   files — installed PWAs serve stale assets until the SW version changes.
2. **New app files must be added to `ASSETS` in `app/sw.js`** or they will not
   be available offline.
3. **The Anthropic API key never enters the repo.** It is typed by the parent
   on the device, stored in localStorage, and stripped by `exportJSON()`.
   Keep it that way.
4. **Content changes**: every generated question's answer is computed, never
   hardcoded from a separate path. After touching `app/js/content/`, re-run the
   test page — the generator sweep validates 3,840 questions.
5. **Curriculum fidelity**: topic structure follows the official Power Maths Y5
   yearly overview (17 units, books 5A/5B/5C). Method vocabulary (exchange,
   bar model, column method) matches the classroom. Do not rename topics or
   invent units.

## Canonical sources

- Curriculum grounding: Power Maths Y5 yearly overview + lesson list
  (Pegasus Primary PDF; extracted text was used during authoring).
- App code: `app/` is the single source of truth and the deployed artifact —
  there is no build output to drift from.

## Verification bar ("done" for changes)

Tests page green + a manual pass of the touched screen at 768×1024 in the
browser preview + `git commit`. For engine/scheduler changes, also re-run the
E2E driver flow (diagnostic → daily → review → parent corner).
