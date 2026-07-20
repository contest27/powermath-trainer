import { newMastery, updateMastery, scheduleAfterSession, diagnosticScore } from './mastery.js';
import { daysBetween } from './storage.js';

export function recordAttempt(state, topicId, tier, ok, today) {
  if (!state.mastery[topicId]) state.mastery[topicId] = newMastery();
  updateMastery(state.mastery[topicId], tier, ok);
  state.attempts.push({ d: today, t: topicId, tier, ok: ok ? 1 : 0 });
}

// Called when the practice block for a new topic ends.
export function completeTopic(state, topicId, correct, total, today) {
  if (!state.completed.includes(topicId)) state.completed.push(topicId);
  const acc = total ? correct / total : 0;
  const stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
  state.stars[topicId] = Math.max(state.stars[topicId] ?? 0, stars);
  scheduleAfterSession(state.mastery[topicId], today);
  return stars;
}

// Reviewed topics get a fresh due date based on their updated score.
export function rescheduleReviewed(state, topicIds, today) {
  for (const id of topicIds) {
    if (state.mastery[id]) scheduleAfterSession(state.mastery[id], today);
  }
}

export function finishSession(state, entry, today) {
  state.history.push({ day: today, ...entry });
  const last = state.streak.lastDay;
  if (last !== today) {
    state.streak.count = last && daysBetween(last, today) === 1 ? state.streak.count + 1 : 1;
    state.streak.lastDay = today;
  }
  state.activeSession = null;
}

// strandResults: { strandId: { correct, total } } from the diagnostic.
export function applyDiagnostic(state, strandResults, topics, today) {
  for (const t of topics) {
    const r = strandResults[t.strand];
    const frac = r && r.total ? r.correct / r.total : 0.5;
    state.mastery[t.id] = newMastery(diagnosticScore(frac));
  }
  state.diagnosticDone = true;
}
