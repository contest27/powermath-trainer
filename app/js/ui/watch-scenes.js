// Scene renderer for Watch episodes. Builds real DOM SVGs (createElementNS —
// core.js h() cannot create SVG elements) in the visual style of
// content/vis.js, with class hooks so CSS can animate parts of a scene.
// Standalone by design: no imports, renderable on a detached DOM (tests).
//
// Animation model: renderScene() marks elements with entry classes
// (a-fade / a-pop / a-rise / a-draw / a-vanish, staggered via --i);
// mountScene() forces a reflow, then adds .run to the root, which lets the
// CSS transitions carry every marked element to its final state.

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEW = '0 0 320 240';

// Palette shared with content/vis.js — keep in sync (tested).
const PALETTE = {
  green: '#86efac',
  blue: '#7dd3fc',
  yellow: '#fcd34d',
  red: '#fca5a5',
  purple: '#c4b5fd',
};
const STROKE = '#334155';
const UNSHADED = '#f1f5f9';
const INK = '#0f172a';
const MUTED = '#64748b';
const ACCENT = '#0369a1'; // --brand-dark

export function colorFor(name) {
  return PALETTE[name] ?? PALETTE.green;
}

function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

// Stagger index -> transition delay (CSS: calc(var(--i) * 0.12s)).
function di(el, i) {
  el.style.setProperty('--i', String(i));
  return el;
}

function txt(x, y, str, { size = 16, fill = INK, weight = null, anchor = 'middle', cls = null } = {}) {
  return s('text', {
    x, y, 'text-anchor': anchor, 'font-size': size, fill,
    'font-weight': weight, class: cls,
  }, str);
}

// Stacked fraction centred at (x, y): numerator above, vinculum, denominator.
function fracText(x, y, n, d, size, cls = '') {
  const w = Math.max(String(n).length, String(d).length) * size * 0.3 + size * 0.16;
  return s('g', { class: `frac ${cls}`.trim() },
    txt(x, y - size * 0.22, n, { size: size * 0.92, weight: 700, cls: 'fr-n' }),
    s('line', { x1: x - w, y1: y, x2: x + w, y2: y, stroke: INK, 'stroke-width': Math.max(2, size * 0.06), class: 'fr-line' }),
    txt(x, y + size * 0.82, d, { size: size * 0.92, weight: 700, cls: 'fr-d' }),
  );
}

// One fraction bar in fracBar's geometry (34px cells, #334155 stroke).
// With splitFrom, base cells render at the coarser granularity and the new
// dividers overlay as .fb-div-new lines (they animate in on anim "split").
function buildBar(bar, x0, bw, y, h, anim, stagger) {
  const g = s('g', { class: 'fb-bar' });
  const baseD = bar.splitFrom ?? bar.d;
  const baseN = bar.splitFrom ? (bar.n * bar.splitFrom) / bar.d : bar.n;
  const cw = bw / baseD;
  const color = colorFor(bar.color);
  let shadedSeen = 0;
  for (let i = 0; i < baseD; i++) {
    const shaded = i < baseN;
    const cell = s('rect', {
      x: x0 + i * cw, y, width: cw, height: h,
      fill: shaded ? color : UNSHADED, stroke: STROKE,
      class: 'fb-cell' + (shaded ? ' shaded' : ''),
    });
    if (anim === 'shade' && shaded) di(cell, stagger + shadedSeen++), cell.classList.add('a-fade');
    if ((bar.highlight ?? []).includes(i)) cell.classList.add('fb-hl');
    g.append(cell);
  }
  if (bar.splitFrom) {
    const fineW = bw / bar.d;
    const every = bar.d / bar.splitFrom;
    let k = 0;
    for (let i = 1; i < bar.d; i++) {
      if (i % every === 0) continue; // divider already exists at the coarse cut
      const line = s('line', {
        x1: x0 + i * fineW, y1: y, x2: x0 + i * fineW, y2: y + h,
        stroke: STROKE, class: 'fb-div-new',
      });
      if (anim === 'split') di(line, stagger + 2 + k++), line.classList.add('a-fade');
      g.append(line);
    }
  }
  if (bar.label) {
    const [ln, ld] = String(bar.label).split('/');
    const lbl = ld != null
      ? fracText(x0 - 28, y + h / 2, ln, ld, 20, 'fb-label')
      : txt(x0 - 28, y + h / 2 + 6, bar.label, { size: 18, weight: 700, cls: 'fb-label' });
    g.append(lbl);
  }
  return g;
}

