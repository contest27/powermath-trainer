import { bandOf } from './mastery.js';
import { daysBetween } from './storage.js';

// The scheduler answers one question: "what should today's session contain?"
// New topics go strictly in curriculum order; review is adaptive.

export function nextNewTopic(state, topicOrder) {
  return topicOrder.find((id) => !state.completed.includes(id)) ?? null;
}

// Completed topics whose review is due today or overdue, weakest + most overdue first.
export function dueReviewTopics(state, today) {
  return state.completed
    .filter((id) => {
      const m = state.mastery[id];
      return m && m.due && m.due <= today;
    })
    .sort((a, b) => {
      const ma = state.mastery[a], mb = state.mastery[b];
      if (ma.score !== mb.score) return ma.score - mb.score;
      return (ma.due < mb.due) ? -1 : 1;
    });
}

// Tier a review question to the child's current level on that topic.
export function reviewTier(score, rng) {
  const band = bandOf(score);
  if (band === 'struggling') return rng() < 0.6 ? 1 : 2;
  if (band === 'developing') return rng() < 0.5 ? 2 : 3;
  return rng() < 0.35 ? 2 : 3;
}

// Practice ramp for a brand-new topic (7 items, easy -> hard). Shortened from
// 11 on 2026-08-04: 18-question dailies were too long for the summer pace.
export const NEW_TOPIC_TIERS = [1, 1, 2, 2, 2, 3, 3];

export const REVIEW_ITEMS_DAILY = 4;      // review block appended to a new-topic day
export const REVIEW_ITEMS_ONLY = 10;      // once the curriculum is finished
export const MAX_REVIEW_TOPICS = 3;

// Finish-by-target pacing: how many new topics per day are needed to complete
// the journey by settings.targetDate? Null when there is no target, the target
// has passed (no nagging after the holiday), or the journey is finished.
export function pacing(state, topicOrder, today) {
  const target = state.settings?.targetDate;
  if (!target || !state.diagnosticDone) return null;
  const remaining = topicOrder.filter((id) => !state.completed.includes(id)).length;
  if (!remaining) return null;
  const daysLeft = daysBetween(today, target) + 1; // today still counts
  if (daysLeft < 1) return null;
  const perDay = remaining / daysLeft;
  return { remaining, daysLeft, perDay, needTwo: perDay > 1 };
}

// Plan for today's session. Pure: does not mutate state.
export function planSession(state, topicOrder, today, rng) {
  if (!state.diagnosticDone) return { kind: 'diagnostic' };

  const newTopic = nextNewTopic(state, topicOrder);
  const due = dueReviewTopics(state, today).slice(0, MAX_REVIEW_TOPICS);
  const reviewCount = newTopic ? REVIEW_ITEMS_DAILY : REVIEW_ITEMS_ONLY;

  // Spread review items across the chosen topics, weakest topic gets the most.
  const review = [];
  if (due.length) {
    for (let i = 0; i < reviewCount; i++) {
      const topicId = due[i % due.length];
      review.push({ topicId, tier: reviewTier(state.mastery[topicId].score, rng) });
    }
  }
  if (!newTopic && !review.length) {
    // Nothing due and nothing new: light "keep sharp" mix of the weakest topics.
    const weakest = state.completed
      .slice()
      .sort((a, b) => state.mastery[a].score - state.mastery[b].score)
      .slice(0, MAX_REVIEW_TOPICS);
    for (let i = 0; i < 10 && weakest.length; i++) {
      const topicId = weakest[i % weakest.length];
      review.push({ topicId, tier: reviewTier(state.mastery[topicId].score, rng) });
    }
  }
  return { kind: newTopic ? 'daily' : 'review', newTopic, review };
}
