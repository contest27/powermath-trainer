// Browser test runner. Open tests/tests.html via a local server; results render
// on the page, log to the console, and land on window.__testResults.

const results = [];
function test(name, fn) {
  try { fn(); results.push({ name, ok: true }); }
  catch (e) { results.push({ name, ok: false, err: String(e && e.message || e) }); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${msg || 'eq failed'}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
  }
}

async function run() {
  let mods;
  try {
    mods = {
      rng: await import('../js/engine/rng.js'),
      storage: await import('../js/engine/storage.js'),
      mastery: await import('../js/engine/mastery.js'),
      scheduler: await import('../js/engine/scheduler.js'),
      check: await import('../js/engine/check.js'),
      progress: await import('../js/engine/progress.js'),
      content: await import('../js/content/index.js'),
      watch: await import('../js/engine/watch.js'),
      watchIndex: await import('../js/content/watch-index.js'),
      watchScenes: await import('../js/ui/watch-scenes.js'),
      svg: await import('../js/ui/svg.js'),
      mapScene: await import('../js/ui/map-scene.js'),
      focus: await import('../js/ui/focus.js'),
    };
  } catch (e) {
    results.push({ name: 'MODULE IMPORTS', ok: false, err: String(e) });
    report();
    return;
  }
  let shippedEpisode = null;
  let swText = '';
  let watchAudioText = '';
  try {
    shippedEpisode = await (await fetch('../data/watch/u08-fractions.json')).json();
    swText = await (await fetch('../sw.js')).text();
    watchAudioText = await (await fetch('../js/ui/watch-audio.js')).text();
  } catch (e) {
    results.push({ name: 'EPISODE/SW FETCH', ok: false, err: String(e) });
  }
  const { makeRng, seedFromString, ri, shuffle } = mods.rng;
  const { dayKey, addDays, daysBetween, defaultState, exportJSON, parseImport } = mods.storage;
  const { newMastery, updateMastery, bandOf, scheduleAfterSession, diagnosticScore } = mods.mastery;
  const { planSession, nextNewTopic, dueReviewTopics, NEW_TOPIC_TIERS } = mods.scheduler;
  const { checkAnswer, parseNumber, answerText, gcd } = mods.check;
  const { recordAttempt, completeTopic, finishSession, applyDiagnostic } = mods.progress;
  const { topics, topicOrder, topicById, diagnosticItems } = mods.content;

  // ---------------- rng
  test('rng: deterministic for equal seeds', () => {
    const a = makeRng(42), b = makeRng(42);
    for (let i = 0; i < 100; i++) eq(a(), b());
  });
  test('rng: ri stays in bounds', () => {
    const r = makeRng(7);
    for (let i = 0; i < 500; i++) {
      const v = ri(r, 3, 9);
      ok(v >= 3 && v <= 9 && Number.isInteger(v), 'ri out of bounds: ' + v);
    }
  });
  test('rng: shuffle is a permutation', () => {
    const r = makeRng(9);
    const arr = [1, 2, 3, 4, 5];
    const s = shuffle(r, arr);
    eq(s.slice().sort(), arr, 'not a permutation');
    eq(arr, [1, 2, 3, 4, 5], 'input mutated');
  });

  // ---------------- dates
  test('dates: addDays crosses month ends', () => {
    eq(addDays('2026-07-31', 1), '2026-08-01');
    eq(addDays('2026-12-31', 1), '2027-01-01');
    eq(daysBetween('2026-07-20', '2026-07-27'), 7);
  });

  // ---------------- storage
  test('storage: export/import round-trip strips key', () => {
    const s = defaultState();
    s.settings.apiKey = 'sk-secret';
    s.settings.name = 'Theo';
    s.completed.push('u01-pv100k');
    s.mastery['u01-pv100k'] = newMastery(70);
    const text = exportJSON(s);
    ok(!text.includes('sk-secret'), 'API key leaked into backup');
    const back = parseImport(text);
    eq(back.settings.name, 'Theo');
    eq(back.completed, ['u01-pv100k']);
    eq(back.mastery['u01-pv100k'].score, 70);
  });
  test('storage: rejects foreign JSON', () => {
    let threw = false;
    try { parseImport('{"hello": 1}'); } catch { threw = true; }
    ok(threw, 'should reject non-backup JSON');
  });

  // ---------------- mastery
  test('mastery: EWMA stays within [5,100]', () => {
    const m = newMastery(50);
    for (let i = 0; i < 60; i++) updateMastery(m, 1, false);
    ok(m.score >= 5, 'floor broken: ' + m.score);
    for (let i = 0; i < 60; i++) updateMastery(m, 3, true);
    ok(m.score <= 100, 'ceiling broken: ' + m.score);
    ok(m.score > 80, 'many correct answers should lift the score, got ' + m.score);
  });
  test('mastery: misses hurt more on easy tiers', () => {
    const a = newMastery(70), b = newMastery(70);
    updateMastery(a, 1, false);
    updateMastery(b, 3, false);
    ok(a.score < b.score, `tier-1 miss (${a.score}) should drop below tier-3 miss (${b.score})`);
  });
  test('mastery: bands and review gaps', () => {
    eq(bandOf(40), 'struggling'); eq(bandOf(70), 'developing'); eq(bandOf(90), 'secure');
    const m = newMastery(40);
    scheduleAfterSession(m, '2026-07-20');
    eq(m.due, '2026-07-21', 'struggling reviews next day');
    const m2 = newMastery(95);
    scheduleAfterSession(m2, '2026-07-20');
    eq(m2.due, '2026-07-27', 'secure reviews after a week');
    ok(diagnosticScore(0) < diagnosticScore(1), 'diagnostic score monotone');
  });

  // ---------------- scheduler
  test('scheduler: diagnostic comes first', () => {
    const s = defaultState();
    const plan = planSession(s, topicOrder, '2026-07-20', makeRng(1));
    eq(plan.kind, 'diagnostic');
  });
  test('scheduler: topics follow curriculum order', () => {
    const s = defaultState();
    s.diagnosticDone = true;
    eq(nextNewTopic(s, topicOrder), topicOrder[0]);
    s.completed.push(topicOrder[0]);
    eq(nextNewTopic(s, topicOrder), topicOrder[1]);
  });
  test('scheduler: weakest due topic reviewed first and most often', () => {
    const s = defaultState();
    s.diagnosticDone = true;
    s.completed = ['A', 'B', 'C'];
    s.mastery = {
      A: { score: 30, due: '2026-07-19' },
      B: { score: 90, due: '2026-07-19' },
      C: { score: 55, due: '2026-07-20' },
    };
    const due = dueReviewTopics(s, '2026-07-20');
    eq(due[0], 'A', 'weakest first');
    const plan = planSession(s, ['A', 'B', 'C'], '2026-07-20', makeRng(3));
    const countA = plan.review.filter((r) => r.topicId === 'A').length;
    const countB = plan.review.filter((r) => r.topicId === 'B').length;
    ok(countA >= countB, `A (weak) should get at least as many reviews as B: ${countA} vs ${countB}`);
    ok(plan.review.length > 0, 'review block not empty');
  });
  test('scheduler: nothing due -> keep-sharp mix still practises weakest', () => {
    const s = defaultState();
    s.diagnosticDone = true;
    s.completed = topicOrder.slice();
    for (const id of topicOrder) s.mastery[id] = { score: 80, due: '2099-01-01' };
    s.mastery[topicOrder[4]].score = 20;
    const plan = planSession(s, topicOrder, '2026-07-20', makeRng(5));
    eq(plan.kind, 'review');
    ok(plan.review.some((r) => r.topicId === topicOrder[4]), 'weakest topic included in keep-sharp mix');
  });

  // ---------------- checker
  test('check: parseNumber handles commas, spaces, minus', () => {
    eq(parseNumber('34,500'), 34500);
    eq(parseNumber('34 500'), 34500);
    eq(parseNumber('-4'), -4);
    eq(parseNumber('−4'), -4);
    eq(parseNumber('2.75'), 2.75);
    eq(parseNumber('abc'), null);
    eq(parseNumber(''), null);
  });
  test('check: fraction equivalence and exactness', () => {
    ok(checkAnswer({ kind: 'frac', answer: { n: 1, d: 2 } }, { n: '2', d: '4' }).ok, '2/4 should equal 1/2');
    ok(!checkAnswer({ kind: 'frac', answer: { n: 1, d: 2 }, exact: true }, { n: '2', d: '4' }).ok, 'exact mode rejects 2/4');
    ok(checkAnswer({ kind: 'frac', answer: { n: 5, d: 4 } }, { n: '5', d: '4' }).ok, 'improper accepted');
    ok(!checkAnswer({ kind: 'frac', answer: { n: 1, d: 2 } }, { n: '1', d: '0' }).ok, 'zero denominator rejected');
  });
  test('check: order + mc + tf + tolerance', () => {
    ok(checkAnswer({ kind: 'order', correctOrder: ['1', '2', '3'] }, ['1', '2', '3']).ok);
    ok(!checkAnswer({ kind: 'order', correctOrder: ['1', '2', '3'] }, ['2', '1', '3']).ok);
    ok(checkAnswer({ kind: 'mc', answerIndex: 2 }, 2).ok);
    ok(checkAnswer({ kind: 'tf', answer: false }, false).ok);
    ok(checkAnswer({ kind: 'num', answer: 5.9, tolerance: 0.001 }, '5.9').ok);
    ok(checkAnswer({ kind: 'num', answer: 0.3, tolerance: 0.001 }, '0.3').ok);
    eq(gcd(12, 18), 6);
  });

  // ---------------- progress
  test('progress: streak counts consecutive days and resets after a gap', () => {
    const s = defaultState();
    finishSession(s, { kind: 'daily', total: 1, correct: 1, minutes: 1 }, '2026-07-20');
    eq(s.streak.count, 1);
    finishSession(s, { kind: 'daily', total: 1, correct: 1, minutes: 1 }, '2026-07-21');
    eq(s.streak.count, 2);
    finishSession(s, { kind: 'daily', total: 1, correct: 1, minutes: 1 }, '2026-07-21');
    eq(s.streak.count, 2, 'same day does not double-count');
    finishSession(s, { kind: 'daily', total: 1, correct: 1, minutes: 1 }, '2026-07-25');
    eq(s.streak.count, 1, 'gap resets streak');
  });
  test('progress: stars thresholds', () => {
    const s = defaultState();
    s.mastery['t'] = newMastery(50);
    eq(completeTopic(s, 't', 10, 11, '2026-07-20'), 3, '>=90% is 3 stars');
    const s2 = defaultState();
    s2.mastery['t'] = newMastery(50);
    eq(completeTopic(s2, 't', 8, 11, '2026-07-20'), 2, '~73% is 2 stars');
    const s3 = defaultState();
    s3.mastery['t'] = newMastery(50);
    eq(completeTopic(s3, 't', 5, 11, '2026-07-20'), 1, '<70% is 1 star');
  });
  test('progress: diagnostic seeds every topic mastery', () => {
    const s = defaultState();
    applyDiagnostic(s, { place: { correct: 3, total: 3 }, fractions: { correct: 0, total: 3 } }, topics, '2026-07-20');
    ok(s.diagnosticDone);
    ok(topics.every((t) => s.mastery[t.id] && s.mastery[t.id].score >= 5), 'every topic seeded');
    const placeTopic = topics.find((t) => t.strand === 'place');
    const fracTopic = topics.find((t) => t.strand === 'fractions');
    ok(s.mastery[placeTopic.id].score > s.mastery[fracTopic.id].score, 'strong strand seeds higher than weak strand');
  });

  // ---------------- content integrity
  test('content: 32 topics, unique ids, all fields present', () => {
    eq(topics.length, 32, 'expected 32 topics');
    const ids = new Set(topics.map((t) => t.id));
    eq(ids.size, topics.length, 'duplicate topic ids');
    for (const t of topics) {
      ok(t.title && t.shortTitle && t.strand && t.emoji, t.id + ': meta missing');
      ok(t.explanation?.segments?.length >= 3, t.id + ': needs >=3 explanation segments');
      ok(t.explanation.segments.every((s) => s.text && s.alt), t.id + ': segment missing text/alt');
      ok(t.faqs?.length >= 3, t.id + ': needs >=3 FAQs');
      ok(t.example?.steps?.length >= 2, t.id + ': worked example missing');
      ok(typeof t.gen === 'function', t.id + ': gen missing');
    }
  });

  // Correct-input builder per question kind: the checker must accept its own answer.
  function correctInput(q) {
    switch (q.kind) {
      case 'num': return String(q.answer);
      case 'mc': return q.answerIndex;
      case 'tf': return q.answer;
      case 'frac': return { n: String(q.answer.n), d: String(q.answer.d) };
      case 'order': return q.correctOrder.slice();
      default: return null;
    }
  }

  function validate(q, where) {
    ok(q && typeof q === 'object', where + ': no question');
    ok(['num', 'mc', 'tf', 'frac', 'order'].includes(q.kind), where + ': bad kind ' + q.kind);
    ok(typeof q.prompt === 'string' && q.prompt.length > 4, where + ': empty prompt');
    ok([1, 2, 3].includes(q.tier), where + ': bad tier ' + q.tier);
    if (q.kind === 'num') {
      ok(typeof q.answer === 'number' && Number.isFinite(q.answer), where + ': bad num answer ' + q.answer);
    }
    if (q.kind === 'mc') {
      ok(Array.isArray(q.options) && q.options.length >= 2, where + ': bad options');
      ok(q.answerIndex >= 0 && q.answerIndex < q.options.length, where + ': answerIndex out of range (' + q.answerIndex + ')');
      eq(new Set(q.options.map(String)).size, q.options.length, where + ': duplicate options');
    }
    if (q.kind === 'frac') {
      ok(Number.isInteger(q.answer.n) && Number.isInteger(q.answer.d) && q.answer.d > 0, where + ': bad fraction');
    }
    if (q.kind === 'order') {
      eq(q.items.slice().sort(), q.correctOrder.slice().sort(), where + ': items not a permutation of the answer');
    }
    const res = checkAnswer(q, correctInput(q));
    ok(res.ok, where + ': checker rejects its own correct answer');
    ok(answerText(q).length > 0, where + ': empty answerText');
  }

  for (const t of topics) {
    test(`gen sweep: ${t.id}`, () => {
      for (let tier = 1; tier <= 3; tier++) {
        for (let seed = 0; seed < 40; seed++) {
          const rng = makeRng(seedFromString(`${t.id}|${tier}|${seed}`));
          const q = t.gen(rng, tier);
          validate(q, `${t.id} t${tier} s${seed}`);
        }
      }
    });
  }

  test('diagnostic: 18 well-formed items covering every strand', () => {
    for (let seed = 0; seed < 20; seed++) {
      const items = diagnosticItems(makeRng(seed + 1));
      eq(items.length, 18, 'expected 18 items');
      const strands = new Set(items.map((q) => q.strand));
      for (const s of ['place', 'addsub', 'multdiv', 'fractions', 'decimals', 'stats', 'measure', 'geometry']) {
        ok(strands.has(s), 'missing strand ' + s);
      }
      items.forEach((q, i) => validate(q, `diag s${seed} i${i}`));
    }
  });

  // ---------------- focused practice (map-launched)
  const { buildFocusSession, applySessionEnd, stationAction } = mods.focus;
  const D = '2026-07-24';
  function seededState(n) {
    const st = defaultState();
    st.diagnosticDone = true;
    for (const id of topicOrder) st.mastery[id] = newMastery(70);
    st.completed = topicOrder.slice(0, n);
    return st;
  }
  const answerAll = (s, ok = true) => s.items.map((it) => ({ part: it.part, topicId: it.topicId, ok }));

  test('focus: new session builds explanation + 11 practice items, no review', () => {
    const st = seededState(3);
    const cur = topicOrder[3];
    const fs = buildFocusSession(st, cur, 'new', D, makeRng(1));
    eq(fs.kind, 'focus-new');
    eq(fs.phase, 'explain');
    eq(fs.newTopic, cur);
    eq(fs.items.length, 11);
    ok(fs.items.every((it) => it.part === 'practice' && it.topicId === cur), 'all practice, one topic');
    ok(fs.focus === true && fs.origin === 'map', 'focus flag + map origin');
  });

  test('focus: review session builds 8 adaptive items, no explanation', () => {
    const st = seededState(4);
    st.mastery[topicOrder[0]] = newMastery(30);
    const fs = buildFocusSession(st, topicOrder[0], 'review', D, makeRng(2));
    eq(fs.kind, 'focus-review');
    eq(fs.phase, 'items');
    eq(fs.newTopic, null);
    eq(fs.focusTopic, topicOrder[0]);
    eq(fs.items.length, 8);
    ok(fs.items.every((it) => it.part === 'review'), 'all review items');
    ok(fs.items.every((it) => [1, 2, 3].includes(it.q.tier)), 'tiers in range');
  });

  test('focus: completing a new current topic marks it completed and advances the journey', () => {
    const st = seededState(3);
    const cur = topicOrder[3];
    const fs = buildFocusSession(st, cur, 'new', D, makeRng(3));
    fs.results = answerAll(fs, true);
    applySessionEnd(st, fs, D);
    ok(st.completed.includes(cur), 'current topic completed');
    eq(nextNewTopic(st, topicOrder), topicOrder[4], 'journey advances by one');
    ok((st.stars[cur] ?? 0) >= 1, 'earns stars');
    eq(fs.phase, 'summary');
    ok(st.focusSession === fs, 'focus slot holds the finished session for its summary');
  });

  test('focus: completing a review does not change completed and reschedules', () => {
    const st = seededState(4);
    const id = topicOrder[1];
    st.mastery[id].due = '2026-07-20';
    const before = st.completed.slice();
    const fs = buildFocusSession(st, id, 'review', D, makeRng(4));
    fs.results = answerAll(fs, true);
    applySessionEnd(st, fs, D);
    eq(st.completed, before, 'completed unchanged');
    ok(st.mastery[id].due > D, 'rescheduled into the future');
    eq(fs.summary.stars, null, 'no stars for re-practice');
  });

  test('focus: a half-finished daily session survives a map review run', () => {
    const st = seededState(4);
    const daily = { kind: 'daily', newTopic: topicOrder[4], phase: 'items', focus: false, day: D };
    st.activeSession = daily;
    const fs = buildFocusSession(st, topicOrder[1], 'review', D, makeRng(5));
    fs.results = answerAll(fs, true);
    applySessionEnd(st, fs, D);
    ok(st.activeSession === daily, 'daily lesson object untouched');
    eq(st.activeSession.newTopic, topicOrder[4], 'daily still points at its topic');
    ok(st.focusSession === fs, 'focus lives in its own slot');
  });

  test('focus: completing the current new topic drops the now-stale same-topic daily', () => {
    const st = seededState(3);
    const cur = topicOrder[3];
    st.activeSession = { kind: 'daily', newTopic: cur, phase: 'explain', focus: false, day: D };
    const fs = buildFocusSession(st, cur, 'new', D, makeRng(6));
    fs.results = answerAll(fs, true);
    applySessionEnd(st, fs, D);
    ok(st.completed.includes(cur), 'topic completed');
    eq(st.activeSession, null, 'stale same-topic daily dropped');
  });

  test('focus: return target is the map, daily falls back to today', () => {
    const fs = buildFocusSession(seededState(3), topicOrder[3], 'new', D, makeRng(7));
    eq(fs.origin, 'map');
    const dailyLike = { kind: 'daily' };
    eq(dailyLike.origin ?? 'today', 'today');
    eq(fs.origin ?? 'today', 'map');
  });

  test('map: stationAction routes done->review, current->new, locked->toast', () => {
    const st = seededState(3);
    eq(stationAction(st, topicById(topicOrder[0]), 'done').mode, 'review');
    eq(stationAction(st, topicById(topicOrder[3]), 'current').mode, 'new');
    eq(stationAction(st, topicById(topicOrder[7]), 'locked').kind, 'toast');
  });

  test('map: stationAction sends everything to a toast until the diagnostic is done', () => {
    const st = defaultState();
    eq(stationAction(st, topicById(topicOrder[0]), 'current').kind, 'toast');
    eq(stationAction(st, topicById(topicOrder[0]), 'done').kind, 'toast');
  });

  test('focus: sw precaches focus.js and the version was bumped', () => {
    ok(swText, 'sw.js did not load');
    ok(swText.includes("'./js/ui/focus.js'"), 'sw.js ASSETS missing focus.js');
    ok(!swText.includes("'pmtrainer-v6'"), 'CACHE_VERSION was not bumped for the map-practice release');
    for (const p of ["'./js/ui/session.js'", "'./js/ui/map.js'", "'./js/ui/core.js'", "'./css/app.css'"]) {
      ok(swText.includes(p), 'sw.js ASSETS unexpectedly dropped ' + p);
    }
  });

  test('session tiers: practice ramp is easy to hard', () => {
    eq(NEW_TOPIC_TIERS[0], 1);
    eq(NEW_TOPIC_TIERS[NEW_TOPIC_TIERS.length - 1], 3);
    ok(NEW_TOPIC_TIERS.every((t, i, a) => i === 0 || t >= a[i - 1]), 'ramp not monotone');
  });

  // ---------------- watch episodes (pure core)
  const {
    seqInit, seqPlay, seqPause, seqNext, seqPrev, seqRestart,
    validateScene, validateEpisode, markWatched, noteStep,
  } = mods.watch;
  const { EPISODES, episodeForUnit, episodeById } = mods.watchIndex;

  // Minimal well-formed episode covering all five scene types.
  const epFix = () => ({
    id: 'ep-test', title: 'Test episode', unit: 8, topicIds: ['u08-equivalent'],
    voices: { teacher: 'en-GB-SoniaNeural', kid: 'en-GB-MaisieNeural' },
    speakers: { teacher: 'Miss Sonia', kid: 'Maisie' },
    steps: [
      { id: 's01', speaker: 'teacher', text: 'Hello!', audio: 'ep-test/s01.mp3',
        scene: { type: 'titleCard', title: 'Equivalent fractions', sub: 'Unit 8', emoji: '🍫' } },
      { id: 's02', speaker: 'kid', text: 'One half!', audio: 'ep-test/s02.mp3',
        scene: { type: 'fracBars', bars: [{ n: 1, d: 2, label: '1/2' }], anim: 'shade' } },
      { id: 's03', speaker: 'teacher', text: 'Split it.', audio: 'ep-test/s03.mp3',
        scene: { type: 'fracBars', bars: [{ n: 2, d: 4, splitFrom: 2 }], anim: 'split' } },
      { id: 's04', speaker: 'kid', text: 'Same spot.', audio: 'ep-test/s04.mp3',
        scene: { type: 'numberLine', min: 0, max: 1, step: 0.25, marks: [{ v: 0.5, label: '1/2' }], pointer: { v: 0.5 }, hopFrom: 0, anim: 'hop' } },
      { id: 's05', speaker: 'teacher', text: 'Equal?', audio: 'ep-test/s05.mp3',
        scene: { type: 'compare', left: { n: 3, d: 4 }, right: { n: 9, d: 12 }, symbol: '=', anim: 'reveal' } },
      { id: 's06', speaker: 'teacher', text: 'Two thirds equals four sixths.', audio: 'ep-test/s06.mp3',
        scene: { type: 'fracNotation', items: [{ n: 2, d: 3 }, { n: 4, d: 6 }], joiner: '=', arrows: { top: '×2', bottom: '×2' }, anim: 'arrows' } },
    ],
  });

  test('watch: defaultState has watched and legacy states gain it', () => {
    eq(defaultState().watched, {});
    const legacy = JSON.parse(JSON.stringify(defaultState()));
    delete legacy.watched;
    const merged = Object.assign(defaultState(), legacy);
    ok(merged.watched && typeof merged.watched === 'object', 'shallow merge should restore watched');
  });

  test('focus: defaultState carries an empty focusSession slot', () => {
    eq(defaultState().focusSession, null);
    const legacy = JSON.parse(JSON.stringify(defaultState()));
    delete legacy.focusSession;
    const merged = Object.assign(defaultState(), legacy);
    ok('focusSession' in merged && merged.focusSession === null, 'shallow merge should restore focusSession');
  });

  test('watch: sequencer advances and detects the end', () => {
    let s = seqInit(3);
    eq(s, { count: 3, idx: 0, status: 'idle' });
    s = seqPlay(s);
    eq(s.status, 'playing');
    s = seqNext(s); eq([s.idx, s.status], [1, 'playing']);
    s = seqNext(s); eq([s.idx, s.status], [2, 'playing']);
    s = seqNext(s); eq(s.status, 'ended');
    ok(s.idx <= 2, 'idx must never exceed count-1');
    eq(seqNext(s).status, 'ended', 'next on ended stays ended');
    eq(seqPlay(s).status, 'ended', 'play on ended stays ended (restart is the path)');
  });

  test('watch: sequencer prev clamps and leaves ended', () => {
    let s = seqInit(3);
    eq(seqPrev(s).idx, 0, 'prev at 0 stays 0');
    s = seqPlay(s); s = seqNext(s); s = seqNext(s); s = seqNext(s);
    eq(s.status, 'ended');
    const back = seqPrev(s);
    eq([back.idx, back.status], [2, 'paused']);
  });

  test('watch: sequencer restart and pause toggle', () => {
    let s = seqPlay(seqInit(2));
    s = seqPause(s); eq(s.status, 'paused');
    s = seqPlay(s); eq(s.status, 'playing');
    s = seqNext(s); s = seqNext(s); eq(s.status, 'ended');
    s = seqRestart(s); eq([s.idx, s.status], [0, 'playing']);
    eq(seqPause(seqInit(2)).status, 'idle', 'pause only affects playing');
  });

  test('watch: validateEpisode accepts a well-formed episode', () => {
    const res = validateEpisode(epFix());
    eq(res.errors, [], 'unexpected errors');
    ok(res.ok);
  });

  test('watch: validateEpisode rejects broken episodes', () => {
    const broken = [
      (e) => { e.steps[1].id = 's01'; return 's01'; },
      (e) => { e.steps[2].speaker = 'ghost'; return 's03'; },
      (e) => { e.steps[3].text = '  '; return 's04'; },
      (e) => { delete e.steps[4].audio; return 's05'; },
      (e) => { e.steps[5].scene = { type: 'pieChart' }; return 's06'; },
    ];
    for (const mutate of broken) {
      const e = epFix();
      const id = mutate(e);
      const res = validateEpisode(e);
      ok(!res.ok, 'should reject mutated episode');
      ok(res.errors.some((msg) => msg.includes(id)), `error should name ${id}: ${res.errors.join(' | ')}`);
    }
  });

  test('watch: validateScene enforces per-type fields', () => {
    ok(validateScene({ type: 'fracBars', bars: [] }).length, 'no bars');
    ok(validateScene({ type: 'fracBars', bars: [{ n: 1, d: 2 }, { n: 1, d: 3 }, { n: 1, d: 4 }] }).length, 'three bars');
    ok(validateScene({ type: 'fracBars', bars: [{ n: 5, d: 4 }] }).length, 'n > d');
    ok(validateScene({ type: 'fracBars', bars: [{ n: 1, d: 4, splitFrom: 3 }] }).length, 'splitFrom must divide d');
    ok(validateScene({ type: 'numberLine', min: 1, max: 1 }).length, 'max <= min');
    ok(validateScene({ type: 'compare', left: { n: 1, d: 2 }, symbol: '=' }).length, 'missing right');
    ok(validateScene({ type: 'titleCard' }).length, 'title missing');
    ok(validateScene({ type: 'fracBars', bars: [{ n: 1, d: 2 }], anim: 'hop' }).length, 'anim from wrong type');
    eq(validateScene({ type: 'titleCard', title: 'Hi' }), []);
    eq(validateScene({ type: 'fracBars', bars: [{ n: 0, d: 4 }] }), []);
    eq(validateScene({ type: 'fracNotation', items: [{ n: 1, d: 2 }] }), []);
    eq(validateScene({ type: 'numberLine', min: 0, max: 1 }), []);
    eq(validateScene({ type: 'compare', left: { n: 1, d: 2 }, right: { n: 2, d: 4 }, symbol: '?' }), []);
  });

  test('watch: registry resolves units and topics', () => {
    eq(episodeForUnit(8).id, 'u08-fractions');
    eq(episodeForUnit(9), null);
    eq(episodeById('u08-fractions').unit, 8);
    for (const e of EPISODES) {
      for (const tid of e.topicIds) ok(topicById(tid), `${e.id}: unknown topic ${tid}`);
      ok(topics.some((t) => t.unit === e.unit), `${e.id}: no topics in unit ${e.unit}`);
    }
  });

  test('watch: shipped episode passes validateEpisode', () => {
    ok(shippedEpisode, 'episode JSON did not load');
    const res = validateEpisode(shippedEpisode);
    eq(res.errors, [], 'shipped episode has errors');
    ok(shippedEpisode.steps.length >= 12, 'episode suspiciously short');
    ok(shippedEpisode.steps.every((st) => st.audio.startsWith(shippedEpisode.id + '/')),
      'audio paths must live under the episode folder');
    ok(shippedEpisode.steps.every((st) => st.durationSec > 0), 'unrendered step (durationSec 0)');
  });

  test('watch: registry entry matches the shipped episode', () => {
    ok(shippedEpisode, 'episode JSON did not load');
    const reg = episodeById(shippedEpisode.id);
    ok(reg, 'shipped episode not in registry');
    eq(reg.title, shippedEpisode.title);
    eq(reg.unit, shippedEpisode.unit);
    eq(reg.file, shippedEpisode.id + '.json');
    const mins = shippedEpisode.steps.reduce((a, st) => a + st.durationSec, 0) / 60;
    ok(Math.abs(reg.minutes - mins) <= 1, `registry minutes (${reg.minutes}) drifted from actual (${mins.toFixed(1)})`);
  });

  test('watch: every shipped step renders', () => {
    ok(shippedEpisode, 'episode JSON did not load');
    for (const st of shippedEpisode.steps) {
      const svg = mods.watchScenes.renderScene(st.scene);
      ok(svg && svg.namespaceURI === 'http://www.w3.org/2000/svg', st.id + ': did not render');
    }
  });

  test('watch: renderScene builds SVG for all five types', () => {
    const { renderScene } = mods.watchScenes;
    const specs = [
      { type: 'titleCard', title: 'Hello', sub: 'Unit 8', emoji: '🍫' },
      { type: 'fracBars', bars: [{ n: 3, d: 4, label: '3/4' }], anim: 'shade' },
      { type: 'fracNotation', items: [{ n: 2, d: 3 }, { n: 4, d: 6 }], joiner: '=', arrows: { top: '×2', bottom: '×2' }, anim: 'arrows' },
      { type: 'numberLine', min: 0, max: 1, step: 0.25, marks: [{ v: 0.5, label: '1/2' }, { v: 0.5, label: '2/4' }], pointer: { v: 0.5 }, hopFrom: 0, anim: 'hop' },
      { type: 'compare', left: { n: 3, d: 4 }, right: { n: 9, d: 12 }, symbol: '=', anim: 'reveal' },
    ];
    for (const spec of specs) {
      const svg = renderScene(spec);
      eq(svg.namespaceURI, 'http://www.w3.org/2000/svg', spec.type + ': not SVG namespace');
      eq(svg.getAttribute('viewBox'), '0 0 320 240', spec.type + ': wrong viewBox');
      ok(svg.querySelectorAll('*').length > 2, spec.type + ': suspiciously empty scene');
    }
    const bars = renderScene({ type: 'fracBars', bars: [{ n: 3, d: 4 }] });
    eq(bars.querySelectorAll('.fb-cell').length, 4, 'cell count should equal d');
    eq(bars.querySelectorAll('.fb-cell.shaded').length, 3, 'shaded count should equal n');
  });

  test('watch: split renders the new dividers', () => {
    const svg = mods.watchScenes.renderScene({ type: 'fracBars', bars: [{ n: 2, d: 4, splitFrom: 2 }], anim: 'split' });
    eq(svg.querySelectorAll('.fb-div-new').length, 2, 'expected d - splitFrom new dividers');
    eq(svg.querySelectorAll('.fb-cell').length, 2, 'base cells render at splitFrom granularity');
    eq(svg.querySelectorAll('.fb-cell.shaded').length, 1, '2/4 shades one base cell');
  });

  test('watch: scene palette matches vis.js', () => {
    const { colorFor } = mods.watchScenes;
    eq(colorFor('green'), '#86efac');
    eq(colorFor('blue'), '#7dd3fc');
    eq(colorFor('yellow'), '#fcd34d');
    eq(colorFor('red'), '#fca5a5');
    eq(colorFor('purple'), '#c4b5fd');
    eq(colorFor('nonsense'), '#86efac', 'unknown colors fall back to green');
  });

  // ---------------- treasure map
  const { buildTreasureMap, deriveRegions, regionTop, GEO } = mods.mapScene;

  function mkTreasureMap({ completed = [], stars = {}, mastery = {}, episodeForUnit = mods.watchIndex.episodeForUnit, onStation, onWatch } = {}) {
    const st = defaultState();
    st.completed = completed;
    st.stars = stars;
    st.mastery = mastery;
    return buildTreasureMap({ topics, strands: mods.content.STRANDS, state: st, episodeForUnit, onStation, onWatch });
  }
  const mapH = () => {
    const regions = deriveRegions(topics);
    return GEO.TOP + regions.length * GEO.HDR + topics.length * GEO.STEP + GEO.FIN;
  };

  test('map: renders 32 stations in curriculum order', () => {
    const { svg } = mkTreasureMap();
    const ids = [...svg.querySelectorAll('.tmap-station')].map((g) => g.getAttribute('data-topic'));
    eq(ids, topicOrder);
  });

  test('map: region bands match the strand runs', () => {
    const runs = deriveRegions(topics).map((r) => [r.strand, r.count]);
    eq(runs, [['place', 3], ['addsub', 3], ['stats', 1], ['multdiv', 2], ['measure', 2], ['multdiv', 3], ['fractions', 6], ['decimals', 5], ['geometry', 4], ['measure', 3]]);
    const { svg } = mkTreasureMap();
    const signs = [...svg.querySelectorAll('.tmap-sign')];
    eq(signs.length, 10);
    signs.forEach((sg, r) => {
      const meta = mods.content.STRANDS[deriveRegions(topics)[r].strand];
      ok(sg.textContent.includes(meta.title), `sign ${r} should show ${meta.title}`);
    });
    // SVG paints in document order: planks must come after the route so the
    // dashed path never crosses out a signpost.
    const route = svg.querySelector('.tmap-route');
    ok(route.compareDocumentPosition(signs[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
      'signposts must render above the route');
  });

  test('map: done/current/locked classes derive from state', () => {
    const { svg, currentEl, doneCount } = mkTreasureMap({ completed: topicOrder.slice(0, 5) });
    const st = [...svg.querySelectorAll('.tmap-station')];
    ok(st[4].classList.contains('done'));
    ok(st[5].classList.contains('current'));
    ok(st[5].querySelector('.tmap-marker') && st[5].querySelector('.tmap-pulse'), 'current carries boat and pulse');
    ok(st[6].classList.contains('locked'));
    eq(doneCount, 5);
    ok(currentEl === st[5], 'currentEl points at the current station');
  });

  test('map: exactly one current station; none when all done', () => {
    const fresh = mkTreasureMap();
    eq(fresh.svg.querySelectorAll('.tmap-station.current').length, 1);
    ok(fresh.svg.querySelectorAll('.tmap-station')[0].classList.contains('current'));
    const all = mkTreasureMap({ completed: topicOrder.slice() });
    eq(all.svg.querySelectorAll('.tmap-station.current').length, 0);
    eq(all.svg.querySelectorAll('.tmap-marker').length, 0);
    ok(all.allDone, 'allDone flag');
    eq(all.doneCount, 32);
    ok(all.svg.querySelector('.tmap-chest').classList.contains('open'), 'chest opens');
    ok(all.currentEl === null, 'no currentEl when done');
    ok(all.finaleEl && all.finaleEl.classList.contains('tmap-finale'), 'finaleEl exposed');
  });

  test('map: ring colors follow the mastery bands', () => {
    const ids = topicOrder.slice(0, 4);
    const { svg } = mkTreasureMap({
      completed: ids,
      mastery: { [ids[0]]: { score: 50 }, [ids[1]]: { score: 70 }, [ids[2]]: { score: 90 } },
    });
    const st = [...svg.querySelectorAll('.tmap-station')];
    ok(st[0].classList.contains('band-red'));
    ok(st[1].classList.contains('band-amber'));
    ok(st[2].classList.contains('band-green'));
    ok(st[3].classList.contains('band-none'), 'completed without mastery falls back');
  });

  test('map: watch signposts sit exactly where the registry has episodes', () => {
    const { svg } = mkTreasureMap();
    const signs = [...svg.querySelectorAll('.tmap-watch')];
    const expected = topics.filter((t) => mods.watchIndex.episodeForUnit(t.unit));
    eq(signs.length, expected.length);
    ok(signs.length >= 2, 'unit 8 has two stations today');
    for (const sg of signs) ok(sg.getAttribute('aria-label').startsWith('Watch: '), 'sign aria-label');
  });

  test('map: watch sign fires onWatch and not onStation', () => {
    let watch = 0;
    let station = 0;
    const { svg } = mkTreasureMap({ onStation: () => station++, onWatch: () => watch++ });
    svg.querySelector('.tmap-watch').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    eq([watch, station], [1, 0]);
  });

  test('map: station tap reports topic and status', () => {
    const calls = [];
    const { svg } = mkTreasureMap({
      completed: topicOrder.slice(0, 2),
      onStation: (t, status) => calls.push([t.id, status]),
    });
    const st = [...svg.querySelectorAll('.tmap-station')];
    st[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    st[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    st[5].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    eq(calls, [[topicOrder[0], 'done'], [topicOrder[2], 'current'], [topicOrder[5], 'locked']]);
  });

  test('map: fog starts after the current region and spares the treasure', () => {
    const regions = deriveRegions(topics);
    const m = mkTreasureMap({ completed: topicOrder.slice(0, 6) }); // current idx 6 = stats region (2)
    const fog = m.svg.querySelector('.tmap-fog');
    eq(fog.getAttribute('data-after-region'), '3');
    const rect = fog.querySelector('rect');
    eq(Number(rect.getAttribute('y')), regionTop(regions, 3));
    eq(Number(rect.getAttribute('y')) + Number(rect.getAttribute('height')), mapH() - GEO.FIN);
    eq(fog.getAttribute('pointer-events'), 'none');
    eq(mkTreasureMap().svg.querySelector('.tmap-fog').getAttribute('data-after-region'), '1');
    ok(!mkTreasureMap({ completed: topicOrder.slice() }).svg.querySelector('.tmap-fog'), 'no fog when all done');
  });

  test('map: treasure finale present with the goal flag', () => {
    const { svg } = mkTreasureMap();
    const fin = svg.querySelector('.tmap-finale');
    ok(fin.querySelector('.tmap-x'), 'X marks the spot');
    const chest = fin.querySelector('.tmap-chest');
    ok(chest && !chest.classList.contains('open'), 'chest closed while incomplete');
    ok(fin.textContent.includes('32/32'), 'goal flag');
    ok(fin.querySelector('.tmap-ship'), 'pirate ship anchors in the cove');
  });

  test('map: sw assets include the map modules and the version was bumped', () => {
    ok(swText, 'sw.js did not load');
    ok(swText.includes("'./js/ui/svg.js'"), 'sw.js ASSETS missing svg.js');
    ok(swText.includes("'./js/ui/map-scene.js'"), 'sw.js ASSETS missing map-scene.js');
    ok(!swText.includes("'pmtrainer-v5'"), 'CACHE_VERSION was not bumped for the map release');
  });

  test('map: geometry stays inside the viewBox and targets stay big', () => {
    const { svg } = mkTreasureMap();
    eq(svg.getAttribute('viewBox'), `0 0 320 ${mapH()}`);
    for (const g of svg.querySelectorAll('.tmap-station')) {
      const hit = g.querySelector('.tmap-hit');
      const cx = Number(hit.getAttribute('cx'));
      ok(cx >= 80 && cx <= 240 && cx !== 160, 'station x inside meander band: ' + cx);
      ok(Number(hit.getAttribute('r')) >= 17, 'station hit target too small');
    }
    for (const c of svg.querySelectorAll('.tmap-watch circle')) {
      ok(Number(c.getAttribute('r')) >= 14, 'sign target too small');
    }
    for (const tl of svg.querySelectorAll('.tmap-label')) {
      const x = Number(tl.getAttribute('x'));
      const w = tl.textContent.length * 5.8;
      const anchorStart = tl.getAttribute('text-anchor') === 'start';
      const lo = anchorStart ? x : x - w;
      const hi = anchorStart ? x + w : x;
      ok(lo >= 18 && hi <= 302, `label "${tl.textContent}" extent ${lo.toFixed(0)}..${hi.toFixed(0)} out of bounds`);
    }
  });

  // ---------------- shared svg helpers
  test('svg: s() builds namespaced elements with attrs and children', () => {
    const { s, SVG_NS } = mods.svg;
    const g = s('g', { class: 'x', hidden: false, skip: null, flag: true },
      'text', s('rect', { x: 5 }), [s('circle', { r: 3 }), null]);
    eq(g.namespaceURI, SVG_NS);
    eq(g.getAttribute('class'), 'x');
    ok(!g.hasAttribute('hidden'), 'false attrs skipped');
    ok(!g.hasAttribute('skip'), 'null attrs skipped');
    eq(g.getAttribute('flag'), '', 'true renders as empty attr');
    eq(g.childNodes.length, 3, 'text + node + flattened array child');
    eq(g.firstChild.textContent, 'text');
    eq(g.querySelector('rect').getAttribute('x'), '5');
  });

  test('svg: di() sets the stagger property', () => {
    const { s, di } = mods.svg;
    const el = di(s('rect'), 4);
    eq(el.style.getPropertyValue('--i'), '4');
  });

  test('watch: sw assets and media cache are consistent', () => {
    ok(swText, 'sw.js did not load');
    const needed = [
      './js/ui/watch.js', './js/ui/watch-scenes.js', './js/ui/watch-audio.js',
      './js/engine/watch.js', './js/content/watch-index.js', './data/watch/u08-fractions.json',
    ];
    for (const p of needed) ok(swText.includes(`'${p}'`), 'sw.js ASSETS missing ' + p);
    ok(swText.includes("'pmtrainer-media-v1'"), 'sw.js missing the media cache name');
    ok(watchAudioText.includes("'pmtrainer-media-v1'"), 'watch-audio.js media cache literal drifted');
    ok(!swText.includes("'pmtrainer-v4'"), 'CACHE_VERSION was not bumped');
    const assetsBlock = swText.slice(swText.indexOf('const ASSETS'), swText.indexOf('];'));
    ok(assetsBlock.length > 0 && !assetsBlock.includes('.mp3'),
      'MP3s must not be precached (they belong to the media cache)');
  });

  test('watch: markWatched and noteStep', () => {
    const s = defaultState();
    noteStep(s, 'u08-fractions', 5);
    eq(s.watched['u08-fractions'], { completedAt: null, lastStep: 5 });
    markWatched(s, 'u08-fractions', 17, '2026-07-23T10:00:00Z');
    eq(s.watched['u08-fractions'], { completedAt: '2026-07-23T10:00:00Z', lastStep: 17 });
    noteStep(s, 'u08-fractions', 3);
    eq(s.watched['u08-fractions'].completedAt, '2026-07-23T10:00:00Z', 'noteStep must not clear completion');
    eq(s.watched['u08-fractions'].lastStep, 3);
  });

  report();
}

function report() {
  const out = document.getElementById('out');
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  document.getElementById('summary').textContent =
    `TESTS: ${passed} passed, ${failed} failed (${results.length} total)`;
  document.getElementById('summary').className = failed ? 'fail' : 'pass';
  for (const r of results) {
    const div = document.createElement('div');
    div.className = r.ok ? 'pass' : 'fail';
    div.textContent = (r.ok ? '✓ ' : '✗ ') + r.name + (r.err ? ' — ' + r.err : '');
    out.append(div);
  }
  console.log(`TESTS: ${passed} passed, ${failed} failed`);
  results.filter((r) => !r.ok).forEach((r) => console.error('FAIL:', r.name, r.err));
  window.__testResults = { passed, failed, results };
}

run();