function fmt(v) {
  return String(Math.round(v * 1000) / 1000);
}

// ---------------- per-type builders

function sceneTitleCard(root, sp) {
  root.append(
    sp.emoji ? di(txt(160, 104, sp.emoji, { size: 56, cls: 'tc-emoji a-pop' }), 0) : null,
    di(txt(160, 156, sp.title, { size: 24, weight: 800, cls: 'tc-title a-rise' }), 2),
    sp.sub ? di(txt(160, 186, sp.sub, { size: 14, fill: MUTED, cls: 'tc-sub a-rise' }), 3) : null,
  );
}

function sceneFracBars(root, sp) {
  const anim = sp.anim ?? 'appear';
  const anyLabel = sp.bars.some((b) => b.label);
  const x0 = anyLabel ? 56 : 8;
  const bw = 320 - x0 - 8;
  const ys = sp.bars.length === 1 ? [103] : [70, 136];
  const wrap = s('g', { class: 'fb-wrap' });
  sp.bars.forEach((b, i) => wrap.append(buildBar(b, x0, bw, ys[i], 34, anim, i * 3)));
  if (anim === 'appear') { wrap.classList.add('a-pop'); di(wrap, 0); }
  root.append(wrap);
}

function arrowPath(x1, x2, yEnd, yCtrl, label, delay) {
  const g = s('g', { class: 'fn-arrows' });
  const path = s('path', {
    d: `M ${x1} ${yEnd} Q 160 ${yCtrl} ${x2} ${yEnd}`,
    fill: 'none', stroke: ACCENT, 'stroke-width': 2.5, class: 'fn-arrow a-draw',
  });
  // Arrowhead aligned with the curve's end tangent (P2 - control).
  const ang = Math.atan2(yEnd - yCtrl, x2 - 160);
  const head = s('path', {
    d: 'M 0 0 L -11 -5 L -11 5 Z', fill: ACCENT, class: 'fn-arrow a-draw',
    transform: `translate(${x2}, ${yEnd}) rotate(${(ang * 180) / Math.PI})`,
  });
  const lblY = yCtrl < yEnd ? yCtrl + 8 : yCtrl - 2;
  const lbl = txt(160, lblY, label, { size: 17, fill: ACCENT, weight: 800, cls: 'fn-alabel a-fade' });
  di(path, delay); di(head, delay + 1); di(lbl, delay + 2);
  g.append(path, head, lbl);
  return g;
}

function sceneFracNotation(root, sp) {
  const anim = sp.anim ?? 'appear';
  const two = sp.items.length === 2;
  const xs = two ? [92, 228] : [160];
  sp.items.forEach((it, i) => {
    const item = fracText(xs[i], 120, it.n, it.d, 46, 'fn-item');
    if (it.dim) item.setAttribute('opacity', '0.45');
    if (sp.emphasis === 'n' || sp.emphasis === 'both') item.querySelector('.fr-n').setAttribute('fill', ACCENT);
    if (sp.emphasis === 'd' || sp.emphasis === 'both') item.querySelector('.fr-d').setAttribute('fill', ACCENT);
    item.classList.add('a-pop');
    di(item, i * 2);
    if (anim === 'buildN') item.querySelector('.fr-n').classList.add('a-pop'), di(item.querySelector('.fr-n'), 5 + i);
    if (anim === 'buildD') item.querySelector('.fr-d').classList.add('a-pop'), di(item.querySelector('.fr-d'), 5 + i);
    root.append(item);
  });
  if (two && sp.joiner) {
    const j = txt(160, 134, sp.joiner, { size: 40, weight: 800, cls: 'fn-join a-pop' });
    di(j, anim === 'equals' ? 6 : 3);
    root.append(j);
  }
  if (sp.arrows) {
    const base = anim === 'arrows' ? 5 : 3;
    root.append(arrowPath(xs[0] + 36, xs[1] - 36, 62, 26, sp.arrows.top, base));
    root.append(arrowPath(xs[0] + 36, xs[1] - 36, 178, 214, sp.arrows.bottom, base + 2));
  }
}

