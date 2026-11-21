// Monte Carlo: a perfect player vs rivals, to tune rival count/miss rate per level.
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const idx = (r, c) => r * 5 + c;
const LINES = [];
for (let i = 0; i < 5; i++) { LINES.push([0,1,2,3,4].map(c => idx(i, c))); LINES.push([0,1,2,3,4].map(r => idx(r, i))); }
LINES.push([0,1,2,3,4].map(i => idx(i, i)), [0,1,2,3,4].map(i => idx(i, 4 - i)));
const P = {
  line: { need: 1, masks: LINES }, two: { need: 2, masks: LINES },
  corners: { need: 1, masks: [[0, 4, 20, 24]] },
  stamp: { need: 1, masks: [[0,1,5,6],[3,4,8,9],[15,16,20,21],[18,19,23,24]] },
  plus: { need: 1, masks: [[10,11,12,13,14,2,7,17,22]] },
  x: { need: 1, masks: [[0,6,12,18,24,4,8,16,20]] },
  t: { need: 1, masks: [[0,1,2,3,4,7,12,17,22]] },
  frame: { need: 1, masks: [[0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24]] },
};
const togo = (d, p) => { const rem = p.masks.map(m => m.filter(i => !d[i]).length).sort((a, b) => a - b); return p.need === 1 ? rem[0] : rem[0] + rem[1]; };
function card() { const n = []; for (let c = 0; c < 5; c++) { const v = shuffle(Array.from({ length: 15 }, (_, i) => c * 15 + i + 1)).slice(0, 5); for (let r = 0; r < 5; r++) n[idx(r, c)] = v[r]; } n[12] = 0; return n; }
function game(pat, nCards, rivals, miss, bolts, rc) {
  const p = P[pat], pool = shuffle(Array.from({ length: 75 }, (_, i) => i + 1));
  const me = Array.from({ length: nCards }, () => { const n = card(), d = n.map(v => v === 0); const bl = shuffle([...Array(25).keys()].filter(i => i !== 12)).slice(0, bolts); return { n, d, bl }; });
  const rv = Array.from({ length: rivals * rc }, () => { const n = card(); return { n, d: n.map(v => v === 0), at: -1 }; });
  let paw = +process.env.PAW0;
  for (let b = 0; b < 75; b++) {
    const x = pool[b];
    for (const r of rv) { const i = r.n.indexOf(x); if (i >= 0 && Math.random() > miss) r.d[i] = true; if (r.at < 0 && togo(r.d, p) === 0) r.at = b; }
    for (const c of me) { const i = c.n.indexOf(x); if (i >= 0) { c.d[i] = true; if (c.bl.includes(i)) paw++; } }
    // spend paws where they help most once a card is close
    while (paw > 0) {
      let best = null;
      me.forEach(c => { const t = togo(c.d, p); if (t <= 2) for (let i = 0; i < 25; i++) if (!c.d[i]) { c.d[i] = true; const t2 = togo(c.d, p); c.d[i] = false; if (t2 < t && (!best || t2 < best.t)) best = { c, i, t: t2 }; } });
      if (!best) break; best.c.d[best.i] = true; paw--;
    }
    if (me.some(c => togo(c.d, p) === 0)) return 1;
    if (rv.some(r => r.at >= 0 && b >= r.at + 1)) return 0;
  }
  return 0;
}
const cfg = L => ({
  pat: ['line', 'corners', 'line', 'stamp', 'two', 'plus', 'x', 't', 'two', 'frame'][(L - 1) % 10],
  nCards: L <= 2 ? 1 : L <= 6 ? 2 : 3,
  rivals: L <= 2 ? 1 : L <= 5 ? 2 : 3,
  miss: Math.max(.06, .34 - L * .025),
  bolts: +process.env.BOLTS, rc: L <= 4 ? 1 : 2,
});
for (let L = 1; L <= 20; L++) {
  const c = cfg(L); let w = 0; const N = 3000;
  for (let i = 0; i < N; i++) w += game(c.pat, c.nCards, c.rivals, c.miss, c.bolts, c.rc);
  console.log(L, c.pat.padEnd(8), c.nCards, c.rivals, c.miss.toFixed(2), (w / N * 100).toFixed(1) + '%');
}
