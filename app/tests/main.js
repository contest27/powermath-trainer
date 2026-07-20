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
    };
  } catch (e) {
    results.push({ name: 'MODULE IMPORTS', ok: false, err: String(e) });
    report();
    return;
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

  test('session tiers: practice ramp is easy to hard', () => {
    eq(NEW_TOPIC_TIERS[0], 1);
    eq(NEW_TOPIC_TIERS[NEW_TOPIC_TIERS.length - 1], 3);
    ok(NEW_TOPIC_TIERS.every((t, i, a) => i === 0 || t >= a[i - 1]), 'ramp not monotone');
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
