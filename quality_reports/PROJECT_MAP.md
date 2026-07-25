# PowerMath Trainer — Project Map

**Status:** v1 + Watch + Schatzkarte + Karten-Übung LIVE (sw v7) · Streaming-Tutor gebaut & verifiziert (sw v8), wartet auf Commit-Go
**Last updated:** 2026-07-24

## Recent (updated 2026-07-24)

**Active workstream — Streaming-Tutor** (*KI-Tutor-Antworten tröpfeln Wort für Wort
statt zu warten — Facharzttrainer-SSE-Muster, PowerMath-Fehlersemantik erhalten*).
Gebaut, verifiziert: 102/102 Tests (7 SSE-Parser), askTutor-Kern + qaBox end-to-end
per gemocktem Stream (kein echter Key nötig). Offen: Commit-Go (sw v8).

1. [[quality_reports/session_logs/2026-07-24_streaming-tutor|📄 Session-Log Streaming-Tutor]] — Verlauf + Verifikation. **Start here.**
2. [[quality_reports/plans/2026-07-24_streaming-tutor|Approved plan]] — onText-Zweig, drainSSE, UI-Streaming.
3. [[quality_reports/session_logs/2026-07-24_map-practice|Session-Log Karten-Übung]] — Vorfeature (sw v7).
4. [[MEMORY|Project memory]] — Entscheidungen 2026-07-23/24 (Watch, Schatzkarte, Karten-Übung, Streaming-Tutor, iOS-Zweistart).

**Open for Sebastian:** „commit" für den Streaming-Tutor · auf dem iPad mit gültigem
(bezahltem) API-Key den Live-Durchlauf sehen · **weiter offen:** Media-Cache-Probe
(Flugmodus → Watch-Episode ohne Nachladen) · nächste Übernahme (KI-Buddy, Freitags-Challenge).

*(Die Schatzkarten-Optik ist abgenommen und deployt; die Media-Cache-Probe steht noch.)*

1. [[quality_reports/session_logs/2026-07-24_treasure-map|📄 Session-Log Schatzkarte]] — Verlauf + Verifikationsliste. **Start here.**
2. [[quality_reports/plans/2026-07-24_treasure-map|Approved plan]] — Geometrie, Regionen, Fix-Liste F1–F7.
3. [[quality_reports/session_logs/2026-07-23_watch-poc|Session-Log Watch-PoC]] — Vortag: Erklärfilm-Feature (deployt, sw v5, iPad bestätigt).
4. [[MEMORY|Project memory]] — Entscheidungen 2026-07-23 (Watch) + 2026-07-24 (Schatzkarte, iOS-Zweistart-Lesson).

**Open for Sebastian:** iPad aktualisieren (zwei echte Starts) → Schatzkarte mit dem
Sohn ansehen · **Media-Cache-Probe:** Flugmodus → Watch-Episode muss ohne Nachladen
spielen (v5→v6-Bump überlebt?) · Watch-Episode einmal komplett (Gestenkette +
Stimmen-Urteil) · danach nächste Übernahme wählen (Streaming-Tutor, KI-Buddy,
„Thema üben").

*(Der v1-Status unten bleibt gültig; die iPad-Akzeptanz von v1 ist weiterhin offen.)*

### v1 build (2026-07-20, superseded als aktiver Workstream)

1. [[quality_reports/plans/2026-07-20_powermath-trainer-v1|v1 plan]] — scope and decisions.
2. [[quality_reports/session_logs/2026-07-20_initial-build|v1 session log]] — build trail.

**Open for Sebastian (v1):** iPad acceptance checklist (README) ·
optional: Anthropic API key on the iPad for the AI tutor · optional: teacher's
flagged weak topics to seed the scheduler.
