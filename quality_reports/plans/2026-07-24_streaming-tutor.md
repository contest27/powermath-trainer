# Streaming-Tutor — KI-Antworten tröpfeln Wort für Wort

**Status:** APPROVED (2026-07-24)
**Datum:** 2026-07-24
**Projekt:** PowerMath Trainer (Builder, iPad-only PWA, no-build vanilla JS)

## Context

Sebastian wählte als nächstes Facharzttrainer-Feature den **Streaming-Tutor**. Heute wartet der KI-Tutor (`qa/tutor.js`, Modell `claude-haiku-4-5`, browser-direkt) auf die komplette Antwort und zeigt so lange „Thinking…". Für ein 10-jähriges Kind ist tröpfelnder Text der Unterschied zwischen „es passiert etwas" und „es hängt". Der Facharzttrainer hat den fertigen SSE-Parser (`ai.js` `streamMessage`, roher fetch, kein SDK) — wir übernehmen das Muster und behalten die sorgfältige `TutorError`-Fehlersemantik von PowerMath.

Das `claude-api`-Skill bestätigt: `stream: true`, Events `\n\n`-getrennt, `content_block_delta`/`text_delta` liefert die Fragmente; ein 401 o. ä. kommt weiter als `!res.ok` **vor** dem Stream. Modell bleibt Haiku (bewusst; kein `thinking`/`effort` für einen einfachen Q&A-Call). Nur sichtbar mit API-Key auf dem iPad — der Rendering-Teil ist per Mock verifizierbar, der echte Key-Test bleibt Sebastian.

## Entscheidungen

1. **`askTutor({ question, topic, apiKey, onText })`** — optionaler `onText`-Callback. Mit `onText` → Streaming-Pfad (`stream: true`, SSE-Loop, `onText` pro Delta, gibt am Ende den vollen Text zurück). Ohne → der **unveränderte** non-streaming Pfad (für `testKey` im Parent Corner und Robustheit der Key-Validierung). Minimal-invasiv, `testKey` bleibt exakt.
2. **SSE-Parser als pure, exportierte Funktion** `drainSSE(buffer) → { events, rest }` + `textDelta(ev)` (aus dem FA-Loop). tutor.js ist schon leaf-artig (kein DOM, fetch nur bei Aufruf) → in den Tests importierbar, Parser testbar mit über Chunk-Grenzen gesplitteten Buffern.
3. **Fehlersemantik erhalten:** fetch wirft → `offline`/`blocked`; `!res.ok` → `http` mit status/detail (beide wie heute). NEU: ein `error`-Event mitten im Stream → `TutorError('http', {status, detail})`; `stop_reason: 'refusal'` → freundlicher Hinweis; leerer Stream → bestehender Fallback-String.
4. **UI-Inkrement (`session.js` `qaBox`):** die Tutor-Bubble sofort (leer) anlegen; `onText` hängt Fragmente an (`textContent +=`, Auto-Scroll) — `textContent` statt `innerHTML`/`escapeHtml`, da der Tutor Plain Text liefert (systemPrompt: „Plain sentences only"). Nach Abschluss den 🔊-`speakerButton` mit dem vollen Text ergänzen + `logQa`. Fehler mitten drin: schon Text da → lassen + kleiner Hinweis; kein Text → `friendlyTutorError`.
5. **check.html unberührt** (eigener non-stream Konnektivitäts-fetch). SW → **v8** (tutor.js + session.js geändert; kein neues Modul).

## Dateien

**Geändert:**
- `app/js/qa/tutor.js` — `askTutor` um `onText` + Streaming-Zweig (roher `res.body.getReader()` + `TextDecoder`, `drainSSE`-Loop, `text_delta`→`onText`, `error`/`refusal`-Behandlung in `TutorError`); exportiert `drainSSE`, `textDelta`. `testKey` unverändert. `anthropic-dangerous-direct-browser-access`-Header bleibt.
- `app/js/ui/session.js` — `qaBox`: streamende Tutor-Bubble statt „Thinking…"→Ersatz.
- `app/sw.js` — `CACHE_VERSION` v7 → **v8**.
- `app/tests/main.js` — SSE-Parser-Tests.
- `README.md` (Q&A-Bullet: Antworten streamen), `MEMORY.md` (Entscheidung).

## Tests (Runner-Stil test/ok/eq; tutor.js als Leaf importiert)

1 `drainSSE`: ein `content_block_delta` → ein Event, `rest` leer. · 2 mehrere Events in einem Buffer → alle geparst. · 3 Event über zwei Chunks gesplittet → erster Aufruf `rest` trägt den Teil, zweiter komplettiert (Kern-Robustheit). · 4 leere `data:`-Zeilen, `[DONE]`, `event: ping`/`message_start` werden übersprungen/ignoriert. · 5 `error`-Event wird als solches erkannt. · 6 `textDelta`: `content_block_delta`/`text_delta` → Text, andere Typen → null. · 7 kaputtes JSON in einer `data:`-Zeile wird übersprungen (kein Throw).

## Build-Reihenfolge (jedes Inkrement tests-grün)

0. Housekeeping: Plan-Kopie `quality_reports/plans/2026-07-24_streaming-tutor.md`, Session-Log.
1. `tutor.js` (`drainSSE`/`textDelta`/Streaming-Zweig) + Tests 1–7. Non-streaming-Pfad + `testKey` byte-identisch.
2. `session.js` `qaBox`-Streaming + Browser-Mock-Verifikation.
3. SW v8 + README/MEMORY.
4. Vollverifikation, dann Commit erst auf Go.

## Verifikation

- Tests grün. · **Browser-Mock** (ohne echten Key): `askTutor` mit gemocktem `fetch`, dessen `body` ein `ReadableStream` mehrerer `content_block_delta`-Chunks ist → `onText` feuert mehrfach, Rückgabe = konkatenierter Text; qaBox zeigt tröpfelnden Text + 🔊 danach; Fehler-Mock → `friendlyTutorError`. · Kein H-Scroll; Konsole leer. · Der echte Key-Durchlauf (Antwort tröpfelt live) bleibt Sebastians iPad-Test.

## Risiken

- iOS-Safari `ReadableStream` auf `fetch`-Bodies: auf aktuellem iPadOS unterstützt; falls je ein Gerät zickt, ist der non-streaming Pfad weiter da (onText weglassen). · Mid-Stream-Fehler selten (haiku, Kinder-Mathe) — abgedeckt.

## Out of Scope

KI-Buddy, Freitags-Challenge; Modellwechsel; check.html.
