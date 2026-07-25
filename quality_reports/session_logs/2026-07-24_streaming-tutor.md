# Session-Log 2026-07-24 — Streaming-Tutor

## Ziel

Nächster Facharzttrainer-Übernahme-Kandidat (Sebastians Wahl): der KI-Tutor
soll seine Antwort Wort für Wort tröpfeln lassen statt zu warten. Muster aus
`ai.js` `streamMessage` (roher SSE-fetch), PowerMath-`TutorError`-Semantik bleibt.
Plan: `quality_reports/plans/2026-07-24_streaming-tutor.md` (APPROVED).

## Entscheidungen

- `askTutor({..., onText})`: mit onText → Streaming, ohne → unveränderter
  non-streaming Pfad (testKey bleibt exakt).
- SSE-Parser als pure exportierte Funktion `drainSSE`/`textDelta` (testbar,
  Chunk-Grenzen).
- UI: streamende Bubble via textContent (Plain Text, kein escapeHtml nötig),
  speakerButton nach Abschluss.
- Modell bleibt haiku-4-5; kein thinking/effort. SW → v8.
- claude-api-Skill gelesen (Regel: bei KI-Anbindung Pflicht): stream:true,
  \n\n-getrennt, content_block_delta/text_delta bestätigt; 401 weiter als !res.ok.

## Verlauf

- Plan genehmigt (kleines Feature, kein Plan-Agent). Tasks angelegt, Housekeeping.
- tutor.js: `drainSSE`/`textDelta` (pur, exportiert) + Streaming-Zweig in
  askTutor (onText → stream:true; ohne → non-streaming unverändert). session.js
  qaBox: streamende Bubble via textContent, speakerButton nach Abschluss,
  Fehler-Note bei Teil-Text. CSS: flex-wrap + .tutor-stream/.tutor-note. SW v8.

## Verifikation

- Tests: **102/102 grün** (95 vorher + 7 SSE-Parser: ein/mehrere Events,
  Chunk-Split, blank/[DONE]/non-text übersprungen, error-Event, textDelta,
  kaputtes JSON).
- **askTutor-Kern (gemockter fetch, kein echter Key):** Streaming → 5 Fragmente
  via onText, Rückgabe = konkateniert; 401 vor Stream → TutorError kind 'http'
  status 401 (Semantik erhalten); non-streaming Pfad → 'ready' (testKey intakt).
- **qaBox end-to-end (gemockter SSE-Stream):** Bubble tröpfelt (Zwischenstand ≠
  Endtext), Endtext vollständig, `.speak`-Button (tts verfügbar) danach, qaLog
  source 'ai', Ask re-enabled, kein hängendes „Thinking…"; 401 ohne Teil-Text →
  friendlyTutorError-Bubble. Konsole leer.
- Non-streaming Pfad + testKey byte-identisch (nur onText-Zweig neu).

## Offen

- Commit erst auf Go; danach Deploy (sw v8). Echter Live-Durchlauf (Antwort
  tröpfelt mit gültigem Key) bleibt Sebastians iPad-Test — braucht bezahltes
  API-Guthaben (Promo zahlt nicht, s. check.html).
