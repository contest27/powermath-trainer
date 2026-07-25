# Thema von der Schatzkarte üben — direkter Übungs-Einstieg pro Station

**Status:** APPROVED (2026-07-24)
**Datum:** 2026-07-24
**Projekt:** PowerMath Trainer (Builder, iPad-only PWA, no-build vanilla JS)

## Context

Sebastian: „auch für die noch nicht geübten themen wäre es cool wenn man direkt auf der karte ins nächste thema klicken kann und gleich mit dem übungsblock startet." Heute führt ein Stations-Tap nur zu einem Toast; der einzige Weg in eine Session ist der Today-Screen. Nächster Facharzttrainer-Übernahme-Kandidat („Thema üben"), aber von der frischen Schatzkarte aus statt aus einer Liste.

Zwei Entscheidungen mit Sebastian geklärt (AskUserQuestion):
- **Umfang:** nur **erledigte** und das **aktuelle nächste** Thema starten eine Übung. Ferne Themen im Nebel bleiben gesperrt (Toast wie bisher). Hält die Reise sequenziell — kein grünes Thema mitten im Nebel, keine Löcher in der Lehrplan-Reihenfolge.
- **Neues (aktuelles) Thema:** startet mit **Erklärung zuerst, dann Übung** — genau wie die Tageslektion. Erledigte Themen überspringen die Erklärung → direkt Übungsblock.

## Kernproblem und Lösung

`store.state.activeSession` hält die **Tageslektion** (am selben Tag von Today resumebar). Eine karten-gestartete Übung darf eine halbfertige Tageslektion **nicht zerstören**. Lösung: separater Top-Level-Slot **`focusSession`**, den der `session`-Screen mit Vorrang rendert (`sess() = focusSession ?? activeSession`). Die Tageslektion bleibt unberührt und läuft parallel weiter. Beim Boot wird ein persistierter `focusSession` **einmal geleert** (`app.js`) — Fokus-Übung ist Bonus, der nicht über Reloads resumt; damit kann der Slot die Tageslektion nie überschatten (der Session-Screen hat keine bottomNav, das Kind erreicht Today nie mit lebendem focusSession).

`focusSession: null` ist ein neues **Top-Level**-Feld in `defaultState()` → `load()`'s Shallow-Merge migriert Bestandsnutzer automatisch (wie `watched`).

## Architektur: pure Logik ins Leaf-Modul

Konsistent mit dem etablierten Muster (pure Builder `map-scene.js`/`watch-scenes.js` getrennt von den Screens): die testbare Logik kommt in ein neues **`js/ui/focus.js`** (importiert nur engine + content, kein DOM/go/store), genutzt von `session.js`, `map.js` und den Tests. So bleiben die Tests am bewährten Leaf-Import-Muster und ziehen keinen Screen-Baum herein.

`js/ui/focus.js` (pur):
- `FOCUS_REVIEW_ITEMS = 8`
- `buildFocusSession(state, topicId, mode, today, rng)` → Session-Objekt. Spiegelt `buildSession` (dedupe-Closure über `topic.gen`), aber **ein Thema, kein Review-Block**:
  - `mode 'new'`: 11 Items `NEW_TOPIC_TIERS`, alle `part:'practice'`; `kind:'focus-new'`, `newTopic:topicId`, `phase:'explain'`.
  - `mode 'review'`: 8 Items `reviewTier(score, rng)`, `part:'review'`; `kind:'focus-review'`, `newTopic:null`, `focusTopic:topicId`, `phase:'items'`.
  - beide: `focus:true`, `origin:'map'`, plus `idx/results/diag/startedAt/segIdx` wie gehabt.
