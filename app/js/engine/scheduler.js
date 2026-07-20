import { bandOf } from './mastery.js';

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

// Practice ramp for a brand-new topic (11 items, easy -> hard).
export const NEW_TOPIC_TIERS = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3];

export const REVIEW_ITEMS_DAILY = 7;      // review block appended to a new-topic day
export const REVIEW_ITEMS_ONLY = 16;      // once the curriculum is finished
export const MAX_REVIEW_TOPICS = 3;

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
