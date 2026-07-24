// Watch episodes: pure sequencer, episode/scene validation, progress marks.
// No DOM, no imports — the player UI (ui/watch.js) owns all side effects.
// Watch is enrichment only: nothing here touches mastery or the scheduler.

export const SCENE_TYPES = ['titleCard', 'fracBars', 'fracNotation', 'numberLine', 'compare'];

const ANIMS = {
  titleCard: ['appear'],
  fracBars: ['appear', 'shade', 'split', 'highlight', 'none'],
  fracNotation: ['appear', 'buildN', 'buildD', 'equals', 'arrows'],
  numberLine: ['appear', 'mark', 'hop'],
  compare: ['appear', 'reveal'],
};

const JOINERS = ['=', '→', '≠', '?'];
const COMPARE_SYMBOLS = ['=', '?', '≠'];

// ---------------- sequencer (status: idle | playing | paused | ended)

export function seqInit(count) {
  return { count, idx: 0, status: 'idle' };
}

export function seqPlay(s) {
  return s.status === 'ended' ? s : { ...s, status: 'playing' };
}

export function seqPause(s) {
  return s.status === 'playing' ? { ...s, status: 'paused' } : s;
}

// Advancing past the last step ends the episode; idx never exceeds count-1.
export function seqNext(s) {
  if (s.status === 'ended') return s;
  if (s.idx >= s.count - 1) return { ...s, status: 'ended' };
  return { ...s, idx: s.idx + 1 };
}

// Stepping back from the end screen lands on the last step, paused.
export function seqPrev(s) {
  if (s.status === 'ended') return { ...s, idx: s.count - 1, status: 'paused' };
  return { ...s, idx: Math.max(0, s.idx - 1) };
}

export function seqRestart(s) {
  return { ...s, idx: 0, status: 'playing' };
}

// ---------------- scene validation

function isInt(v) { return Number.isInteger(v); }

function checkFrac(b, where, errs) {
  if (!b || typeof b !== 'object') { errs.push(`${where}: missing`); return; }
  if (!isInt(b.d) || b.d < 1) errs.push(`${where}: d must be a positive integer`);
  if (!isInt(b.n) || b.n < 0 || (isInt(b.d) && b.n > b.d)) errs.push(`${where}: need 0 <= n <= d`);
}

function checkBarExtras(b, where, errs) {
  if (b.splitFrom != null) {
    if (!isInt(b.splitFrom) || b.splitFrom < 1 || b.splitFrom >= b.d || b.d % b.splitFrom !== 0) {
      errs.push(`${where}: splitFrom must divide d and be smaller than it`);
    } else if ((b.n * b.splitFrom) % b.d !== 0) {
      // The renderer draws splitFrom base cells + overlay dividers, so the
      // shaded amount must land on a whole base cell (e.g. 2/4 from 2, not 3/4).
      errs.push(`${where}: n/d does not align with splitFrom cells`);
    }
  }
  if (b.highlight != null) {
    if (!Array.isArray(b.highlight) || !b.highlight.every((i) => isInt(i) && i >= 0 && i < b.d)) {
      errs.push(`${where}: highlight indices must be cell indices 0..d-1`);
    }
  }
}

function inRange(v, min, max) { return typeof v === 'number' && v >= min && v <= max; }

