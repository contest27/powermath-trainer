# PowerMath Trainer — Project Map

**Status:** alle sieben Features + Aufgaben-Vielfalt LIVE (sw v12, `fd9211c`, deployt 2026-08-03) · offen: iPad-Abnahme
**Last updated:** 2026-08-03

## Recent (updated 2026-08-03)

**Active workstream — Abwechslungsreiche Textaufgaben** (*Sebastians Befund: „5× die
gleiche Stadion-Aufgabe mit anderen Zahlen"*). Story-Slots rotieren jetzt durch Szenario-
Pools (4–9 Geschichten je Slot, Kartendeck ohne Zurücklegen — keine Wiederholung, bis der
Pool durch ist) mit echter Struktur-Varianz fürs Textverständnis: Distraktor-Zahlen,
Zweischritt, Zahl als Wort („in a week"), wechselnde Rest-Interpretation bei Division.
Verifiziert: **129 Tests grün** (Sweep 3.840 Fragen + neue Rotations-/Varianz-Tests),
Stichproben handgeprüft, UI-Pass 768×1024. Beifang: sichtbares „null" unter jeder Frage
ohne API-Key gefixt (`append(null)`). **Committet `fd9211c`, gepusht + deployt (sw v12
live auf Pages verifiziert, 2026-08-03).**

0. [[quality_reports/session_logs/2026-08-03_word-problem-variety|📄 Session-Log Aufgaben-Vielfalt]] — Diagnose, Pools je Thema, Verifikation. **Start hier.**
0a. [[quality_reports/plans/2026-08-03_word-problem-variety|Plan Aufgaben-Vielfalt]] — COMPLETED.
0b. [[quality_reports/session_logs/2026-07-25_word-help|Session-Log Sprachhilfe an den Aufgaben]] — „🇩🇪 Was heißt das?", volle Gutschrift, auch im Check-up (`c1e0205`, deployt).
1. [[quality_reports/session_logs/2026-07-25_guided-explanation|Session-Log Geführte Erklärung]] — Verlauf + volle Verifikation.
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
