import { h, store, go, toast, PRAISE, ENCOURAGE, registerScreen } from './core.js';
import {
  headerBar, speakerButton, stripForSpeech, numberPad, fractionPad, orderPicker,
  progressBar, starRow, confettiBurst,
} from './components.js';
import { planSession, NEW_TOPIC_TIERS } from '../engine/scheduler.js';
import {
  recordAttempt, completeTopic, rescheduleReviewed, finishSession, applyDiagnostic,
} from '../engine/progress.js';
import { checkAnswer, answerText } from '../engine/check.js';
import { dayKey } from '../engine/storage.js';
import { makeRng, seedFromString, pick } from '../engine/rng.js';
import { topics, topicOrder, topicById, diagnosticItems } from '../content/index.js';
import { askTutor } from '../qa/tutor.js';
import * as tts from '../tts.js';

// ---------------------------------------------------------------- session build

export function buildSession() {
  const today = dayKey();
  const rng = makeRng(seedFromString(today + '|' + store.state.completed.length));
  const plan = planSession(store.state, topicOrder, today, rng);
  const items = [];
  const seen = [];

  const gen = (topic, tier) => {
    let q = topic.gen(rng, tier);
    for (let i = 0; i < 4 && seen.includes(q.prompt); i++) q = topic.gen(rng, tier);
    seen.push(q.prompt);
    if (seen.length > 6) seen.shift();
    return q;
  };

  if (plan.kind === 'diagnostic') {
    for (const q of diagnosticItems(rng)) items.push({ q, topicId: null, strand: q.strand, part: 'diagnostic' });
  } else {
    if (plan.newTopic) {
      const t = topicById(plan.newTopic);
      for (const tier of NEW_TOPIC_TIERS) items.push({ q: gen(t, tier), topicId: t.id, part: 'practice' });
    }
    for (const r of plan.review) {
      items.push({ q: gen(topicById(r.topicId), r.tier), topicId: r.topicId, part: 'review' });
    }
  }
  return {
    day: today,
    kind: plan.kind,
    newTopic: plan.newTopic ?? null,
    phase: plan.kind === 'daily' && plan.newTopic ? 'explain' : 'items',
    items, idx: 0,
    results: [],
    diag: {},
    startedAt: Date.now(),
    segIdx: 0,
  };
}

export function startOrResume() {
  const today = dayKey();
  const s = store.state.activeSession;
  if (s && s.day === today && s.phase !== 'done') {
    go('session');
    return;
  }
  store.state.activeSession = buildSession();
  store.save();
  go('session');
}

function sess() { return store.state.activeSession; }

function persist() { store.save(); }

// ---------------------------------------------------------------- screen

registerScreen('session', () => {
  const s = sess();
  if (!s) { go('today'); return h('div'); }
  if (s.phase === 'explain') return explainView(s);
  if (s.phase === 'summary') return summaryView(s);
  return itemView(s);
});

// ------------------------------------------------------------- explanation view

function explainView(s) {
  const topic = topicById(s.newTopic);
  const wrap = h('div', { class: 'screen' });
  wrap.append(headerBar('New topic', { onBack: () => { tts.stop(); go('today'); } }));

  const card = h('div', { class: 'card lesson' });
  card.append(h('h1', { class: 'lesson-title' }, topic.title));
  card.append(h('p', { class: 'lesson-sub' }, 'Listen to each part. Tap 🔊 again any time you want to hear it again.'));

  topic.explanation.segments.forEach((seg, i) => {
    card.append(segmentEl(seg, i));
  });

  if (topic.example) {
    const ex = h('div', { class: 'example' }, h('h3', {}, 'Worked example'));
    if (topic.example.svg) ex.append(h('div', { class: 'vis', html: topic.example.svg }));
    topic.example.steps.forEach((st, i) => ex.append(h('p', { class: 'ex-step' },
      h('span', { class: 'ex-n' }, String(i + 1)), h('span', { html: st }), speakerButton(st, { small: true }))));
    card.append(ex);
  }

  card.append(qaBox(topic));
  wrap.append(card);
  wrap.append(h('div', { class: 'stickybar' },
    h('button', {
      class: 'btn primary wide big',
      onclick: () => { tts.stop(); s.phase = 'items'; persist(); go('session'); },
    }, "Let's practise! →")));
  return wrap;
}

