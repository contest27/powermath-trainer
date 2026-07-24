import { h, store, go, registerScreen } from './core.js';
import { bottomNav, starRow, bandDot } from './components.js';
import { topics, topicOrder, STRANDS } from '../content/index.js';
import { episodeForUnit } from '../content/watch-index.js';

registerScreen('map', () => {
  const st = store.state;
  const wrap = h('div', { class: 'screen' });
  wrap.append(h('h1', { class: 'page-title' }, '🗺️ My maths map'));

  const nextId = topicOrder.find((id) => !st.completed.includes(id));

  for (const [strandId, strand] of Object.entries(STRANDS)) {
    const inStrand = topics.filter((t) => t.strand === strandId);
    if (!inStrand.length) continue;
    const island = h('div', { class: 'card island' },
      h('h2', { class: 'island-title' }, strand.icon + ' ' + strand.title));
    for (const t of inStrand) {
      const completed = st.completed.includes(t.id);
      const isNext = t.id === nextId;
      const m = st.mastery[t.id];
      const ep = episodeForUnit(t.unit);
      island.append(h('div', { class: 'map-row' + (completed ? ' done' : isNext ? ' next' : ' locked') },
        h('span', { class: 'map-emoji' }, completed ? t.emoji : isNext ? '➡️' : '🔒'),
        h('span', { class: 'map-title' }, t.shortTitle),
        // Watch episodes stay tappable on every row of their unit — locked
        // topics included (previewing an explainer can never hurt).
        ep ? h('button', {
          class: 'map-watch',
          'aria-label': 'Watch: ' + ep.title,
          onclick: () => go('watch', { episodeId: ep.id, from: 'map' }),
        }, '▶') : null,
        completed ? starRow(st.stars[t.id] ?? 0, { size: 'sm' }) : h('span'),
        completed && m ? bandDot(m.score) : h('span'),
      ));
    }
    wrap.append(island);
  }
  wrap.append(bottomNav('map', go));
  return wrap;
});
