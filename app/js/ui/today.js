import { h, store, go, registerScreen } from './core.js';
import { bottomNav, progressBar } from './components.js';
import { planSession } from '../engine/scheduler.js';
import { dayKey, daysBetween } from '../engine/storage.js';
import { makeRng, seedFromString } from '../engine/rng.js';
import { topicOrder, topicById } from '../content/index.js';
import { startOrResume } from './session.js';

registerScreen('today', () => {
  const st = store.state;
  const today = dayKey();
  const name = st.settings.name;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const wrap = h('div', { class: 'screen home' });

  // Long-press the gear to reach the parent corner.
  const gear = h('button', { class: 'gear', 'aria-label': 'Parent corner' }, '⚙️');
  let holdTimer = null;
  const startHold = () => { holdTimer = setTimeout(() => go('parentgate'), 1200); };
  const endHold = () => clearTimeout(holdTimer);
  gear.addEventListener('pointerdown', startHold);
  gear.addEventListener('pointerup', endHold);
  gear.addEventListener('pointerleave', endHold);

  wrap.append(h('div', { class: 'home-top' },
    h('div', {},
      h('h1', { class: 'greet' }, `${greet}${name ? ', ' + name : ''}! 👋`),
      h('p', { class: 'streakline' }, st.streak.count > 0 ? `🔥 ${st.streak.count}-day streak` : 'Ready for today?'),
    ),
    gear,
  ));

  const doneToday = st.streak.lastDay === today;
  const resumable = st.activeSession && st.activeSession.day === today && st.activeSession.phase !== 'summary';
  const rng = makeRng(seedFromString(today));
  const plan = planSession(st, topicOrder, today, rng);

  const card = h('div', { class: 'card today-card' });
  if (resumable) {
    card.append(h('h2', {}, 'Session in progress'),
      h('p', {}, 'You were part-way through. Pick up where you left off!'));
  } else if (plan.kind === 'diagnostic') {
    card.append(h('h2', {}, 'Warm-up check 🎯'),
      h('p', {}, 'A quick mix of questions so the app learns what you already rock at. No pressure — just have a go!'));
  } else if (plan.kind === 'daily') {
    const t = topicById(plan.newTopic);
    card.append(h('h2', {}, "Today's topic"),
      h('p', { class: 'topic-name' }, t.emoji + ' ' + t.title),
      plan.review.length ? h('p', { class: 'muted' }, 'Plus a quick review of earlier topics.') : null);
  } else {
    card.append(h('h2', {}, 'Review day 💪'),
      h('p', {}, 'All topics done — time to make them stick!'));
  }

  card.append(h('button', { class: 'btn primary wide big start', onclick: startOrResume },
    resumable ? 'Continue ▶' : doneToday ? 'Practise again ▶' : 'Start ▶'));
  if (doneToday && !resumable) {
    card.append(h('p', { class: 'muted center-t' }, '✅ Done for today — extra practice is always welcome!'));
  }
  wrap.append(card);

  // Curriculum progress
  const total = topicOrder.length;
  const done = st.completed.length;
  wrap.append(h('div', { class: 'card slim' },
    h('div', { class: 'row spread' }, h('b', {}, 'Summer journey'), h('span', {}, `${done}/${total} topics`)),
    progressBar(done, total)));

  // Backup nudge for the parent (shows only after real usage).
  const needNudge = st.history.length >= 4 &&
    (!st.lastExport || daysBetween(st.lastExport.slice(0, 10), today) >= 7);
  if (needNudge) {
    wrap.append(h('div', { class: 'nudge' },
      '💾 Parents: it has been a while since the last backup. Hold ⚙️ to open the Parent corner.'));
  }

  wrap.append(bottomNav('today', go));
  return wrap;
});