function sceneNumberLine(root, sp) {
  const anim = sp.anim ?? 'appear';
  const x0 = 24, x1 = 296, yL = 140;
  const X = (v) => x0 + ((v - sp.min) / (sp.max - sp.min)) * (x1 - x0);
  const g = s('g', { class: 'nl-wrap' });
  g.append(s('line', { x1: x0, y1: yL, x2: x1, y2: yL, stroke: STROKE, 'stroke-width': 2.5 }));
  const step = sp.step ?? (sp.max - sp.min) / 4;
  for (let v = sp.min; v <= sp.max + 1e-9; v += step) {
    g.append(
      s('line', { x1: X(v), y1: yL - 8, x2: X(v), y2: yL + 8, stroke: STROKE, 'stroke-width': 1.5 }),
      txt(X(v), yL + 28, fmt(v), { size: 13 }),
    );
  }
  // Marks stack upwards when they share a spot (1/2 and 2/4 land together).
  const seenAt = {};
  (sp.marks ?? []).forEach((m, i) => {
    const lift = seenAt[m.v] ?? 0;
    seenAt[m.v] = lift + 1;
    const dot = s('g', { class: 'nl-mark' },
      lift === 0 ? s('circle', { cx: X(m.v), cy: yL, r: 7, fill: '#f87171', stroke: '#7f1d1d' }) : null,
      m.label ? (() => {
        const [ln, ld] = String(m.label).split('/');
        return ld != null
          ? fracText(X(m.v), yL - 34 - lift * 34, ln, ld, 16, 'nl-mlabel')
          : txt(X(m.v), yL - 28 - lift * 30, m.label, { size: 15, weight: 700, cls: 'nl-mlabel' });
      })() : null,
    );
    if (anim === 'mark') dot.classList.add('a-pop'), di(dot, 2 + i * 2);
    g.append(dot);
  });
  if (sp.pointer) {
    const px = X(sp.pointer.v);
    const p = s('path', {
      d: `M ${px} 108 l -9 -16 h 18 Z`, fill: ACCENT, class: 'nl-pointer',
    });
    if (anim === 'hop' && sp.hopFrom != null) {
      p.classList.add('hop');
      p.style.setProperty('--hop-dx', `${X(sp.hopFrom) - px}px`);
    } else {
      p.classList.add('a-pop');
      di(p, 2);
    }
    g.append(p);
  }
  if (anim === 'appear') { g.classList.add('a-fade'); di(g, 0); }
  root.append(g);
}

function sceneCompare(root, sp) {
  const anim = sp.anim ?? 'appear';
  const x0 = 56, bw = 320 - x0 - 8;
  const mk = (b, y, i) => {
    const bar = buildBar({ label: `${b.n}/${b.d}`, ...b }, x0, bw, y, 34, 'appear', 0);
    bar.classList.add('a-fade');
    di(bar, i);
    return bar;
  };
  root.append(mk(sp.left, 52, 0), mk(sp.right, 118, 1));
  if (anim === 'reveal') {
    root.append(
      txt(160, 216, '?', { size: 44, weight: 800, cls: 'cmp-q a-vanish' }),
      di(txt(160, 216, sp.symbol, { size: 44, weight: 800, fill: ACCENT, cls: 'cmp-final a-pop' }), 9),
    );
  } else {
    root.append(di(txt(160, 216, sp.symbol, { size: 44, weight: 800, cls: 'cmp-symbol a-pop' }), 3));
  }
}

const BUILDERS = {
  titleCard: sceneTitleCard,
  fracBars: sceneFracBars,
  fracNotation: sceneFracNotation,
  numberLine: sceneNumberLine,
  compare: sceneCompare,
};

// ---------------- public API

export function renderScene(spec) {
  const root = s('svg', {
    viewBox: VIEW,
    class: `scene scene-${spec.type}` + (spec.anim === 'none' ? ' run' : ''),
    role: 'img',
  });
  BUILDERS[spec.type](root, spec);
  return root;
}

// Swap the stage to a new scene and run its entry animations. The forced
// reflow (not requestAnimationFrame) guarantees entry states paint first even
// in non-compositing embedded panes.
export function mountScene(stage, spec) {
  const svg = renderScene(spec);
  stage.replaceChildren(svg);
  void stage.offsetWidth;
  svg.classList.add('run');
  return svg;
}
