# PowerMath Trainer — Project Map

**Status:** alle sechs Features LIVE (sw v10) — Watch, Schatzkarte, Karten-Übung, Streaming-Tutor, KI-Buddy, Geführte Erklärung · offen: iPad-Abnahme
**Last updated:** 2026-07-25

## Recent (updated 2026-07-25)

**Active workstream — Geführte Erklärung + Deutsch auf Abruf** (*neues Thema wird Schritt
für Schritt durchgegangen; Übung schaltet erst nach der Rückfrage „verstanden — oder soll
ich es dir auf Deutsch erklären?" frei; 🇩🇪-Knopf an jedem Schritt, ohne Key die einfachere
englische Fassung*). Gebaut, verifiziert: **124 Tests grün**, Tor hält im echten Durchlauf,
Deutsch-Streaming gegen gemockten SSE-Stream, Fortsetzen mitten in der Lektion, Wiederholungen
unangetastet. **Committet `a1a28f9`, deployt (sw v10), live verifiziert.**

1. [[quality_reports/session_logs/2026-07-25_guided-explanation|📄 Session-Log Geführte Erklärung]] — Verlauf + volle Verifikation. **Start here.**
2. [[quality_reports/plans/2026-07-25_guided-explanation|Approved plan]] — Schrittmodell, Tor, Übersetzung, TTS-Fund.
3. [[quality_reports/session_logs/2026-07-25_ai-buddy|KI-Buddy]] (deployt, `a8cf2d7`) · [[quality_reports/session_logs/2026-07-24_streaming-tutor|Streaming-Tutor]] · [[quality_reports/session_logs/2026-07-24_map-practice|Karten-Übung]] · [[quality_reports/session_logs/2026-07-24_treasure-map|Schatzkarte]].
4. [[MEMORY|Project memory]] — alle Entscheidungen + iOS-Zweistart-Lesson.

**Open for Sebastian:** geführte Erklärung im Browser ansehen (localhost:8124 → neues Thema)
und „commit" geben · **auf dem iPad:** beurteilen, ob 6 Schritte pro neuem Thema angenehm sind
(sonst Eltern-Schalter nachrüstbar) · **weiter offen:** Media-Cache-Probe der Watch-Episode
(Flugmodus, ohne Nachladen) · Rest der Übernahmeliste: Freitags-Challenge, kuratierte Textaufgaben.

*(Fünf Features dieser Session: Watch, Schatzkarte, Karten-Übung, Streaming-Tutor live; der Buddy wartet auf Commit. Media-Cache-Probe steht noch.)*

<!-- Ältere Recent-Blöcke (Schatzkarte/Watch) siehe Git-History; Trail läuft über die Session-Logs oben. -->

### Media-Cache-Probe (offen seit Schatzkarte)

Auf dem iPad: Flugmodus → Watch-Episode muss ohne Nachladen
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
