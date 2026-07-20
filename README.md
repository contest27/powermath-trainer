# PowerMath Trainer

Daily Year 5 maths practice for the summer holidays — a Power Maths (UK) revision
app that runs on an iPad as an installable web app. One topic per day, ~20–30
minutes: an explanation with re-listenable audio segments, a practice block, and
an adaptive review of earlier topics — weaker topics come back more often.

Built as a **no-build static app**: plain ES modules, no framework, no bundler,
no backend. Deployable to GitHub Pages as-is.

## What is inside

- **32 daily topics** covering all 17 units of Power Maths Year 5 (books
  5A/5B/5C), authored against the official yearly overview and lesson list.
- **Day-1 diagnostic** (18 mixed questions) seeds a per-topic mastery score.
- **Adaptive review** (Leitner-style): struggling topics return after 1 day,
  developing after 3, secure after 7. Review questions are tiered to the
  child's current level.
- **Explanation player**: 4–6 short segments per topic, each with tap-to-listen
  audio (device speech synthesis), a "say it differently" simpler rephrasing,
  and Power Maths visual models (bar models, place-value grids, number lines).
- **Question types**: number pad, multiple choice, true/false, fraction entry,
  tap-to-order — all touch-first. One retry with a hint, then a friendly
  explanation.
- **Q&A**: pre-written FAQ chips per topic (offline); optionally an AI tutor
  (Claude Haiku) once a parent enters an Anthropic API key in the Parent corner.
  The key lives only on the device and is stripped from backups.
- **Parent corner** (long-press the ⚙️): mastery heatmap, session history,
  AI question log, voice settings, backup export/import, reset.
- **PWA**: installable to the home screen, works offline after first load.

## Deploying to GitHub Pages

1. Create an empty GitHub repository (e.g. `powermath-trainer`). Public repos
   get Pages for free; private needs a paid plan.
2. Push this project:
   ```
   git remote add origin https://github.com/<user>/powermath-trainer.git
   git push -u origin main
   ```
3. In the repo: **Settings → Pages → Source: GitHub Actions**. The included
   workflow (`.github/workflows/pages.yml`) publishes the `app/` folder on
   every push to `main`.
4. The app appears at `https://<user>.github.io/powermath-trainer/`.

**Every deploy that changes app files must bump `CACHE_VERSION` in
`app/sw.js`** — installed PWAs keep serving the old cached files until the
service worker version changes.

## First run on the iPad (acceptance checklist)

1. Open the Pages URL in Safari → Share → **Add to Home Screen** → open from
   the icon (this gives full-screen mode and durable storage).
2. Run the warm-up check (day-1 diagnostic) together.
3. Tap 🔊 on an explanation segment — audio should play; try
   "✨ Say it differently".
4. Answer a few questions; get one wrong on purpose to see the retry + hint.
5. Close the app fully, reopen — progress and streak should persist.
6. Optional AI tutor: long-press ⚙️ → solve the sum → *AI tutor* → paste an
   API key from console.anthropic.com → **Test** → ask a question in any
   explanation screen.
7. Parent corner → **Export backup** — save the file to Files/AirDrop weekly.
8. Airplane mode → reopen the app — it should still work (FAQ chips instead of
   the AI tutor).

## Development (this machine)

No Node.js required.

- **Serve locally**: `python3 tools/serve.py 8124` → http://localhost:8124
  (no-cache dev server; the service worker is skipped on localhost).
- **Run tests**: open http://localhost:8124/tests/tests.html — 54 tests
  covering the engine, checker, and a 3,840-question property sweep across
  every generator. All must pass.
- **Regenerate icons**: `python3 tools/make_icons.py` (needs Pillow).

## Layout

```
app/                  the deployed site (served as-is)
  js/engine/          rng, storage, mastery model, scheduler, checker, progress
  js/content/         32 topic modules + diagnostic + SVG visual builders
  js/ui/              screens (today, session, map, parent) + components
  js/qa/tutor.js      browser-direct Claude call (BYO key)
  tests/              browser test runner
tools/                Python dev tooling (server, icons)
quality_reports/      plans, session logs (project framework)
```
