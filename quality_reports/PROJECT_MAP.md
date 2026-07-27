# PowerMath Trainer — Project Map

**Status:** v1 + Watch + Schatzkarte + Karten-Übung + Streaming-Tutor LIVE (sw v8) · KI-Buddy gebaut & verifiziert (sw v9), wartet auf Commit-Go
**Last updated:** 2026-07-25

## Recent (updated 2026-07-25)

**Active workstream — KI-Buddy** (*schwebender 🦉-Hilfe-Knopf + Bottom-Sheet-Chat, überall
außer Erklärungs-Screen; mit-Hilfe-gelöst dämpft den Score mild (halbe Gutschrift), Sterne
bleiben*). Gebaut, verifiziert: **114 Tests grün**, end-to-end-Dämpfung im Browser gemessen
(assisted +2 vs. normal +4 auf tier-3 ab Score 70), Sichtbarkeitsmatrix, Parent-Sektion,
Backup-Roundtrip. Offen: Commit-Go (sw v9). Braucht bezahlten API-Key, um sichtbar zu sein.

1. [[quality_reports/session_logs/2026-07-25_ai-buddy|📄 Session-Log KI-Buddy]] — Verlauf + volle Verifikation. **Start here.**
2. [[quality_reports/plans/2026-07-25_ai-buddy|Approved plan]] — Dämpfung mild, `item.assisted`-Signal, Diagnostik-Guard, Flaws.
3. [[quality_reports/session_logs/2026-07-24_streaming-tutor|Streaming-Tutor]] · [[quality_reports/session_logs/2026-07-24_map-practice|Karten-Übung]] · [[quality_reports/session_logs/2026-07-24_treasure-map|Schatzkarte]] — die Vortags-Features (alle deployt).
4. [[MEMORY|Project memory]] — Entscheidungen Watch/Schatzkarte/Karten-Übung/Streaming-Tutor/Buddy + iOS-Zweistart.

**Open for Sebastian:** Buddy im Browser testen (localhost:8124, Key im Parent Corner → Karte/Übungsfrage
→ 🦉-Knopf) und „commit" geben · **iPad, weiter offen:** Media-Cache-Probe der Watch-Episode
(Flugmodus, ohne Nachladen) · verbleibende Übernahme-Kandidaten: Freitags-Challenge, kuratierte Textaufgaben.

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
