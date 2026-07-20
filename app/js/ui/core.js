import * as storage from '../engine/storage.js';

export const store = {
  state: storage.load(),
  save() { storage.save(this.state); },
};

const screens = {};
let current = { name: 'today', params: null };
let rootEl = null;

export function registerScreen(name, fn) { screens[name] = fn; }

export function mount(el) { rootEl = el; }

export function go(name, params = null) {
  current = { name, params };
  window.scrollTo(0, 0);
  rerender();
}

export function rerender() {
  if (!rootEl) return;
  const fn = screens[current.name];
  rootEl.replaceChildren(fn ? fn(current.params) : h('div', {}, 'Missing screen: ' + current.name));
}

export function currentScreen() { return current.name; }

// DOM helper: h('button', {class:'big', onclick:fn}, 'Hi'). 'html' attr sets innerHTML.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function toast(msg, ms = 2200) {
  const t = h('div', { class: 'toast' }, msg);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, ms);
}

export const PRAISE = ['Brilliant!', 'Nailed it!', 'Great work!', 'Spot on!', 'You got it!', 'Super!', 'Exactly right!'];
export const ENCOURAGE = ['Good try — look at this:', 'Nearly! Here is a clue:', 'Not quite — check this out:'];