- `applySessionEnd(state, s, today)` — herausgelöster Effektblock aus `endItems` (session.js:327-357), damit testbar. `completeTopic` feuert weiterhin nur bei `s.newTopic && practice.length` (focus-new **und** daily), `rescheduleReviewed` für den Review-Satz (focus-review **und** daily). Neuer Abschluss-Branch:
  - `focus-review`: nur `history.push` (kein Streak, `activeSession` unberührt) + `state.focusSession = s`.
  - `focus-new`: `finishSession(...)` (Streak + History + nullt `activeSession` = löscht die jetzt veraltete gleich-Thema-Tageslektion) + `state.focusSession = s`.
  - `daily`/`diagnostic`: unverändert (`finishSession` + `state.activeSession = s` für die Summary).
- `stationAction(state, topic, status)` → `{kind:'toast', msg}` oder `{kind:'sheet', mode}`. Routing: `!diagnosticDone` → Toast (Diagnostik zuerst — sie seedet alle Mastery-Prioren); `locked` → Toast; `current` → sheet/`new`; `done` → sheet/`review`.

## Dateien

**Neu:** `app/js/ui/focus.js` (pure Logik, s. o.).
**Geändert:**
- `app/js/engine/storage.js` — `focusSession: null` in `defaultState()`.
- `app/js/app.js` — Boot-Clear von persistiertem `focusSession` vor `go('today')`.
- `app/js/ui/session.js` — `import` aus focus.js; `startFocusSession(topicId, mode)` (setzt `focusSession`, `go('session')`); `sess() = focusSession ?? activeSession`; `endItems` ruft `applySessionEnd`; Back-Pfeil + Summary-Finish origin-aware (`go(s.origin ?? 'today')`, bei `s.focus` vorher `focusSession=null`).
- `app/js/ui/map.js` — `import { stationAction } from './focus.js'`, `{ startFocusSession } from './session.js'`; `stationSheet(topic, status)` (Bottom-Sheet, inline wie die Watch-Chrome); `onStation` nutzt `stationAction` → Toast oder Sheet.
- `app/css/app.css` — `.sheet-scrim` / `.station-sheet` (bestehende Tokens `--card`/`--radius`/`--brand-dark`/`--amber`; Fixed-Bottom wie `.stickybar`, `z-index:60` über der bottomNav, safe-area, slide-up).
- `app/sw.js` — `CACHE_VERSION` v6 → **v7**; `focus.js` in ASSETS.
- `app/tests/main.js`, `README.md`, `CLAUDE.md`, `MEMORY.md`.
**Unangetastet:** `engine/` (nur konsumiert), `map-scene.js` (rendert `done/current/locked` schon als Buttons, Fog ist `pointer-events:none`), `today.js` (liest nur `activeSession`), `parent.js` (verifiziert: schaltet nur auf `kind==='diagnostic'`, zeigt sonst den Themen-Titel über `s.topicId` — die neuen kinds tragen `topicId=newTopic ?? focusTopic`, also passt es ohne Änderung).

## Interaktion: Bestätigungs-Sheet (nicht Sofortstart)

4000-px-Karte + ~55-px-Stationen → Fehltaps beim Scrollen sind real, und das aktuelle Thema löst eine *abschließende* Aktion aus. Darum ein leichtes Bottom-Sheet (an `document.body`, wie `toast`): Themenname (+ Sterne bei erledigt), primär „▶ Start" (current) bzw. „▶ Practise" (done) → `startFocusSession`, sekundär „Not now"; Tap-außerhalb/Escape schließt. Gesperrte Stationen behalten den einfachen Toast.

## Semantik (bewusste Entscheidungen — im Review widersprechbar)

- **Sterne/Reschedule bei Wiederholung (focus-review):** `recordAttempt` bewegt die Mastery normal, `rescheduleReviewed` setzt ein frisches Leitner-Datum; `completeTopic` wird **nicht** gerufen → `completed`/Sterne bleiben (Hochwasserstand). Station bleibt Gold, nur die Ringfarbe kann wandern.
- **Streak/„heute erledigt":** **focus-new zählt** (es *ist* die echte Lektion, spiegelt die Tageslektion), **focus-review nicht** (Bonus). 
- **Tempo unbegrenzt:** wer das aktuelle Thema abschließt, rückt die Reise vor; zurück auf der Karte ist das nächste Thema wieder `current` und antippbar → mehrere neue Themen/Tag möglich. Bewusst akzeptiert (Sommer-Übung, mehr ist gut). Falls Sebastian ein Thema/Tag will: `current`→sheet nur sperren, wenn heute schon ein focus-new/daily in `history` steht.

