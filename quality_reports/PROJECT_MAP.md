# PowerMath Trainer — Project Map

**Status:** v1 + Watch-PoC LIVE at https://contest27.github.io/powermath-trainer/ · awaiting iPad test of the episode
**Last updated:** 2026-07-24

## Recent (updated 2026-07-24)

**Active workstream — Watch-Episoden PoC** (*video-artige, vertonte In-App-Erklärfilme
statt Podcast/MP4 — Facharzttrainer-Feature-Transfer*). Erste Episode „Equivalent
fractions" (Unit 8, 18 Steps, 2,9 min, edge-tts Sonia/Maisie) gebaut, verifiziert
(70/70 Tests, Playback-Kette real gemessen), committet und deployt (sw v5). Offen:
iPad-Gestenkette + Stimmen-Abnahme.

1. [[quality_reports/session_logs/2026-07-23_watch-poc|📄 Session-Log Watch-PoC]] — Verlauf + vollständige Verifikationsliste. **Start here.**
2. [[quality_reports/plans/2026-07-23_watch-episodes-poc|Approved plan]] — Architektur (Blob-Audio-Kette, Media-Cache, Szenen-DSL).
3. [[README|README]] — Nutzerdoku inkl. neuem Watch-Absatz + narrate.py.
4. [[MEMORY|Project memory]] — neue Entscheidung 2026-07-23 (In-App-Animation, edge-tts, Media-Cache).

**Open for Sebastian:** auf dem iPad die Episode einmal komplett laufen lassen
(Gestenkette!) und Stimmen beurteilen (Fallback: Gemini-TTS) · danach Offline-Probe:
Flugmodus → Rewatch aus der Map · nächste Übernahme-Kandidaten wählen
(Streaming-Tutor, KI-Buddy, „Thema üben").

*(Der v1-Status unten bleibt gültig; die iPad-Akzeptanz von v1 ist weiterhin offen.)*

### v1 build (2026-07-20, superseded als aktiver Workstream)

1. [[quality_reports/plans/2026-07-20_powermath-trainer-v1|v1 plan]] — scope and decisions.
2. [[quality_reports/session_logs/2026-07-20_initial-build|v1 session log]] — build trail.

**Open for Sebastian (v1):** iPad acceptance checklist (README) ·
optional: Anthropic API key on the iPad for the AI tutor · optional: teacher's
flagged weak topics to seed the scheduler.
