// The 'watch' screen: a video-like player for Watch episodes. Auto-advances
// through narrated steps (audio 'ended' → next scene), but stays tappable:
// pause, step back/forward, rewatch. Enrichment only — no mastery coupling.

import { h, store, go, registerScreen, toast, PRAISE } from './core.js';
import { confettiBurst } from './components.js';
import { episodeById, DATA_BASE } from '../content/watch-index.js';
import {
  validateEpisode, seqInit, seqPlay, seqPause, seqNext, seqPrev, seqRestart,
  markWatched, noteStep,
} from '../engine/watch.js';
import { mountScene } from './watch-scenes.js';
import { prefetchEpisode, createPlayer } from './watch-audio.js';

const GAP_MS = 350; // breathing room between a snippet's end and the next step

registerScreen('watch', (params) => {
  const reg = episodeById(params?.episodeId);
  const from = params?.from === 'map' ? 'map' : 'today';
  const wrap = h('div', { class: 'screen watch' });

  if (!reg) {
    wrap.append(h('div', { class: 'card' },
      h('p', {}, 'This episode does not exist.'),
      h('button', { class: 'btn subtle', onclick: () => go(from) }, 'Back')));
    return wrap;
  }

  let ep = null;
  let pre = null;
  let st = null;
  let gapTimer = null;
  let closed = false;
  let completed = false;
  const player = createPlayer();

  // ---- top bar
  const countEl = h('span', { class: 'watch-count' });
  wrap.append(h('div', { class: 'watch-top' },
    h('button', { class: 'watch-close', 'aria-label': 'Close', onclick: exit }, '✕'),
    h('div', { class: 'watch-title' }, reg.title),
    countEl,
  ));
  const body = h('div', { class: 'watch-body' });
  wrap.append(body);

  // ---- player chrome (built once the episode is ready)
  let stageEl, speakerEl, textEl, dotsEl, prevBtn, mainBtn, nextBtn;

  function buildChrome() {
    stageEl = h('div', { class: 'watch-stage' });
    speakerEl = h('span', { class: 'watch-speaker' });
    textEl = h('p', { class: 'watch-text' });
    dotsEl = h('div', { class: 'watch-dots' }, ep.steps.map(() => h('i')));
    prevBtn = h('button', { class: 'watch-btn', 'aria-label': 'Back one step', onclick: () => skip(-1) }, '‹');
    mainBtn = h('button', { class: 'watch-btn main', 'aria-label': 'Play or pause', onclick: mainTap }, '▶');
    nextBtn = h('button', { class: 'watch-btn', 'aria-label': 'Forward one step', onclick: () => skip(1) }, '›');
    body.replaceChildren(
      stageEl,
      h('div', { class: 'watch-caption' }, speakerEl, textEl),
      h('div', { class: 'watch-controls' }, prevBtn, mainBtn, nextBtn),
      dotsEl,
    );
  }

  function syncMain() {
    mainBtn.textContent = st.status === 'playing' ? '⏸' : '▶';
  }

  function renderStep() {
    const step = ep.steps[st.idx];
    mountScene(stageEl, step.scene);
    speakerEl.textContent = ep.speakers[step.speaker] ?? step.speaker;
    speakerEl.className = 'watch-speaker sp-' + step.speaker;
    textEl.textContent = step.text;
    countEl.textContent = `${st.idx + 1} / ${st.count}`;
    dotsEl.querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i <= st.idx));
    prevBtn.disabled = st.idx === 0;
    syncMain();
  }

  function playCurrent() {
    player.load(pre.urls[st.idx]);
    player.play().catch(pauseFallback);
  }

  function pauseFallback() {
    st = seqPause(st);
    syncMain();
    toast('Tap ▶ to continue.');
  }

  function mainTap() {
    clearTimeout(gapTimer);
    if (st.status === 'playing') {
      st = seqPause(st);
      player.pause();
      syncMain();
      return;
    }
    const wasIdle = st.status === 'idle';
    st = seqPlay(st);
    if (wasIdle) {
      renderStep();       // replay step-0 entry animation in sync with the audio
      player.load(pre.urls[0]);
    }
    player.play().catch(pauseFallback);
    syncMain();
  }

  function advance() {
    st = seqNext(st);
    if (st.status === 'ended') { finish(); return; }
    renderStep();
    playCurrent();
  }

  function skip(dir) {
    clearTimeout(gapTimer);
    if (!st || st.status === 'idle') return;
    const wasPlaying = st.status === 'playing';
    st = dir > 0 ? seqNext(st) : seqPrev(st);
    if (st.status === 'ended') { finish(); return; }
    renderStep();
    if (wasPlaying) playCurrent();
    else player.load(pre.urls[st.idx]);
  }

  player.onEnded(() => {
    if (st.status !== 'playing') return;
    gapTimer = setTimeout(advance, GAP_MS);
  });
  player.onError(() => {
    if (closed) return;
    st = seqPause(st);
    syncMain();
    toast('Audio hiccup — tap ▶ to continue.');
  });

  // ---- end screen
  function finish() {
    completed = true;
    player.pause();
    markWatched(store.state, ep.id, st.count - 1, new Date().toISOString());
    store.save();
    const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
    body.replaceChildren(h('div', { class: 'card watch-end' },
      h('div', { class: 'watch-end-emoji' }, '⭐'),
      h('h2', {}, praise),
      h('p', { class: 'muted' }, `You watched the whole story of ${ep.title.toLowerCase()}.`),
      h('button', { class: 'btn primary wide big', onclick: again }, 'Watch again ▶'),
      h('button', { class: 'btn subtle wide', onclick: exit }, 'Done'),
    ));
    confettiBurst(wrap);
  }

  function again() {
    buildChrome();
    st = seqRestart(st);
    renderStep();
    playCurrent();
  }

  function exit() {
    closed = true;
    clearTimeout(gapTimer);
    player.dispose();
    if (pre) pre.revoke();
    if (ep && !completed && st && st.status !== 'idle') {
      noteStep(store.state, ep.id, st.idx);
      store.save();
    }
    go(from);
  }

  // ---- boot
  let loadFill = null;
  function showLoading() {
    loadFill = h('div', { class: 'progress-fill', style: { width: '4%' } });
    body.replaceChildren(h('div', { class: 'card watch-load' },
      h('p', {}, 'Loading the episode…'),
      h('div', { class: 'progress' }, loadFill)));
  }

  async function boot() {
    showLoading();
    try {
      const res = await fetch(DATA_BASE + reg.file);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      ep = await res.json();
      const v = validateEpisode(ep);
      if (!v.ok) throw new Error('invalid episode: ' + v.errors[0]);
      pre = await prefetchEpisode(ep, DATA_BASE, {
        onProgress: (done, total) => { if (loadFill) loadFill.style.width = Math.round((done / total) * 100) + '%'; },
      });
      if (closed) { pre.revoke(); return; }
      st = seqInit(ep.steps.length);
      buildChrome();
      renderStep();
    } catch (e) {
      if (closed) return;
      console.error('watch: load failed', e);
      body.replaceChildren(h('div', { class: 'card watch-load' },
        h('p', {}, 'Could not load the episode. Check the connection and try again.'),
        h('button', { class: 'btn subtle', onclick: exit }, 'Back')));
    }
  }

  boot();
  return wrap;
});
