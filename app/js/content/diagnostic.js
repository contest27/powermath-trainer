// Day-1 warm-up check: 18 quick items across all strands.
// Results seed the per-topic mastery scores (see engine/progress.js).

import { num, mc, tf, fr, fmt, ri, pick } from './gen.js';
import { pvGrid, barModel, rectGrid, angleDiagram, dataTable } from './vis.js';

export function diagnosticItems(rng) {
  const items = [];
  const add = (strand, q) => { q.strand = strand; items.push(q); };

  // --- place value (3)
  {
    const n = ri(rng, 21000, 89999);
    const pos = ri(rng, 0, 2);
    const digit = Number(String(n)[pos]);
    const value = digit === 0 ? null : digit * 10 ** (4 - pos);
    if (value) {
      add('place', num(`What is the value of the digit ${digit} in ${fmt(n)}?`, value, { tier: 1, svg: pvGrid(n) }));
    } else {
      add('place', num(`What number is 40,000 + 3,000 + 200 + 5?`, 43205, { tier: 1 }));
    }
  }
  {
    const n = ri(rng, 3000, 9000) + ri(rng, 100, 900);
    add('place', num(`Round ${fmt(n)} to the nearest 1,000.`, Math.round(n / 1000) * 1000, { tier: 1 }));
  }
  {
    const start = -ri(rng, 2, 8), rise = ri(rng, 4, 12);
    add('place', num(`The temperature is ${start}°C and rises by ${rise}°C. What is it now?`, start + rise, { tier: 1, allowMinus: true }));
  }

  // --- addition & subtraction (2)
  {
    const a = ri(rng, 1200, 4800), b = ri(rng, 1200, 4800);
    add('addsub', num(`Work out ${fmt(a)} + ${fmt(b)}.`, a + b, { tier: 2 }));
  }
  {
    const whole = ri(rng, 40, 90) * 100, part = ri(rng, 12, 30) * 100;
    add('addsub', num(`A target is ${fmt(whole)} points. ${fmt(part)} are scored. How many more points are needed?`, whole - part, {
      tier: 2, svg: barModel(whole, [part, whole - part], { partLabels: [fmt(part), '?'], wholeLabel: fmt(whole) }),
    }));
  }

  // --- multiplication & division (3)
  {
    const k = ri(rng, 4, 9), m = k * ri(rng, 4, 9);
    const wrongs = [m + 1, m + 2, m - 1].filter((w) => w % k !== 0).slice(0, 3);
    const opts = [fmt(m), ...wrongs.map(fmt)];
    add('multdiv', mc(`Which of these is a multiple of ${k}?`, opts, 0, { tier: 1 }));
  }
  {
    const a = ri(rng, 120, 480), b = ri(rng, 3, 6);
    add('multdiv', num(`Work out ${a} × ${b}.`, a * b, { tier: 2 }));
  }
  {
    const d = ri(rng, 3, 6), q = ri(rng, 12, 25);
    add('multdiv', num(`Work out ${d * q} ÷ ${d}.`, q, { tier: 2 }));
  }

  // --- fractions (3)
  {
    const d = pick(rng, [2, 3, 4]), n = ri(rng, 1, d - 1), k = pick(rng, [2, 3]);
    add('fractions', num(`Find the missing number: ${fr(n, d)} = ${fr('□', d * k)}`, n * k, { tier: 1 }));
  }
  {
    const d = pick(rng, [5, 7, 9]), a = ri(rng, 1, d - 3), b = ri(rng, 1, d - a - 1);
    const cands = [fr(a + b, d * 2), fr(a * b, d), fr(a + b + 1, d), fr(Math.max(1, a + b - 1), d), fr(a + b, d + 1)];
    const opts = [fr(a + b, d)];
    for (const c of cands) if (!opts.includes(c) && opts.length < 4) opts.push(c);
    add('fractions', mc(`Work out ${fr(a, d)} + ${fr(b, d)}`, opts, 0, { tier: 1 }));
  }
  {
    const d = pick(rng, [4, 5, 10]), unit = ri(rng, 4, 9);
    add('fractions', num(`Find ${fr(1, d)} of ${d * unit}.`, unit, { tier: 2 }));
  }

  // --- decimals (2)
  {
    const n = ri(rng, 1, 9);
    const opts = [fr(n, 10), fr(n, 100), fr(10, n), fr(n, 1000)];
    add('decimals', mc(`Which fraction equals 0.${n}?`, opts, 0, { tier: 1 }));
  }
  {
    const a = ri(rng, 1, 9), b = ri(rng, 1, 9);
    if (a !== b) {
      const x = `0.${a}`, y = `0.${b}5`;
      add('decimals', tf(`True or false: ${x} &gt; ${y}`, Number(x) > Number(y), { tier: 2 }));
    } else {
      add('decimals', tf('True or false: 0.7 &gt; 0.65', true, { tier: 2 }));
    }
  }

  // --- statistics (1)
  {
    const days = ['Mon', 'Tue', 'Wed'];
    const vals = days.map(() => ri(rng, 5, 18) * 5);
    const i = ri(rng, 0, 2);
    add('stats', num(`The table shows ticket sales. How many were sold on ${days[i]}?`, vals[i], {
      tier: 1, svg: dataTable(['Day', 'Tickets'], days.map((d, j) => [d, String(vals[j])])),
    }));
  }

  // --- measure (2)
  {
    const w = ri(rng, 5, 12), h = ri(rng, 3, 8);
    add('measure', num('Find the perimeter of this rectangle.', 2 * (w + h), { tier: 2, unit: 'cm', svg: rectGrid(w, h, { showGrid: false }) }));
  }
  {
    const v = ri(rng, 2, 9);
    add('measure', num(`Convert ${v} m into cm.`, v * 100, { tier: 1, unit: 'cm' }));
  }

  // --- geometry (2)
  {
    const type = pick(rng, ['acute', 'obtuse']);
    const deg = type === 'acute' ? ri(rng, 25, 70) : ri(rng, 110, 160);
    add('geometry', mc('What type of angle is shown?', ['acute', 'right angle', 'obtuse', 'reflex'], type === 'acute' ? 0 : 2, {
      tier: 1, svg: angleDiagram(deg),
    }));
  }
  {
    const a = ri(rng, 40, 140);
    add('geometry', num(`Two angles make a straight line. One is ${a}°. What is the other?`, 180 - a, { tier: 2 }));
  }

  return items;
}
