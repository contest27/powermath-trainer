import { shuffle, ri } from '../engine/rng.js';
import { fmt } from '../engine/check.js';

// Question builders. Every question carries: kind, prompt, tier, answer fields,
// and optional svg / hint / explain. IDs are set by the session composer.

export function num(prompt, answer, { unit = '', tier = 2, svg = '', hint = '', explain = '', tolerance = 0 } = {}) {
  return { kind: 'num', prompt, answer, unit, tier, svg, hint, explain, tolerance };
}

export function mc(prompt, options, answerIndex, { tier = 2, svg = '', hint = '', explain = '' } = {}) {
  return { kind: 'mc', prompt, options, answerIndex, tier, svg, hint, explain };
}

// Build an MC from a correct value and distractors, shuffled deterministically.
export function mcFrom(rng, prompt, correct, distractors, opts = {}) {
  const all = [correct, ...distractors.filter((d) => String(d) !== String(correct)).slice(0, 3)];
  const options = shuffle(rng, all.map((v) => (typeof v === 'number' ? fmt(v) : String(v))));
  const answerIndex = options.indexOf(typeof correct === 'number' ? fmt(correct) : String(correct));
  return mc(prompt, options, answerIndex, opts);
}

export function tf(prompt, answer, { tier = 1, svg = '', hint = '', explain = '' } = {}) {
  return { kind: 'tf', prompt, answer, tier, svg, hint, explain };
}

export function frac(prompt, n, d, { exact = false, tier = 2, svg = '', hint = '', explain = '' } = {}) {
  return { kind: 'frac', prompt, answer: { n, d }, exact, tier, svg, hint, explain };
}

// items: values shown to the child; correctOrder: same values in the right order.
export function order(prompt, rng, correctOrder, { tier = 2, svg = '', hint = '', explain = '' } = {}) {
  const items = shuffle(rng, correctOrder.slice());
  // Reshuffle once if the shuffle happened to produce the solved order.
  const same = items.every((v, i) => String(v) === String(correctOrder[i]));
  return {
    kind: 'order',
    prompt,
    items: same ? items.slice().reverse() : items,
    correctOrder: correctOrder.map(String),
    tier, svg, hint, explain,
  };
}

// Distractor helpers -----------------------------------------------------------

// Plausible wrong numbers near a correct value.
export function nearMisses(rng, v, { spread = null } = {}) {
  const s = spread ?? Math.max(1, Math.round(Math.abs(v) * 0.1));
  const set = new Set();
  let guard = 0;
  while (set.size < 3 && guard++ < 50) {
    const cand = v + (rng() < 0.5 ? -1 : 1) * ri(rng, 1, s);
    if (cand !== v) set.add(cand);
  }
  return [...set];
}

// Inline stacked fraction for prompts and options.
export function fr(n, d) {
  return `<span class="frac"><b>${n}</b><i>${d}</i></span>`;
}

export function money(v) {
  return '£' + v.toFixed(2);
}

export { fmt, ri, shuffle };
export { pick, distinctInts } from '../engine/rng.js';
