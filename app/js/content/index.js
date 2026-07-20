import { topics5a } from './c5a.js';
import { topics5b } from './c5b.js';
import { topics5c } from './c5c.js';

export const STRANDS = {
  place: { title: 'Place value island', icon: '🔢' },
  addsub: { title: 'Addition & subtraction bay', icon: '➕' },
  multdiv: { title: 'Times-table mountains', icon: '✖️' },
  stats: { title: 'Data harbour', icon: '📊' },
  fractions: { title: 'Fraction forest', icon: '🍕' },
  decimals: { title: 'Decimal city', icon: '💯' },
  measure: { title: 'Measure meadows', icon: '📏' },
  geometry: { title: 'Shape shores', icon: '📐' },
};

export const topics = [...topics5a, ...topics5b, ...topics5c];
export const topicOrder = topics.map((t) => t.id);

const byId = new Map(topics.map((t) => [t.id, t]));
export function topicById(id) {
  return byId.get(id);
}

export { diagnosticItems } from './diagnostic.js';
