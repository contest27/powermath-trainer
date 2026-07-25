# PowerMath Trainer — Project Map

**Status:** v1 + Watch + Schatzkarte LIVE (sw v6) · Karten-Übung gebaut & verifiziert (sw v7), wartet auf Commit-Go
**Last updated:** 2026-07-24

## Recent (updated 2026-07-24)

**Active workstream — Thema von der Schatzkarte üben** (*Tap auf eine Station startet
eine fokussierte Übung: aktuelles Thema → Erklärung + 11er-Ramp (schließt ab); erledigt
→ 8 adaptive Wiederholungen*). Gebaut, verifiziert: 95/95 Tests, echte Screen-Durchläufe
im 768×1024-Viewport, **Tageslektion-Isolation** (eigener `focusSession`-Slot) und
Daily-Regression bestätigt. Offen: Commit-Go (sw v7).

1. [[quality_reports/session_logs/2026-07-24_map-practice|📄 Session-Log Karten-Übung]] — Verlauf + volle Verifikation. **Start here.**
2. [[quality_reports/plans/2026-07-24_map-practice|Approved plan]] — focusSession-Slot, Umfang, Streak-/Tempo-Semantik.
3. [[quality_reports/session_logs/2026-07-24_treasure-map|Session-Log Schatzkarte]] — die Karte selbst (deployt, sw v6).
4. [[MEMORY|Project memory]] — Entscheidungen 2026-07-23 (Watch) + 2026-07-24 (Schatzkarte, Karten-Übung, iOS-Zweistart).

**Open for Sebastian:** Karten-Übung im Browser testen (localhost:8124 → Map → Station
tippen) und „commit" geben · **weiterhin offen aus dem Vortag:** iPad-Media-Cache-Probe
(Flugmodus → Watch-Episode ohne Nachladen) · nächste Übernahme wählen (Streaming-Tutor,
KI-Buddy, Freitags-Challenge).

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
