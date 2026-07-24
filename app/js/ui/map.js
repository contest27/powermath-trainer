// The map screen: a pirate treasure map of the whole summer journey.
// All drawing lives in the pure builder (map-scene.js); this screen only
// wires state, callbacks, and the mount-time effects.

import { h, store, go, registerScreen, toast } from './core.js';
import { bottomNav, progressBar, confettiBurst } from './components.js';
import { topics, STRANDS } from '../content/index.js';
import { episodeForUnit } from '../content/watch-index.js';
import { buildTreasureMap } from './map-scene.js';

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
      if (status === 'done') {
        const n = st.stars[t.id] ?? 0;
        toast(`${t.emoji} ${t.shortTitle}  ${'★'.repeat(n)}${'☆'.repeat(Math.max(0, 3 - n))}`);
      } else if (status === 'current') {
        toast(`⛵ Next adventure: ${t.shortTitle}`);
      } else {
        toast(`🔒 ${t.shortTitle} — sail here later!`);
      }
    },
    onWatch: (ep) => go('watch', { episodeId: ep.id, from: 'map' }),
  });

  wrap.append(h('div', { class: 'card slim' },
    h('div', { class: 'row spread' },
      h('b', {}, '🏴‍☠️ Treasure hunt'),
      h('span', {}, `${doneCount}/${topics.length}`)),
    progressBar(doneCount, topics.length)));
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
