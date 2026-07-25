// The map screen: a pirate treasure map of the whole summer journey.
// All drawing lives in the pure builder (map-scene.js); this screen only
// wires state, callbacks, and the mount-time effects.

import { h, store, go, registerScreen, toast } from './core.js';
import { bottomNav, progressBar, confettiBurst } from './components.js';
import { topics, STRANDS } from '../content/index.js';
import { episodeForUnit } from '../content/watch-index.js';
import { buildTreasureMap } from './map-scene.js';
import { stationAction } from './focus.js';
import { startFocusSession } from './session.js';

// Confirm sheet before a station launches practice — the map is a tall
// scrollable SVG, so a bare tap is too easy to trigger by accident, and the
// current station's action completes a topic.
function stationSheet(topic, status, mode) {
  const close = () => scrim.remove();
  const stars = store.state.stars[topic.id] ?? 0;
  const scrim = h('div', {
    class: 'sheet-scrim', role: 'dialog', 'aria-modal': 'true', tabindex: '-1',
    onclick: (e) => { if (e.target === scrim) close(); },
    onkeydown: (e) => { if (e.key === 'Escape') close(); },
  });
  const sheet = h('div', { class: 'card station-sheet' },
    h('div', { class: 'sheet-title' }, `${topic.emoji} ${topic.shortTitle}`),
    status === 'done'
      ? h('div', { class: 'sheet-stars' }, '★'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars)))
      : h('p', { class: 'muted center-t' }, 'Your next island — start the lesson!'),
    h('button', {
      class: 'btn primary wide big',
      onclick: () => { close(); startFocusSession(topic.id, mode); },
    }, status === 'current' ? '▶ Start' : '▶ Practise'),
    h('button', { class: 'btn subtle wide', onclick: close }, 'Not now'),
  );
  scrim.append(sheet);
  document.body.append(scrim);
  scrim.focus();
}

registerScreen('map', () => {
  const st = store.state;
  const wrap = h('div', { class: 'screen' });
  wrap.append(h('h1', { class: 'page-title' }, '🗺️ My maths map'));

  const { svg, currentEl, finaleEl, allDone, doneCount } = buildTreasureMap({
    topics,
    strands: STRANDS,
    state: st,
    episodeForUnit,
    onStation: (t, status) => {
      const action = stationAction(st, t, status);
      if (action.kind === 'toast') { toast(action.msg); return; }
      stationSheet(t, status, action.mode);
    },
    onWatch: (ep) => go('watch', { episodeId: ep.id, from: 'map' }),
  });

  wrap.append(h('div', { class: 'card slim' },
    h('div', { class: 'row spread' },
      h('b', {}, '🏴‍☠️ Treasure hunt'),
      h('span', {}, `${doneCount}/${topics.length}`)),
    progressBar(doneCount, topics.length),
    h('p', { class: 'muted center-t map-hint' }, 'Tap your ship or a gold coin to practise that topic.')));
  wrap.append(h('div', { class: 'card tmap-card' }, svg));
  wrap.append(bottomNav('map', go));

  // The screen tree is detached until rerender() attaches it — run the entry
  // animation, auto-scroll and celebration one tick after mounting.
  setTimeout(() => {
    if (!svg.isConnected) return;
    void svg.getBoundingClientRect();
    svg.classList.add('run');
    (currentEl ?? finaleEl).scrollIntoView({ block: 'center' });
    if (allDone) confettiBurst(wrap);
  }, 0);

  return wrap;
});
