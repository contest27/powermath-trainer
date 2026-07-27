# Geführte Erklärung — erst verstehen, dann üben (mit deutscher Übersetzung auf Abruf)

**Status:** APPROVED (2026-07-25)
**Datum:** 2026-07-25
**Projekt:** PowerMath Trainer (Builder, iPad-only PWA, no-build vanilla JS)

## Context

Sebastian: „ich möchte, dass immer erst die erklärung angeschaut werden muss" — und, weil sein Sohn **noch nicht gut Englisch spricht**, eine Rückfrage vom Tutor: *„Hast du das verstanden oder soll ich dir etwas übersetzen?"*

Heute zeigt der Erklärungs-Screen alle Abschnitte auf einmal und darunter sofort „Let's practise! →" — das Kind kann mit einem Tap durchspringen, ohne die Erklärung anzusehen. Und wenn es einen englischen Satz nicht versteht, gibt es nur „✨ Say it differently" (auch Englisch, nur einfacher).

Entscheidungen mit Sebastian geklärt (AskUserQuestion):
- **Sprache: Deutsch.** Mathe-Fachbegriffe zusätzlich englisch dazu (`Zähler (numerator)`), damit er die Schulsprache mitlernt.
- **Mechanik: KI + Offline-Rückfall.** Mit API-Key übersetzt der Tutor auf Abruf; ohne Key/offline greift die **bereits vorhandene** `alt`-Fassung jedes Segments (einfacheres Englisch). Kein vorübersetzter Inhalt in diesem Feature.
- **Zwang: schrittweise, nur neue Themen.** Erklärung Abschnitt für Abschnitt; Übung schaltet erst nach dem letzten Schritt + beantworteter Rückfrage frei. Gilt für Tageslektion + Karten-Start eines neuen Themas (`focus-new`). **Wiederholungen bleiben unangetastet** (`focus-review`/Review-Items haben ohnehin keine Erklärungsphase) — schnelles Auffrischen von der Karte bleibt schnell.

## Reihenfolge (wichtig)

**Erst den fertigen KI-Buddy committen**, dann dieses Feature bauen. Der Buddy ist gebaut und verifiziert (114 Tests grün, sw v9), liegt aber uncommittet im Arbeitsbereich — und dieses Feature fasst dieselben Dateien an (`session.js`, `tutor.js`, `sw.js`). Ohne Trennung landen zwei unabhängige Features in einem Commit.

## Architektur

1. **Totes Feld wiederbeleben:** `s.segIdx` wird von beiden Session-Buildern geschrieben, aber **nirgends gelesen** (per grep verifiziert). Es wird jetzt die Schrittposition — und persistiert automatisch, weil das ganze Session-Objekt in localStorage serialisiert wird. Ein zur Halbzeit geschlossener Tab setzt am richtigen Abschnitt fort.
2. **Schrittmodell (neues pures Leaf `js/ui/lesson.js`):** Schritte = Segmente (4–6) + Rechenbeispiel + **Rückfrage** als eigener Schlussschritt. Pur und damit unit-testbar (Muster wie `ui/focus.js`/`ui/map-scene.js`):
   `lessonSteps(topic) → [{kind:'segment',i}, …, {kind:'example'}, {kind:'checkin'}]`, `stepCount`, `advanceStep(s, topic)`, `backStep(s)`, `canPractise(s)`.
