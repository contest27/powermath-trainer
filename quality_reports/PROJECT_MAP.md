# PowerMath Trainer — Project Map

**Status:** alles LIVE inkl. kürzerer Übungen + Zieldatum-Aufholen (sw v13, `02c76e1`, deployt 2026-08-04) · offen: iPad-Abnahme
**Last updated:** 2026-08-04

## Recent (updated 2026-08-04)

**Active workstream — Kürzere Übungen + Aufholen bis 16.8.** (*Sebastians Befund: „18
Aufgaben pro Übung — wir werden nicht fertig bis 16.8."*). Zwei Hebel: Tages-Session
**18 → 11 Aufgaben** (7er-Ramp + max. 4 Review; Karten-Übung 8 → 6; 3-Sterne-Schwelle
0,90 → 0,85, damit ein Flüchtigkeitsfehler bei 7 Aufgaben nicht das dritte Sternchen
kostet) **und** Zieldatum-Pacing: `settings.targetDate` (Default 16.8., Parent Corner,
löschen = aus) → Today-Karte zeigt das Tempo; nach jedem abgeschlossenen Thema bietet
der Summary-Screen per Ein-Tap „🚀 One more topic" das nächste Thema an, solange die
Rechnung >1 Thema/Tag verlangt (selbstregulierend). Verifiziert: **133 Tests grün**,
E2E-Durchlauf (Daily 7+4 → Aufhol-Tap → Thema 2 komplett, 16/32) bei 768×1024.
**Committet `02c76e1`, gepusht + deployt (sw v13 live auf Pages verifiziert, 2026-08-04).**

0. [[quality_reports/session_logs/2026-08-04_shorter-sessions-target-pacing|📄 Session-Log Kürzere Übungen + Pacing]] — Diagnose (zwei Probleme in einem Satz), Verifikation. **Start hier.**
0a. [[quality_reports/plans/2026-08-04_shorter-sessions-target-pacing|Plan Kürzere Übungen]] — COMPLETED.

## Recent-Trail (2026-08-03, deployt)

**Abwechslungsreiche Textaufgaben** (*Sebastians Befund: „5× die
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

**Open for Sebastian (Stand 2026-08-04):** **auf dem iPad:** Zweistart-Ritual, dann prüfen:
Übung fühlt sich kurz genug an, Aufhol-Knopf erscheint, Zieldatum im Parent Corner passt
(Default 16.8.; 7+4-Aufgabenzahl ist bei Bedarf in scheduler.js in einer Minute justiert) ·
**weiter offen:** Media-Cache-Probe der Watch-Episode (Flugmodus) · Übernahmeliste:
Freitags-Challenge.

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