export function validateScene(scene) {
  const errs = [];
  if (!scene || typeof scene !== 'object') return ['scene missing'];
  if (!SCENE_TYPES.includes(scene.type)) return [`unknown scene type "${scene.type}"`];
  if (scene.anim != null && !ANIMS[scene.type].includes(scene.anim)) {
    errs.push(`anim "${scene.anim}" not allowed for ${scene.type}`);
  }

  if (scene.type === 'titleCard') {
    if (typeof scene.title !== 'string' || !scene.title.trim()) errs.push('titleCard needs a title');
  }

  if (scene.type === 'fracBars') {
    if (!Array.isArray(scene.bars) || scene.bars.length < 1 || scene.bars.length > 2) {
      errs.push('fracBars needs 1 or 2 bars');
    } else {
      scene.bars.forEach((b, i) => { checkFrac(b, `bar ${i}`, errs); checkBarExtras(b, `bar ${i}`, errs); });
      if (scene.anim === 'split' && !scene.bars.some((b) => b.splitFrom != null)) {
        errs.push('anim "split" needs a bar with splitFrom');
      }
      if (scene.anim === 'highlight' && !scene.bars.some((b) => b.highlight)) {
        errs.push('anim "highlight" needs a bar with highlight');
      }
    }
  }

  if (scene.type === 'fracNotation') {
    if (!Array.isArray(scene.items) || scene.items.length < 1 || scene.items.length > 2) {
      errs.push('fracNotation needs 1 or 2 items');
    } else {
      scene.items.forEach((it, i) => {
        if (!it || it.n == null || it.d == null) errs.push(`item ${i}: needs n and d`);
      });
      if (scene.joiner != null) {
        if (!JOINERS.includes(scene.joiner)) errs.push(`joiner "${scene.joiner}" unknown`);
        if (scene.items.length < 2) errs.push('joiner needs two items');
      }
      if (scene.arrows != null) {
        if (scene.items.length < 2) errs.push('arrows need two items');
        if (typeof scene.arrows.top !== 'string' || typeof scene.arrows.bottom !== 'string') {
          errs.push('arrows need top and bottom labels');
        }
      }
      if (scene.emphasis != null && !['n', 'd', 'both'].includes(scene.emphasis)) {
        errs.push(`emphasis "${scene.emphasis}" unknown`);
      }
      if (scene.anim === 'arrows' && scene.arrows == null) errs.push('anim "arrows" needs arrows');
    }
  }

  if (scene.type === 'numberLine') {
    if (typeof scene.min !== 'number' || typeof scene.max !== 'number' || scene.max <= scene.min) {
      errs.push('numberLine needs max > min');
    } else {
      if (scene.step != null && !(scene.step > 0)) errs.push('step must be positive');
      (scene.marks ?? []).forEach((m, i) => {
        if (!m || !inRange(m.v, scene.min, scene.max)) errs.push(`mark ${i}: v out of range`);
      });
      if (scene.pointer != null && !inRange(scene.pointer.v, scene.min, scene.max)) {
        errs.push('pointer v out of range');
      }
      if (scene.hopFrom != null) {
        if (!inRange(scene.hopFrom, scene.min, scene.max)) errs.push('hopFrom out of range');
        if (scene.pointer == null) errs.push('hopFrom needs a pointer');
      }
      if (scene.anim === 'hop' && (scene.pointer == null || scene.hopFrom == null)) {
        errs.push('anim "hop" needs pointer and hopFrom');
      }
    }
  }

  if (scene.type === 'compare') {
    checkFrac(scene.left, 'left', errs);
    checkFrac(scene.right, 'right', errs);
    if (!COMPARE_SYMBOLS.includes(scene.symbol)) errs.push(`symbol "${scene.symbol}" unknown`);
    if (scene.anim === 'reveal' && scene.symbol === '?') errs.push('anim "reveal" needs the final symbol, not "?"');
  }

  return errs;
}

// ---------------- episode validation (mirrored by tools/narrate.py --check)

export function validateEpisode(ep) {
  const errs = [];
  if (!ep || typeof ep !== 'object') return { ok: false, errors: ['episode missing'] };
  if (typeof ep.id !== 'string' || !ep.id) errs.push('missing id');
  if (typeof ep.title !== 'string' || !ep.title) errs.push('missing title');
  if (!Number.isInteger(ep.unit)) errs.push('unit must be an integer');
  if (!Array.isArray(ep.topicIds) || ep.topicIds.length < 1) errs.push('topicIds missing');
  const voices = ep.voices ?? {};
  const speakers = ep.speakers ?? {};
  if (!Object.keys(voices).length) errs.push('voices missing');
  if (!Object.keys(speakers).length) errs.push('speakers missing');
  if (!Array.isArray(ep.steps) || ep.steps.length < 1) {
    errs.push('steps missing');
    return { ok: false, errors: errs };
  }
  const seen = new Set();
  ep.steps.forEach((st, i) => {
    const where = `step ${st?.id || '#' + i}`;
    if (!st || typeof st !== 'object') { errs.push(`${where}: not an object`); return; }
    if (typeof st.id !== 'string' || !st.id) errs.push(`${where}: missing id`);
    else if (seen.has(st.id)) errs.push(`${where}: duplicate id`);
    else seen.add(st.id);
    if (!(st.speaker in voices)) errs.push(`${where}: speaker "${st.speaker}" not in voices`);
    if (!(st.speaker in speakers)) errs.push(`${where}: speaker "${st.speaker}" not in speakers`);
    if (typeof st.text !== 'string' || !st.text.trim()) errs.push(`${where}: empty text`);
    if (typeof st.audio !== 'string' || !st.audio) errs.push(`${where}: missing audio path`);
    for (const e of validateScene(st.scene)) errs.push(`${where}: ${e}`);
  });
  return { ok: errs.length === 0, errors: errs };
}

// ---------------- progress marks (state.watched, top-level key in storage)

export function markWatched(state, epId, lastStep, nowIso) {
  if (!state.watched) state.watched = {};
  state.watched[epId] = { completedAt: nowIso, lastStep };
}

export function noteStep(state, epId, idx) {
  if (!state.watched) state.watched = {};
  const cur = state.watched[epId] ?? { completedAt: null, lastStep: 0 };
  cur.lastStep = idx;
  state.watched[epId] = cur;
}
