# Watch-Episoden PoC — animierte, vertonte Erklärfilme in der App (Unit 8: Equivalent fractions)

**Status:** APPROVED (2026-07-23)
**Datum:** 2026-07-23
**Projekt:** PowerMath Trainer (Builder, iPad-only PWA, no-build vanilla JS)

## Context

Sebastian will die besten Facharzttrainer-Features übernehmen; Audio-Podcasts hält er für seinen Sohn für wirkungslos — es sollen animierte Video-artige Erklärungen sein ("animierter Kram, nicht unbedingt mit Menschen"). Entscheidung (AskUserQuestion): **In-App-Animation** statt Manim-MP4s — ein Szenenplayer, der vorproduzierte Erzähl-Schnipsel (edge-tts, zwei en-GB-Stimmen) mit animierten SVG-Szenen im Look der bestehenden `vis.js`-Modelle synchronisiert. Fühlt sich wie ein Video an (Auto-Advance, Play/Pause), ist aber KB-klein, offline-fähig und interaktionsfähig. PoC: **eine Episode** zu „Equivalent fractions" (Unit 8, Buch 5B); sein Sohn ist die Abnahme-Instanz.

Nicht verhandelbar (CLAUDE.md): kein npm/Bundler, `CACHE_VERSION`-Bump je Deploy, neue Dateien in `ASSETS`, Tests grün, Engine (`scheduler.js`/`mastery.js`) unangetastet — Watch ist reine Anreicherung ohne Mastery-Kopplung. Kein API-Key nötig (edge-tts ist gratis und keyless; lief auf dieser Maschine bereits im Facharzttrainer).

## Architektur-Entscheidungen