3. **Das Tor:** `canPractise(s) === s.checkedIn === true`. Die Rückfrage ist der letzte Schritt, also muss das Kind durch alle Abschnitte, um sie zu erreichen; beide Antwortknöpfe schalten frei (Übersetzen sperrt nie aus — Sackgassen sind bei einem Zehnjährigen tödlich). Kein Mindest-Verweilzeit-Zwang: das Durchsteppen *ist* das Tor, alles andere frustriert nur.
4. **Deutsch-Knopf an JEDEM Schritt**, nicht nur am Ende — er stolpert womöglich schon über Abschnitt 1, nicht erst zum Schluss. Am Ende zusätzlich die explizite Rückfrage, die Sebastian wollte.
5. **Übersetzung:** neue pure `translateSystemPrompt()` in `qa/tutor.js`; Aufruf über das vorhandene `askTutor({ question, apiKey, onText, system })` (Streaming-Zweig ist schon da). Anweisung: einfaches Deutsch für ein 10-jähriges Kind, englischer Fachbegriff in Klammern dahinter, unter ~80 Wörter, Klartext, **nur übersetzen/erklären — keine neue Mathematik, keine Lösung vorwegnehmen**. Gestreamt in eine Bubble (schlanke eigene Bubble, kein `createChat` — es gibt keine Eingabezeile).
6. **Kein Sackgassen-Rückfall:** ohne Key / offline / Fehler → Segment-`alt` („Here it is in easier words"), ehrlich beschriftet. Für den Beispiel-Schritt (hat kein `alt`) → freundlicher Hinweis, Eltern zu fragen.
7. **Sprachausgabe (echter Fund):** `tts.speak()` wählt die Stimme über `chooseVoice()`, das **immer auf Englisch zurückfällt** (`englishVoices()`), und setzt `u.lang` aus der Stimme. Deutscher Text mit englischer Stimme klingt grauenhaft. Fix: `tts.js` bekommt `germanVoice()` (erste `de-*`-Stimme oder `null`) und `speak(text, { …, lang })`; bei `lang:'de'` wird die deutsche Stimme genommen und `u.lang='de-DE'` gesetzt. **Der 🔊-Knopf am deutschen Text erscheint nur, wenn eine deutsche Stimme existiert** (iPadOS bringt welche mit; sauberer Verzicht, wenn nicht).
8. **Eltern-Einblick:** Übersetzungen werden in `qaLog` mit `source:'translate'` protokolliert → Sebastian sieht im Parent Corner, *was* sein Sohn nicht verstanden hat (wertvoll zur Inhaltssteuerung). `parent.js` bekommt den 🇩🇪-Zweig in der bestehenden Emoji-Auswahl.

## Dateien

**Neu:** `app/js/ui/lesson.js` (pures Schritt-/Tor-Modell).
**Geändert:** `ui/session.js` (`explainView` von „alles auf einmal" auf Stepper umgebaut; `segmentEl` bekommt den 🇩🇪-Knopf; Rückfrage-Schritt), `qa/tutor.js` (`translateSystemPrompt`), `tts.js` (`germanVoice`, `lang`-Option), `ui/parent.js` (🇩🇪-Zweig im qaLog), `css/app.css` (Stepper: Fortschrittspunkte, Weiter/Zurück, Rückfrage-Karte, deutsche Bubble), `sw.js` (**v10** + `lesson.js` in ASSETS), `tests/main.js`, README/MEMORY.
**Unangetastet:** `engine/*` (keine Engine-Änderung), `ui/focus.js` (Review-Pfad), `ui/buddy.js` (bleibt in der Erklärungsphase versteckt — Invariante bleibt, wir verlassen `phase:'explain'` nicht), `ui/map.js`.

## Robustheit / Migration

Bereits laufende Sessions tragen `segIdx:0` und kein `checkedIn`. In `phase:'explain'` starten sie schlicht am ersten Abschnitt (kein Schaden); in `phase:'items'` wird `explainView` gar nicht gerendert — **keine Deadlock-Gefahr**. `checkedIn` fehlt = `false` = Tor zu, aber erreichbar, weil der Weg durch die Schritte offen ist.

## Tests (~10, Stil test/ok/eq, `lesson.js` als Leaf importiert)

1 `lessonSteps` = Segmente + Beispiel + Rückfrage, Reihenfolge stimmt, für alle 32 Themen ≥5 Schritte. · 2 `advanceStep` klemmt am letzten Schritt, `backStep` bei 0. · 3 Tor-Wahrheitstabelle: frisch → gesperrt; letzter Schritt ohne Antwort → gesperrt; nach „verstanden" → offen; nach „übersetzen" → **ebenfalls offen** (keine Sackgasse). · 4 Fortsetzen: `segIdx` aus persistierter Session wird respektiert. · 5 Alt-Session ohne `checkedIn` in `phase:'items'` läuft normal weiter (keine Blockade). · 6 `translateSystemPrompt`: verlangt Deutsch, verlangt englische Fachbegriffe in Klammern, verbietet Lösungsvorwegnahme, keine `undefined`-Reste. · 7 `buildRequestBody` mit Übersetzungs-`system` gewinnt über den Themen-Prompt. · 8 `tts.germanVoice()` gibt `null` oder eine `de-*`-Stimme zurück (kein Werfen ohne Stimmen). · 9 qaLog-Eintrag mit `source:'translate'` wird geschrieben und vom Parent-Renderer verkraftet. · 10 SW v10 + `lesson.js` in ASSETS, kein `v9` mehr.
Browser-verifiziert statt Unit: Streaming der Übersetzung (gemockter Stream wie beim Streaming-Tutor), TTS, Stepper-Optik.

## Build-Reihenfolge (jedes Inkrement tests-grün)

0. **Buddy committen** (fertig verifiziert) — saubere Trennung.
1. Housekeeping: Plan-Kopie `quality_reports/plans/2026-07-25_guided-explanation.md`, Session-Log.
2. **Pures Schrittmodell** `ui/lesson.js` + `translateSystemPrompt` + `tts.germanVoice`/`lang` + Tests 1–8. Null UI-Risiko.
3. **Stepper-UI** in `explainView` (Schritt-Rendering, Weiter/Zurück, Fortschritt, Tor) + CSS. Browser: Durchsteppen, Tor blockt wirklich, Fortsetzen.
4. **Übersetzung + Rückfrage** (🇩🇪 je Schritt, Rückfrage-Schluss, Streaming-Bubble, Offline-Rückfall, qaLog) + Test 9 + Parent-Zweig. Browser: gemockter Stream, Rückfall ohne Key.
5. SW v10 + Test 10 + README/MEMORY + Vollverifikation.
6. Commit erst auf explizites Go.

## Verifikation (Dev 768×1024)

Neues Thema: Erklärung erscheint **Abschnitt für Abschnitt**, „Los geht's" ist **nicht erreichbar**, bevor die Rückfrage beantwortet ist · Zurück-Schritt funktioniert · Tab schließen und wieder öffnen → **setzt am selben Abschnitt fort** · 🇩🇪 an einem Abschnitt: mit (gemocktem) Key streamt deutsche Erklärung mit englischen Fachbegriffen in Klammern; **ohne Key** erscheint die einfachere englische Fassung statt einer Fehlermeldung · Rückfrage: „👍 Verstanden" **und** „🇩🇪 Bitte übersetzen" schalten beide frei · 🔊 am deutschen Text nur bei vorhandener deutscher Stimme, klingt deutsch · Wiederholung von der Karte (erledigtes Thema) startet **weiterhin ohne Erklärung** · Buddy-FAB bleibt in der Erklärung **versteckt** · Parent Corner zeigt Übersetzungen mit 🇩🇪 · kein H-Scroll · Tests 0 failed.

## Risiken / bewusste Entscheidungen

- **Zähigkeit:** 5–7 Schritte pro *neuem* Thema, einmalig (32 Themen über den Sommer), nicht pro Sitzung — Wiederholungen bleiben schnell. Kein Skip-Knopf; falls es doch nervt, ist ein Eltern-Schalter im Parent Corner die nachträgliche Ein-Zeilen-Option.
- **Kosten/Latenz:** Übersetzung ist ein Haiku-Aufruf über wenige hundert Tokens (Bruchteile eines Cents), nur auf Abruf.
- **Deutsche Stimme nicht garantiert** — Verhalten ist definiert (Knopf erscheint dann nicht), kein Fehlklang.
- **Ehrlichkeit des Rückfalls:** ohne Key gibt es *kein* Deutsch — der Knopf beschriftet dann ehrlich „einfachere Wörter", statt Übersetzung zu versprechen.

## Out of Scope

Vorübersetzte deutsche Inhalte für alle 32 Themen (mögliche spätere Ausbaustufe); Niederländisch; Erklärungszwang für Wiederholungen; Freitags-Challenge; kuratierte Textaufgaben.
