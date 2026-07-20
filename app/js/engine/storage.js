// All persistent state lives in one versioned localStorage key.
// Size stays small (~200 KB over a summer): attempts and logs are capped ring buffers.

const KEY = 'pmtrainer.state.v1';
const ATTEMPT_CAP = 4000;
const QA_CAP = 200;
const HISTORY_CAP = 400;

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return dayKey(dt);
}

export function daysBetween(a, b) {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((new Date(yb, mb - 1, db) - new Date(ya, ma - 1, da)) / 86400000);
}

export function defaultState() {
  return {
    version: 1,
    settings: { name: '', voiceURI: null, rate: 0.95, apiKey: '' },
    streak: { count: 0, lastDay: null },
    mastery: {},      // topicId -> { score, attempts, correct, lastSeen, due, box }
    stars: {},        // topicId -> 1..3
    completed: [],    // topicIds in completion order
    diagnosticDone: false,
    history: [],      // { day, kind, topicId, total, correct, minutes }
    attempts: [],     // { d, t, tier, ok }
    qaLog: [],        // { day, topicId, q, a, source }
    lastExport: null,
    activeSession: null, // serialized in-progress session so a closed tab resumes
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    if (!s || s.version !== 1) return defaultState();
    // Fill any fields added after first release.
    return Object.assign(defaultState(), s);
  } catch {
    return defaultState();
  }
}

export function save(state) {
  if (state.attempts.length > ATTEMPT_CAP) state.attempts = state.attempts.slice(-ATTEMPT_CAP);
  if (state.qaLog.length > QA_CAP) state.qaLog = state.qaLog.slice(-QA_CAP);
  if (state.history.length > HISTORY_CAP) state.history = state.history.slice(-HISTORY_CAP);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('save failed', e);
  }
}

export function exportJSON(state) {
  const copy = JSON.parse(JSON.stringify(state));
  copy.settings.apiKey = ''; // backups must never contain the API key
  return JSON.stringify({ app: 'powermath-trainer', exported: new Date().toISOString(), state: copy }, null, 1);
}

// Returns the imported state or throws with a readable message.
export function parseImport(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { throw new Error('Not a valid backup file (not JSON).'); }
  if (!obj || obj.app !== 'powermath-trainer' || !obj.state || obj.state.version !== 1) {
    throw new Error('Not a PowerMath Trainer backup.');
  }
  return Object.assign(defaultState(), obj.state);
}

export function wipe() {
  localStorage.removeItem(KEY);
}