1. **Audio:** Alle Schnipsel beim Player-Start als Blobs vorladen (Ladebalken), Wiedergabe über **ein** wiederverwendetes `<audio>`-Element per `URL.createObjectURL` + src-Swap; erster `.play()` im Tap-Handler (iOS-Gesten-Freischaltung), Folgeschritte aus dem `ended`-Event. Kein Range/206/Streaming-Problem, da nur plain `fetch()`. Jeder `play()`-Aufruf behandelt Promise-Rejection (Fallback: Pause-UI statt stiller Hänger); `error`-Event ⇒ „Tap ▶ to continue", nie Auto-Skip. **Contingency:** Blobs werden behalten — falls iPad-Test Verkettungsprobleme zeigt, wird nur das Innere von `watch-audio.js` auf Web Audio (`decodeAudioData`) umgestellt.
2. **Media-Cache getrennt vom App-Cache:** MP3s landen in `pmtrainer-media-v1`, das im SW-`activate` **whitelisted** ist (überlebt `CACHE_VERSION`-Bumps — sonst wäre Offline-Audio nach jedem Deploy weg). Episode-JSON (klein) kommt in `ASSETS`/Precache; MP3s bewusst nicht (Runtime-Cache beim ersten Anschauen: SW-Route für `.mp3` + expliziter page-side `cache.put` als Belt-and-Braces, mit `'caches' in window`-Guard für localhost).
3. **Szenen-Schicht separat von `vis.js`:** `vis.js` liefert SVG-Strings ohne Klassen/IDs (65 Aufrufstellen — kein Retrofit-Risiko eingehen). Neues Modul baut echte DOM-SVGs per `createElementNS` (der `h()`-Helper kann kein SVG) mit Klassen-Hooks, gleiche Palette/Geometrie wie `vis.js` (Parität testgesichert). Animationen: CSS-Transitions/Klassen, Entry-States per Reflow-Trick (`void el.offsetWidth`, nicht rAF — Erkenntnis aus dem Facharzttrainer). `prefers-reduced-motion` deaktiviert Transitions. Einheitliche `viewBox 0 0 320 240` (keine Layoutsprünge).
4. **Fünf Szenen-Primitive, harte Kappung (PoC):** `titleCard`, `fracBars` (1–2 Balken; appear/shade/split/highlight, `splitFrom` animiert neue Teilungslinien), `fracNotation` (Bruchsymbole, `=`/`→`-Joiner, ×k/÷k-Pfeile, „□" erlaubt), `numberLine` (Marken, Pointer-Hop), `compare` (zwei Balken + Verdict-Symbol, „?"→„=" Reveal).
5. **State:** neues Top-Level-Feld `watched: {}` in `defaultState()` (Shallow-Merge-Migration füllt es bei Bestandsnutzern automatisch; verschachtelte Felder täten das nicht). Kein Scheduler-Bezug. Export/Import erfasst es automatisch.
6. **Navigation:** `go('watch', { episodeId, from })` — die vorhandene, bisher ungenutzte Params-Leitung. Speichern nur bei Exit/Abschluss (kein localStorage-Write pro Schritt).

## Episode-JSON (SoT, `app/data/watch/u08-fractions.json`)

```jsonc
{ "id": "u08-fractions", "title": "Equivalent fractions", "unit": 8,
  "unitLabel": "Unit 8 · Fractions", "topicIds": ["u08-equivalent"], "version": 1,
  "rate": "-5%",
  "voices":   { "teacher": "en-GB-SoniaNeural", "kid": "en-GB-MaisieNeural" },
  "speakers": { "teacher": "Miss Sonia", "kid": "Maisie" },
  "steps": [ { "id": "s01", "speaker": "teacher",
               "text": "…Klartext, Brüche in Worten…",   // Caption + TTS-Input, kein HTML
               "audio": "u08-fractions/s01.mp3",
               "durationSec": 0, "srcHash": "",           // von narrate.py gepflegt
               "scene": { "type": "titleCard", "title": "…" } } ] }
```

Validierung (`validateEpisode`, gespiegelt in `narrate.py --check`): ids eindeutig, `speaker` in beiden Maps, `text`/`audio` nicht leer, Szene valide (Typ bekannt, Pflichtfelder, `n ≤ d`, `max > min`, `bars` 1–2, `anim` im erlaubten Set); Tool prüft zusätzlich Dateiexistenz + `durationSec > 0`. `durationSec` per CBR-Schätzung (Dateigröße × 8 / Bitrate) — kein mutagen, edge-tts bleibt die einzige neue pip-Abhängigkeit.

## Dateien

**Neu:**
| Datei | Verantwortung |
|---|---|
| `app/js/engine/watch.js` | Pur: Sequencer (`seqInit/Play/Pause/Next/Prev/Restart`; idle→playing→ended, Prev aus ended → letzter Schritt paused), `SCENE_TYPES`, `validateScene`, `validateEpisode`, `markWatched(state, epId, lastStep, nowIso)`, `noteStep` |
| `app/js/content/watch-index.js` | Registry `EPISODES` (id, unit, title, topicIds, file, minutes), `DATA_BASE`, `episodeForUnit(unit)`, `episodeById(id)` |
| `app/js/ui/watch-scenes.js` | `renderScene(spec) → SVGSVGElement`, `mountScene(stage, spec, prevSpec)` (Crossfade + Reflow-Entry), `colorFor`; eigener `s()`-NS-Helper, standalone |
| `app/js/ui/watch-audio.js` | `prefetchEpisode(ep, base, {onProgress})` (fetch→Blob→objectURL + `cache.put` nach `pmtrainer-media-v1`), `createPlayer()` (ein `<audio>`, load/play/pause/onEnded/onError/dispose) |
| `app/js/ui/watch.js` | Screen `'watch'`: Laden → Tap-to-start-Overlay → Caption (Sprechername + Text), Controls (Play/Pause, ‹ ›, Restart, ✕), Step-Dots, Endscreen (Praise + `confettiBurst` + Watch again/Done); Cleanup bei Exit (dispose, revoke, `noteStep`+save, `go(from)`) |
| `app/data/watch/u08-fractions.json` + `app/data/watch/u08-fractions/s01…s18.mp3` | Episode (~18 Steps, ~3 min, ~1,1 MB; MP3s committet, nicht precached) |
| `tools/narrate.py` | edge-tts-Renderer: rendert nur Steps mit geändertem `srcHash`/fehlender Datei (Retry 8×, Backoff 1,2 s·(i+1) — aus FA `tts_episode.py` übernommen), schreibt `durationSec`/`srcHash` zurück; `--check` (offline), `--force` |

**Geändert:** `storage.js` (`watched: {}`), `app.js` (Import), `today.js` (Watch-Button **nur im `plan.kind === 'daily'`-Zweig**, wenn Episode zur Unit existiert und nicht abgeschlossen), `map.js` (▶-Button 44 px an Zeilen von Themen mit Unit-Episode, immer sichtbar = Rewatch-Pfad), `app.css` (Watch-Sektion ~80 Zeilen inkl. `env(safe-area-inset-top)`), `sw.js` (s. u.), `tests/main.js`, `README.md`, `CLAUDE.md`, `MEMORY.md`.

## Service Worker (`app/sw.js`)

1. `CACHE_VERSION = 'pmtrainer-v5'`; neu `const MEDIA_CACHE = 'pmtrainer-media-v1'`.
2. `ASSETS` += die 5 neuen JS-Module + Episode-JSON (keine MP3s).
3. `activate`: löschen nur wenn `k !== CACHE_VERSION && k !== MEDIA_CACHE`.
4. Runtime-Branch bekommt FA-Guard + Media-Routing: `isRange = req.headers.has('range') || res.status === 206`; cachen nur bei `res.ok && !res.redirected && !isRange`; Ziel-Cache: `.mp3` → `MEDIA_CACHE`, sonst `CACHE_VERSION`. `caches.match` durchsucht ohnehin alle Caches.

## Build-Reihenfolge (5 Inkremente, jedes endet tests-grün)

1. **Purer Kern + State:** `engine/watch.js`, `watched:{}`, `watch-index.js` + Tests T1–T8 (Inline-Fixtures).
2. **Szenen-Schicht:** `watch-scenes.js` + CSS + Tests T9–T11.
3. **Episode + Tooling:** Skript (18 Steps, Storyboard: 1/2-Balken → split → 2/4 „same amount" → Begriff *equivalent* → numerator/denominator → ×2/×2-Pfeile → simplify ÷6 → Zahlenstrahl (1/2 und 2/4 am selben Punkt) → missing number 3/5=□/20 → compare 3/4 vs 9/12 → Recap; Dialog teacher/kid, Power-Maths-Vokabular, gegründet auf `c5b.js` u08-equivalent), `narrate.py`, MP3s rendern (Netz nötig ⇒ Vordergrund + `dangerouslyDisableSandbox`), `--check` grün; Tests T5b/T8b/T9b gegen die echte JSON.
4. **Audio + Player-Screen:** `watch-audio.js`, `watch.js`, Import in `app.js`, CSS; manueller Einstieg vor den Entry-Points per Konsole: `import('./js/ui/core.js').then(m => m.go('watch', { episodeId: 'u08-fractions' }))`.
5. **Entry-Points + SW + Doku:** `today.js`, `map.js`, `sw.js` (v5), Tests T12–T13, README/CLAUDE.md/MEMORY.md; volle Verifikation.

## Tests (~13 neu, Stil `test(name, fn)`/`ok`/`eq`; Episode-JSON + sw.js-Text im Setup gefetcht)

T1 `watched` in defaultState + Shallow-Merge-Migration für Altbestände · T2 Sequencer advance/ended (idx nie > count−1) · T3 Prev-Clamping + Prev aus ended → `{idx: count−1, paused}` · T4 Restart/Pause-Toggle · T5/T5b validateEpisode akzeptiert Fixture + echte JSON · T6 lehnt kaputte Varianten ab (Dupe-id, unbekannter Speaker, leerer Text, fehlendes Audio, unbekannter Szenentyp — Fehlermeldung enthält Step-id) · T7 validateScene je Typ (bars 0/3, n>d, max≤min, compare ohne right, titleCard ohne title, falsches anim) · T8/T8b Registry ↔ topicById ↔ JSON konsistent · T9/T9b renderScene baut alle 5 Typen + jeden echten Step (SVG-NS, viewBox, Zellzahl = d, shaded = n) · T10 split rendert genau d−splitFrom neue Divider · T11 `colorFor`-Palette == vis.js-Hexwerte · T12 sw.js enthält alle neuen ASSETS-Pfade + `pmtrainer-media-v1` (identisches Literal auch in watch-audio.js — Anti-Drift) und nicht mehr `pmtrainer-v4` · T13 markWatched/noteStep-Semantik.

## Verifikation (Projekt-Bar: Tests grün + manueller Pass 768×1024 + Commit)

1. tests.html: 0 failed (54 alt + ~13 neu). 2. `narrate.py --check` exit 0; Gesamtdauer 2,5–3,5 min. 3. Dev-Server: Map-▶ an Unit-8-Zeilen → Ladebalken → „Tap to start" → Audio erst nach Tap. 4. Auto-Advance durch alle 18 Steps freihändig; Caption/Sprecher wechseln; Animationen laufen (shade-Stagger, Split-Divider, Pfeile, Hop, Reveal); Dots tracken. 5. Controls inkl. ✕ mitten drin → Audio stoppt sofort, landet auf Herkunftsscreen (`from`). 6. Endscreen: Konfetti; Done → `watched['u08-fractions'].completedAt` gesetzt; Today-Button für Unit 8 verschwindet. 7. Today-Entry per Konsolen-Seed (completed bis vor `u08-equivalent`, diagnosticDone, reload) sichtbar. 8. Backup-Export enthält `watched`; Alt-Backup ohne `watched` importiert fehlerfrei. 9. **Offline (deployte Pages-URL, SW aktiv — localhost überspringt den SW):** einmal online ansehen → offline → Rewatch läuft komplett; danach Trivial-Deploy (v6) → Offline-Rewatch funktioniert **weiterhin** (Media-Cache überlebt). 10. iPad-Realtest (Sebastian + Sohn): erster Tap entsperrt Audio, Verkettung läuft durch; falls nicht → Web-Audio-Contingency in `watch-audio.js`.

## Risiken

- **iOS-Audio-Verkettung** (Hauptrisiko): mitigiert (ein Element, Blob-src, Tap-Start, Rejection-Handling); Contingency isoliert in `watch-audio.js`.
- **edge-tts-Stimmqualität** (Sonia/Maisie): Sebastian hört den PoC ab; Fallback Gemini-TTS (Centbeträge) nur als Render-Schritt-Tausch, Datenformat bleibt.
- **Scope-Creep Szenen-DSL:** harte Kappung bei 5 Primitiven; Erweiterung erst mit Episode 2.

## Out of Scope (dieser PoC)

Weitere Episoden; Manim/MP4; Bottom-Nav-Tab; Media-Session; Tempo-Regler; die übrigen Übernahme-Vorschläge (Streaming-Tutor, KI-Buddy, „Thema üben") — separate Pläne.

## Housekeeping nach Freigabe

Plan nach `quality_reports/plans/2026-07-23_watch-episodes-poc.md` kopieren (Status APPROVED); Session-Log `quality_reports/session_logs/2026-07-23_watch-poc.md` anlegen; MEMORY.md-Entscheidungseinträge (edge-tts als erste pip-Tool-Abhängigkeit; Media-Cache-Strategie); am Ende `/commit` erst auf explizite Aufforderung.
