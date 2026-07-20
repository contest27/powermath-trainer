import { h, store, go, toast, registerScreen, rerender } from './core.js';
import { headerBar, bandDot, starRow, numberPad } from './components.js';
import { topics, topicById } from '../content/index.js';
import { exportJSON, parseImport, dayKey, wipe } from '../engine/storage.js';
import { bandOf } from '../engine/mastery.js';
import { testKey } from '../qa/tutor.js';
import * as tts from '../tts.js';

// ------------------------------------------------------------------ gate

registerScreen('parentgate', () => {
  const a = 12 + Math.floor(Math.random() * 15);
  const b = 13 + Math.floor(Math.random() * 15);
  const wrap = h('div', { class: 'screen' });
  wrap.append(headerBar('Parent corner', { onBack: () => go('today') }));
  wrap.append(h('div', { class: 'card' },
    h('h2', {}, 'Grown-ups only 🔐'),
    h('p', {}, `To continue, work out: ${a} + ${b}`),
    numberPad({
      onSubmit: (v) => {
        if (Number(v) === a + b) go('parent');
        else { toast('Not quite — try again'); rerender(); }
      },
    })));
  return wrap;
});

// ------------------------------------------------------------------ main

registerScreen('parent', () => {
  const st = store.state;
  const wrap = h('div', { class: 'screen parent' });
  wrap.append(headerBar('Parent corner', { onBack: () => go('today') }));

  // ---- overview ----
  const ov = section('Progress overview');
  const totalSessions = st.history.length;
  const minutes = st.history.reduce((a, s) => a + (s.minutes || 0), 0);
  ov.append(h('p', { class: 'muted' },
    `${st.completed.length}/${topics.length} topics · ${totalSessions} sessions · ~${minutes} min total · streak ${st.streak.count}`));
  const table = h('div', { class: 'ptable' });
  table.append(h('div', { class: 'prow phead' },
    h('span', {}, 'Topic'), h('span', {}, 'Level'), h('span', {}, 'Stars'), h('span', {}, 'Next review')));
  for (const t of topics) {
    const m = st.mastery[t.id];
    const done = st.completed.includes(t.id);
    table.append(h('div', { class: 'prow' + (done ? '' : ' dim') },
      h('span', { class: 'pt-title' }, t.shortTitle),
      h('span', {}, m ? [bandDot(m.score), ' ', String(m.score)] : '—'),
      done ? starRow(st.stars[t.id] ?? 0, { size: 'sm' }) : h('span', {}, '—'),
      h('span', {}, done && m?.due ? m.due.slice(5) : '—'),
    ));
  }
  ov.append(table);
  wrap.append(ov);

  // ---- history ----
  const hist = section('Recent sessions');
  const items = st.history.slice(-14).reverse();
  if (!items.length) hist.append(h('p', { class: 'muted' }, 'No sessions yet.'));
  for (const s of items) {
    const label = s.kind === 'diagnostic' ? 'Warm-up check'
      : s.topicId ? (topicById(s.topicId)?.shortTitle ?? s.topicId) : 'Review';
    hist.append(h('div', { class: 'hrow' },
      h('span', {}, s.day), h('span', { class: 'grow' }, label),
      h('span', {}, `${s.correct}/${s.total}`), h('span', { class: 'muted' }, `${s.minutes}m`)));
  }
  wrap.append(hist);

  // ---- AI tutor ----
  const ai = section('AI tutor (optional)');
  ai.append(h('p', { class: 'muted' },
    'With an Anthropic API key, he can type his own questions during explanations and Claude answers as a tutor. ',
    'Cost is a few cents per month at this usage. Create a key at console.anthropic.com. ',
    'The key is stored only on this iPad and is never included in backups.'));
  const keyIn = h('input', {
    class: 'text-in', type: 'password', placeholder: 'sk-ant-…',
    value: st.settings.apiKey || '', autocomplete: 'off',
  });
  const status = h('span', { class: 'muted' }, st.settings.apiKey ? 'Key saved.' : 'No key set — question chips still work offline.');
  const saveBtn = h('button', {
    class: 'btn', onclick: () => {
      st.settings.apiKey = keyIn.value.trim();
      store.save();
      status.textContent = st.settings.apiKey ? 'Key saved.' : 'Key removed.';
      toast('Saved');
    },
  }, 'Save key');
  const testBtn = h('button', {
    class: 'btn subtle', onclick: async () => {
      const k = keyIn.value.trim();
      if (!k) return toast('Enter a key first');
      status.textContent = 'Testing…';
      try { await testKey(k); status.textContent = '✅ Key works.'; }
      catch (e) { status.textContent = e.status === 401 ? '❌ Key rejected (401).' : '❌ Could not reach the API.'; }
    },
  }, 'Test');
  ai.append(h('div', { class: 'row gap' }, keyIn), h('div', { class: 'row gap' }, saveBtn, testBtn, status));

  const log = st.qaLog.slice(-20).reverse();
  if (log.length) {
    ai.append(h('h3', { class: 'sub' }, 'Recent questions'));
    for (const e of log) {
      ai.append(h('div', { class: 'qlog' },
        h('div', { class: 'qlog-q' }, `${e.day} · ${e.source === 'ai' ? '🤖' : '💬'} ${e.q}`),
        h('div', { class: 'qlog-a muted' }, e.a)));
    }
  }
  wrap.append(ai);

  // ---- child & voice ----
  const pers = section('Child & voice');
  const nameIn = h('input', { class: 'text-in', placeholder: "Child's first name", value: st.settings.name || '' });
  pers.append(h('div', { class: 'row gap' }, nameIn,
    h('button', { class: 'btn', onclick: () => { st.settings.name = nameIn.value.trim(); store.save(); toast('Saved'); } }, 'Save')));
  const voices = tts.englishVoices();
  const sel = h('select', { class: 'text-in' },
    h('option', { value: '' }, 'Automatic (British English preferred)'),
    voices.map((v) => h('option', { value: v.voiceURI, selected: st.settings.voiceURI === v.voiceURI }, `${v.name} (${v.lang})`)));
  sel.addEventListener('change', () => { st.settings.voiceURI = sel.value || null; store.save(); });
  const rate = h('input', { type: 'range', min: '0.7', max: '1.15', step: '0.05', value: String(st.settings.rate) });
  rate.addEventListener('change', () => { st.settings.rate = Number(rate.value); store.save(); });
  pers.append(h('label', { class: 'lab' }, 'Voice'), sel,
    h('label', { class: 'lab' }, 'Speaking speed'), rate,
    h('button', {
      class: 'btn subtle',
      onclick: () => tts.speak('Hello! Three times four makes twelve.', { rate: st.settings.rate, voiceURI: st.settings.voiceURI }),
    }, '▶ Test voice'));
  wrap.append(pers);

  // ---- backup ----
  const bk = section('Backup');
  bk.append(h('p', { class: 'muted' },
    'Progress lives on this device. Export a backup file every week or two (it can be AirDropped or saved to Files). ',
    st.lastExport ? `Last export: ${st.lastExport.slice(0, 10)}.` : 'No export yet.'));
  const exportBtn = h('button', {
    class: 'btn', onclick: () => {
      st.lastExport = new Date().toISOString();
      store.save();
      const blob = new Blob([exportJSON(st)], { type: 'application/json' });
      const a = h('a', { href: URL.createObjectURL(blob), download: `powermath-backup-${dayKey()}.json` });
      document.body.append(a); a.click(); a.remove();
      toast('Backup exported');
      rerender();
    },
  }, '⬇ Export backup');
  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' } });
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files[0];
    if (!f) return;
    try {
      const imported = parseImport(await f.text());
      imported.settings.apiKey = st.settings.apiKey; // keep the device's key
      store.state = imported;
      store.save();
      toast('Backup restored');
      go('parent');
    } catch (e) { toast(e.message); }
  });
  const importBtn = h('button', { class: 'btn subtle', onclick: () => fileIn.click() }, '⬆ Restore from backup');
  bk.append(h('div', { class: 'row gap' }, exportBtn, importBtn, fileIn));
  wrap.append(bk);

  // ---- danger ----
  const dz = section('Start over');
  const resetBtn = h('button', {
    class: 'btn danger', onclick: () => {
      if (confirm('Delete ALL progress on this device? Export a backup first if unsure.')) {
        wipe();
        location.reload();
      }
    },
  }, 'Reset everything');
  dz.append(resetBtn);
  wrap.append(dz);

  return wrap;
});

function section(title) {
  return h('div', { class: 'card psec' }, h('h2', { class: 'psec-title' }, title));
}