## Tests (Runner-Stil test/ok/eq; `focus.js` als Leaf importiert)

1 focus-new: 11 practice-Items, `phase:'explain'`, kein review, `origin:'map'`. · 2 focus-review: 8 Items `part:'review'`, `phase:'items'`, `newTopic:null`, Tiers ∈ 1..3. · 3 focus-new-Abschluss (alle ok): Thema in `completed`, `nextNewTopic` rückt vor, Sterne ≥1, `focusSession===s`. · 4 focus-review-Abschluss: `completed` unverändert, `mastery.due` neu, `summary.stars===null`. · 5 halbfertige Tageslektion überlebt einen focus-review-Lauf (`activeSession` identisch). · 6 focus-new-Abschluss des aktuellen Themas nullt die veraltete gleich-Thema-Tageslektion. · 7 `stationAction`: done→review, current→new, locked→toast. · 8 `stationAction` vor Diagnostik → alles Toast. · 9 Rückkehrziel: focus `origin==='map'`, daily-Fallback `'today'`. · 10 SW v7, kein `'pmtrainer-v6'`, `focus.js` in ASSETS. · 11 `defaultState().focusSession===null` + Shallow-Merge-Migration (wie `watched`).

## Build-Reihenfolge (jedes Inkrement tests-grün)

1. State + Boot-Clear (`storage.js`, `app.js`) + Test 11.
2. `focus.js` + `session.js`-Verdrahtung (Slot, `applySessionEnd`-Refactor, `startFocusSession`, origin-Rückkehr) + Tests 1–6, 9. Daily-Pfad byte-identisch, noch kein Karten-Einstieg.
3. `map.js` (`stationAction`-Wiring, `stationSheet`) + CSS + Tests 7–8. Erster End-to-End-Tap.
4. SW v7 + Test 10 + README/CLAUDE/MEMORY.
5. Vollverifikation, dann Commit erst auf Go.

## Verifikation (Dev-Server 768×1024)

Tap **current** → Sheet → Start → Erklärung → „Let's practise" → 11er-Ramp → Summary → **Finish zurück auf die Karte**, Station jetzt Gold + Sterne, nächstes Thema ist `current`. · Tap **erledigt** → Sheet → Practise → 8 Items **ohne Erklärung** → zurück auf Karte, weiter Gold, Mastery bewegt, `completed`/Sterne unverändert. · **Tageslektion-Resume:** Today-Lektion anfangen, ein paar Items, zur Karte, erledigtes Thema üben, zurück zu Today → „Continue" resumt dieselbe Lektion. · **locked** → unveränderter Toast. · Back mitten in Fokus → Karte, danach Today-„Start" startet die Tageslektion (Slot geleert). · Reload mitten in Fokus → landet auf Today, Tageslektion intakt, kein Geister-Fokus. · Kein H-Scroll; Sheet max-width 560, über der bottomNav, Tap-away/Not-now/Escape schließen. · Tests grün.

## Housekeeping

Plan-Kopie `quality_reports/plans/2026-07-24_map-practice.md` (APPROVED); Session-Log `2026-07-24_map-practice.md`; MEMORY.md-Entscheidung (focusSession-Slot, Umfang, Streak-Semantik, Tempo-Entscheid — ersetzt den „toast is the station popover"-Hinweis). PROJECT_MAP Recent nachziehen.

## Out of Scope

Freies Anspringen ferner Themen; Tempo-Deckel; Streaming-Tutor, KI-Buddy, Freitags-Challenge (separate Pläne).