function segmentEl(seg) {
  let showingAlt = false;
  const textEl = h('p', { class: 'seg-text', html: seg.text });
  const visEl = seg.svg ? h('div', { class: 'vis', html: seg.svg }) : null;
  const playBtn = h('button', { class: 'seg-play', 'aria-label': 'Play this part' }, '🔊');
  const altBtn = seg.alt
    ? h('button', { class: 'seg-alt' }, '✨ Say it differently')
    : null;
  const box = h('div', { class: 'segment' },
    h('div', { class: 'seg-row' }, playBtn, textEl),
    visEl,
    altBtn && h('div', { class: 'seg-altrow' }, altBtn),
  );
  const read = () => {
    const { rate, voiceURI } = store.state.settings;
    box.classList.add('playing');
    tts.speak(stripForSpeech(showingAlt ? seg.alt : seg.text), {
      rate, voiceURI, onend: () => box.classList.remove('playing'),
    });
  };
  playBtn.addEventListener('click', read);
  altBtn?.addEventListener('click', () => {
    showingAlt = !showingAlt;
    textEl.innerHTML = showingAlt ? seg.alt : seg.text;
    altBtn.textContent = showingAlt ? '↩︎ Back to first version' : '✨ Say it differently';
    read();
  });
  return box;
}

// --------------------------------------------------------------------- Q&A box

function qaBox(topic) {
  const box = h('div', { class: 'qabox' }, h('h3', {}, 'Questions?'));
  const thread = h('div', { class: 'qa-thread' });

  const addBubble = (who, html) => {
    thread.append(h('div', { class: 'bubble ' + who },
      h('div', { html }), who === 'tutor' ? speakerButton(html, { small: true }) : null));
    thread.scrollTop = thread.scrollHeight;
  };

  const chips = h('div', { class: 'chips' },
    (topic.faqs ?? []).map((f) =>
      h('button', {
        class: 'chip',
        onclick: () => { addBubble('kid', f.q); addBubble('tutor', f.a); logQa(topic, f.q, f.a, 'faq'); },
      }, f.q)));
  box.append(chips, thread);

  if (store.state.settings.apiKey) {
    const input = h('input', { class: 'qa-input', placeholder: 'Type your own question…', maxlength: '200' });
    const askBtn = h('button', { class: 'btn primary' }, 'Ask');
    const ask = async () => {
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      addBubble('kid', escapeHtml(q));
      const wait = h('div', { class: 'bubble tutor thinking' }, 'Thinking…');
      thread.append(wait);
      askBtn.disabled = true;
      try {
        const a = await askTutor({ question: q, topic, apiKey: store.state.settings.apiKey });
        wait.remove();
        addBubble('tutor', escapeHtml(a));
        logQa(topic, q, a, 'ai');
      } catch (e) {
        wait.remove();
        addBubble('tutor', escapeHtml(friendlyTutorError(e)));
      }
      askBtn.disabled = false;
    };
    askBtn.addEventListener('click', ask);
    input.addEventListener('keydown', (e) => e.key === 'Enter' && ask());
    box.append(h('div', { class: 'qa-inputrow' }, input, askBtn));
  } else {
    box.append(h('p', { class: 'qa-note' }, 'Tap a question above — or ask Mum or Dad!'));
  }
  return box;
}

function logQa(topic, q, a, source) {
  store.state.qaLog.push({ day: dayKey(), topicId: topic.id, q, a, source });
  store.save();
}

