// Registry of Watch episodes (narrated in-app explainers). One entry per
// episode; the JSON + MP3 snippets live under app/data/watch/. Adding an
// episode: register it here, add the JSON to sw.js ASSETS (not the MP3s).

export const DATA_BASE = './data/watch/';

export const EPISODES = [
  {
    id: 'u08-fractions',
    unit: 8,
    title: 'Equivalent fractions',
    topicIds: ['u08-equivalent'],
    file: 'u08-fractions.json',
    minutes: 3,
  },
];

export function episodeForUnit(unit) {
  return EPISODES.find((e) => e.unit === unit) ?? null;
}

export function episodeById(id) {
  return EPISODES.find((e) => e.id === id) ?? null;
}
