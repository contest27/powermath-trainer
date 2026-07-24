# Schatzkarten-Map — Lernlandkarte als Piraten-Abenteuerpfad

**Status:** APPROVED (2026-07-24)
**Datum:** 2026-07-24
**Projekt:** PowerMath Trainer (Builder, iPad-only PWA, no-build vanilla JS)
**Ersetzt:** den abgeschlossenen Watch-PoC-Plan in dieser Datei (committet als `66ee1ee`).

## Context

Sebastian will die Lernlandkarte „ansprechender, wie eine tatsächliche Landkarte, aufregend für Kinder". Entscheidung (AskUserQuestion): **Abenteuer-Pfad** im **Schatzkarten-/Piraten-Stil**. Die bisherige Listen-Ansicht (Strand-Karten mit Zeilen) wird durch eine einzige hohe, handgezeichnete Inline-SVG-Landkarte ersetzt: geschwungene gestrichelte Route mit 32 Stationen in Lehrplanreihenfolge (`topicOrder`), 10 thematische Regionen entlang der Strang-Läufe (place·3, addsub·3, stats·1, multdiv·2, measure·2, multdiv·3, fractions·6, decimals·5, geometry·4, measure·3), „Du bist hier"-Schiff, Nebel über der Zukunft, Schatz am Ende. Keine Bild-Assets, kein CDN — alles gezeichnetes SVG + Emoji, offline-fähig, Kilobytes.

Erhalten bleiben: Screen-Name `map`, H1 „🗺️ My maths map", Eltern-Info (Sterne an Stationen; Mastery-Band wandert in die Ringfarbe der Münzen), die ▶-Watch-Einstiege (als Holzschilder an den Unit-8-Stationen, unverändert `go('watch', {episodeId, from:'map'})`). Engine/State unangetastet.

## Entscheidungen (inkl. Korrekturen aus der Detailprüfung)