function friendlyTutorError(e) {
  if (e && e.status === 401) return 'The tutor key is not working — ask a parent to check it in the Parent corner.';
  if (e && e.offline) return 'I need the internet to answer that one. Try a question from the list above!';
  return 'Hmm, I could not answer just now. Try again in a moment, or ask a parent.';
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ------------------------------------------------------------------- item view

const PART_LABEL = { diagnostic: 'Check-up', practice: 'Practise', review: 'Quick review' };

function itemView(s) {
  const item = s.items[s.idx];
  if (!item) return endItems(s);
  const q = item.q;
  const wrap = h('div', { class: 'screen' });
  wrap.append(headerBar(PART_LABEL[item.part], {
    onBack: () => { tts.stop(); go('today'); },
    right: h('span', { class: 'count' }, `${s.idx + 1}/${s.items.length}`),
  }));
  wrap.append(progressBar(s.idx, s.items.length));

  if (item.part === 'review') {
    wrap.append(h('div', { class: 'review-tag' }, '🔁 ' + topicById(item.topicId).shortTitle));
  }

  const card = h('div', { class: 'card question' });
  const promptRow = h('div', { class: 'prompt-row' },
    h('div', { class: 'prompt', html: q.prompt }), speakerButton(q.prompt, { small: true }));
  card.append(promptRow);
  if (q.svg) card.append(h('div', { class: 'vis', html: q.svg }));

  const state = { tries: 0, resolved: false };
  const feedback = h('div', { class: 'feedback' });
  card.append(feedback);

  const submit = (input) => {
    if (state.resolved) return;
    const { ok } = checkAnswer(q, input);
    if (ok) return resolve(true);
    state.tries += 1;
    if (item.part === 'diagnostic' || state.tries >= 2) return resolve(false);
    // one retry with a hint
    feedback.replaceChildren(h('div', { class: 'fb try' },
      h('div', { class: 'fb-head' }, pick(makeRng(Date.now() >>> 0), ENCOURAGE)),
      q.hint ? h('div', { class: 'fb-hint', html: q.hint }) : h('div', { class: 'fb-hint' }, 'Take another look and try again.'),
    ));
  };

  const resolve = (ok) => {
    state.resolved = true;
    const firstTry = ok && state.tries === 0;
    recordResult(s, item, firstTry);
    inputHost.classList.add('locked');
    if (ok) {
      feedback.replaceChildren(h('div', { class: 'fb good' },
        h('div', { class: 'fb-head' }, '✅ ' + pick(makeRng((Date.now() % 100000) >>> 0), PRAISE)),
        state.tries > 0 ? h('div', { class: 'fb-hint' }, 'Second try counts too — well done for sticking with it!') : null,
      ));
      setTimeout(next, firstTry ? 900 : 1400);
    } else if (item.part === 'diagnostic') {
      feedback.replaceChildren(h('div', { class: 'fb neutral' },
        h('div', {}, 'Answer: ', h('b', { html: answerText(q) }))));
      setTimeout(next, 1300);
    } else {
      feedback.replaceChildren(h('div', { class: 'fb bad' },
        h('div', { class: 'fb-head' }, 'The answer is ', h('b', { html: answerText(q) })),
        q.explain ? h('div', { class: 'fb-hint', html: q.explain }) : null,
        h('button', { class: 'btn primary', onclick: next }, 'Got it →'),
      ));
    }
  };

  const next = () => { tts.stop(); s.idx += 1; persist(); go('session'); };

  const inputHost = h('div', { class: 'input-host' }, inputControl(q, submit));
  card.append(inputHost);
  wrap.append(card);
  return wrap;
}

function inputControl(q, submit) {
  switch (q.kind) {
    case 'num':
      return h('div', {},
        q.unit ? h('div', { class: 'unit-note' }, 'Answer in ', h('b', {}, q.unit)) : null,
        numberPad({ allowMinus: !!q.allowMinus || q.answer < 0, allowDecimal: !Number.isInteger(q.answer) || !!q.allowDecimal, onSubmit: submit }));
    case 'mc':
      return h('div', { class: 'options' },
        q.options.map((opt, i) =>
          h('button', { class: 'opt', html: String(opt), onclick: (e) => {
            e.currentTarget.classList.add('picked');
            submit(i);
          } })));
    case 'tf':
      return h('div', { class: 'options tfrow' },
        h('button', { class: 'opt tf', onclick: () => submit(true) }, '✓ True'),
        h('button', { class: 'opt tf', onclick: () => submit(false) }, '✗ False'));
    case 'frac':
      return fractionPad({ onSubmit: submit });
    case 'order':
      return orderPicker(q, { onSubmit: submit });
    default:
      return h('div', {}, 'Unknown question type');
  }
}

function recordResult(s, item, firstTryOk) {
  s.results.push({ part: item.part, topicId: item.topicId, ok: firstTryOk });
  if (item.part === 'diagnostic') {
    const d = (s.diag[item.strand] ??= { correct: 0, total: 0 });
    d.total += 1;
    if (firstTryOk) d.correct += 1;
  } else {
    recordAttempt(store.state, item.topicId, item.q.tier, firstTryOk, s.day);
  }
  persist();
}

// --------------------------------------------------------------------- summary

function endItems(s) {
  if (s.phase !== 'summary') {
    // Apply end-of-session effects exactly once.
    const practice = s.results.filter((r) => r.part === 'practice');
    const review = s.results.filter((r) => r.part === 'review');
    if (s.kind === 'diagnostic') {
      applyDiagnostic(store.state, s.diag, topics, s.day);
      s.summary = { kind: 'diagnostic' };
    } else {
      let stars = null;
      if (s.newTopic && practice.length) {
        stars = completeTopic(store.state, s.newTopic, practice.filter((r) => r.ok).length, practice.length, s.day);
      }
      const reviewedIds = [...new Set(review.map((r) => r.topicId))];
      rescheduleReviewed(store.state, reviewedIds, s.day);
      s.summary = {
        kind: s.kind, stars,
        practice: { ok: practice.filter((r) => r.ok).length, total: practice.length },
        review: { ok: review.filter((r) => r.ok).length, total: review.length },
      };
    }
    const minutes = Math.max(1, Math.round((Date.now() - s.startedAt) / 60000));
    const all = s.results;
    finishSession(store.state, {
      kind: s.kind, topicId: s.newTopic,
      total: all.length, correct: all.filter((r) => r.ok).length, minutes,
    }, s.day);
    s.phase = 'summary';
    store.state.activeSession = s; // finishSession cleared it; keep for the summary screen
    persist();
  }
  return summaryView(s);
}

function summaryView(s) {
  const wrap = h('div', { class: 'screen center' });
  const card = h('div', { class: 'card summary' });
  const name = store.state.settings.name;

  if (s.summary.kind === 'diagnostic') {
    card.append(
      h('div', { class: 'big-emoji' }, '🎯'),
      h('h1', {}, 'All warmed up' + (name ? ', ' + name : '') + '!'),
      h('p', {}, 'Now I know what to practise with you. Tomorrow we start properly — one topic a day.'),
    );
  } else {
    const t = s.newTopic ? topicById(s.newTopic) : null;
    card.append(h('div', { class: 'big-emoji' }, '🏅'), h('h1', {}, 'Session done!'));
    if (t && s.summary.stars != null) {
      card.append(h('p', { class: 'sum-line' }, t.title), starRow(s.summary.stars, { size: 'lg' }));
    }
    if (s.summary.practice?.total) {
      card.append(h('p', { class: 'sum-line' }, `Practise: ${s.summary.practice.ok} of ${s.summary.practice.total} first try`));
    }
    if (s.summary.review?.total) {
      card.append(h('p', { class: 'sum-line' }, `Review: ${s.summary.review.ok} of ${s.summary.review.total}`));
    }
    card.append(h('p', { class: 'sum-streak' }, `🔥 Streak: ${store.state.streak.count} day${store.state.streak.count === 1 ? '' : 's'}`));
  }
  card.append(h('button', {
    class: 'btn primary wide big',
    onclick: () => { store.state.activeSession = null; store.save(); go('today'); },
  }, 'Finish'));
  wrap.append(card);
  confettiBurst(wrap);
  return wrap;
}