1. **Layout:** eine SVG, viewBox 320×2450 (`GEO`: TOP 44, HDR 40 je Region, STEP 58 je Station, FIN 150 Finale). Reise oben (Thema 1) → unten (Schatz). Meander per Tabelle `x = 160 + [-70,-25,+45,+70,+25,-45][i%6]` (x ∈ 90–230, nie mittig). Route als kubischer Pfad mit vertikalen Tangenten an den Stationen; „gegangener" Abschnitt bis zur aktuellen Station als dichterer Overlay-Strich.
2. **Stationen:** erledigt = Goldmünze (r 15, Topic-Emoji, ★-Zeile), Ringfarbe = Mastery-Band via `bandOf` aus `engine/mastery.js` (grün/amber/rot, `band-none` ohne Mastery); aktuell = größere Münze, **⛵ fährt AUF der Münze** (statt darüber — Kollision mit dem Label der Vorgängerstation, Fix F1) + Puls-Ring (max scale 1,35 < STEP/2); gesperrt = mattierte Münze, Emoji 40 %. Labels: shortTitle **font 11** (24 Zeichen passen so gerade in die viewBox, Fix F2; Test erzwingt Extents ∈ [18, 302]), Sterne als zweite Labelzeile (nie unter dem Knoten auf der Route, Fix F3), Seite jeweils gegenüber dem Meander.
3. **Regionen:** 10 Bänder aus `deriveRegions(topics)` (Strang-Wechsel-Scan); je Band Holz-Signpost (STRANDS-Icon + Titel), Land-Blob in Strang-Tönung (Pergament-harmonisiert), 2 Emoji-Props. Basis: Pergament `#f7edd8`, Wasser-Ränder `#bfdbf7` (x ≤ 16 / ≥ 304), Kompass-Emoji oben.
4. **Nebel:** EIN Rect ab `regionTop(currentRegion+1)` bis zum Finale, Pergament-weiß 55 %, `pointer-events="none"` (darunter bleibt alles tippbar — Parität zu heute, wo ▶ auch an gesperrten Zeilen tippbar ist). Schatz bleibt immer sichtbar.
5. **Finale:** rotes X + gezeichnete Truhe + „32/32"-Flagge; bei Komplettierung Truhe `.open` + einmal `confettiBurst` beim Mount.
6. **Interaktion:** Stations-Tap → `toast` (drei Varianten: done mit ★★☆, current „⛵ Next adventure: …", locked „🔒 … — sail here later!"); Watch-Schild (Kreis r 14, zur nahen Kante versetzt, `stopPropagation`) → Watch-Player. **Kein `role="img"` an der Root-SVG** (würde die interaktiven Gruppen für Assistenztechnik plätten, Fix F6) — Root nur `aria-label`; interaktive `<g>` mit `role="button"`, `tabindex="0"`, Enter/Space.
7. **Animations-Muster:** Haus-Pattern `.tmap:not(.run)`-Entry-States; **`.run` + Scroll erst in `setTimeout(0)` nach dem Mount** (der Screen-Baum ist beim Return noch detached, synchroner Reflow wäre ein No-op — Fix F4), mit `svg.isConnected`-Guard; Auto-Scroll `scrollIntoView({block:'center'})` auf aktuelle Station bzw. Finale, instant (nicht smooth). Animationen: ⛵-Bob, Puls, Entry-Pop nur der aktuellen Station; `prefers-reduced-motion` → statischer Halo, keine Loops.
8. **Touch-Ziele** (Skalierung 1,625 px/unit bei 768 breit): Schild Ø 28 u ≈ 45,5 px, Stations-Hit-Kreis Ø 34 u ≈ 55 px, Randabstände geprüft. iPhone-Breite (375 px) fiele auf ~29 px — akzeptiert, Zielgerät ist das iPad (F7).
9. **Watch-Schilder unit-scoped wie bisher** → zwei Schilder in Unit 8 (Parität zur alten Liste, F5); falls das im Sichttest doof aussieht, bewusste Umstellung auf `topicIds`-Scope als Ein-Zeilen-Änderung — nicht stillschweigend.
10. **Modul-Schnitt:** `ui/map-scene.js` ist ein **purer Builder** ohne core/store/go-Imports: `buildTreasureMap({ topics, strands, state, episodeForUnit, onStation, onWatch }) → { svg, currentEl, finaleEl, allDone, doneCount }`; exportiert zusätzlich `deriveRegions` + `GEO` für Tests. `map.js` wird dünner Screen (Header-Karte „Treasure hunt n/32" + progressBar, Mount, Callbacks, Deferred-Block, bottomNav). Gemeinsamer SVG-Helper **`ui/svg.js`** (s()/di(), aus `watch-scenes.js` extrahiert; watch-scenes importiert ihn fortan — die bestehenden Watch-Render-Tests sind das Regressionsnetz).

## Dateien

**Neu:** `app/js/ui/svg.js` (~25 Z.), `app/js/ui/map-scene.js` (~300 Z.).
**Geändert:** `app/js/ui/watch-scenes.js` (Helper-Import statt privater Kopie), `app/js/ui/map.js` (Rewrite ~70 Z.), `app/css/app.css` (alter Map-Block raus — `.dot.*` bleibt, Parent Corner nutzt bandDot weiter; neuer `tmap`-Block ~60 Z. inkl. Keyframes + reduced-motion), `app/sw.js` (**v6** + ASSETS `svg.js`/`map-scene.js`), `app/tests/main.js` (~14 neue Tests), `README.md` (Map-Bullet; „54 tests"-Zeile entbrittlen — ist seit dem Watch-Merge ohnehin stale), `MEMORY.md` (Entscheidung).
**Unangetastet:** engine/* (nur Lese-Import `bandOf`), today.js, components.js, content/*, Watch-Player, CLAUDE.md.

## Tests (Runner-Stil test/ok/eq, detached DOM)

1–2 svg.js (s()-Semantik, di()). 3 „32 Stationen in topicOrder" (`data-topic`-Sequenz). 4 Regionen == Strang-Läufe-Fixture + 10 Signposts in Reihenfolge. 5 done/current/locked-Klassen aus Seed-State (+ `currentEl`). 6 genau eine aktuelle Station; bei 32/32 keine, `allDone`, Truhe `.open`, `finaleEl`. 7 Ringfarben via Scores 50/70/90 → band-red/amber/green (+ band-none). 8 Watch-Schilder exakt an `episodeForUnit`-Treffern (derzeit 2), aria-labels. 9 Schild-Klick feuert `onWatch`, nicht `onStation` (stopPropagation). 10 Stations-Klick liefert (topic, status). 11 Nebel beginnt nach der aktuellen Region, endet vor dem Finale, `pointer-events` none; kein Nebel bei 32/32. 12 Finale mit X, Truhe, „32/32". 13 Geometrie-Wächter: alle cx ∈ [80,240] ∧ ≠160, Hit-r ≥ 17, Schild-r ≥ 14, Label-Extents ∈ [18,302] (5,8 u/Zeichen-Budget — schützt auch künftige lange shortTitles). 14 SW-Konsistenz: ASSETS enthalten beide neuen Module, kein `'pmtrainer-v5'` mehr, Media-Cache-Literal weiter da. Watch-Tests bleiben unverändert grün (svg.js-Extraktion).

## Build-Reihenfolge (jedes Inkrement endet tests-grün)

0. Housekeeping: Plan-Kopie `quality_reports/plans/2026-07-24_treasure-map.md`, Session-Log.
1. `svg.js`-Extraktion + watch-scenes-Umstellung (Tests 1–2; Watch-Tests = Regressionsnetz).
2. `map-scene.js` Kern: GEO/deriveRegions/Pergament/Regionen/Route/Stationen/Labels/⛵+Puls + CSS (Tests 3–7, 13). Altes map.js läuft derweil unverändert.
3. Interaktion + Nebel + Finale (Tests 8–12).
4. `map.js`-Rewrite + CSS-Aufräumen + Browser-Smoke (map → watch → back).
5. SW v6 + Test 14 + README/MEMORY.
6. Vollverifikation (unten), danach Commit erst auf explizites Go.

## Verifikation

Lokal (Dev-Server, 768×1024): Tests 0 failed (~70 alt + ~14 neu) · Frisch-State: Station 1 aktuell mit ⛵+Puls, Nebel ab Region 2, Auto-Scroll oben, kein H-Scroll · Seed ~10 erledigt mit gemischten Scores: Münzen/Sterne/Ringfarben korrekt, „gegangene" Route endet am Schiff, Auto-Scroll zentriert auch nach Watch→Back · Label-Kollisions-Sweep über alle 6 Meander-Positionen (Worst Case „Place value to 1,000,000", x=135) · Tap-Pass: 3 Toast-Varianten, beide ▶-Schilder öffnen die Episode, Schild-Durchmesser ≥ 44 px, auch im Nebel tippbar · reduced-motion emuliert: keine Loops, statischer Halo · All-done-Seed: kein Schiff, kein Nebel, Truhe offen, genau ein Konfetti · Parent Corner unverändert (`.dot`).
Post-Deploy (iPad): Update-Ritual (zwei echte Starts) — diesmal sichtbar anders · **Media-Cache-Probe:** Flugmodus → Watch-Episode muss ohne Re-Download spielen (beweist, dass `pmtrainer-media-v1` den v5→v6-Bump überlebt; Ergebnis in MEMORY.md nachtragen).

## Risiken

Visueller Geschmack (Pergament-Töne, Blob-Formen) ist iterativ — Sichttest im Browser-Pane vor dem Commit, ggf. eine Korrekturrunde. Label-Kollisionen sind durch Test 13 + Sweep abgedeckt. Scroll-Höhe ~4.000 px ist gewollt (Reisegefühl), Auto-Scroll verhindert Orientierungsverlust.

## Out of Scope

Klingende Effekte, Avatar-Auswahl, Belohnungs-Shop; Insel-Archipel-Variante; iPhone-Optimierung; weitere Watch-Episoden; Version-Anzeige im Parent Corner (separat angeboten, unbeantwortet).
