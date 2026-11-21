// Greedy one-ply bot for Snack Pop. Prints how many moves the bot needs per level.
const fs = require('fs'), path = require('path');
const E = new Function(fs.readFileSync(path.join(__dirname, '../src/pop-engine.js'), 'utf8') + ';return PopEngine')();
function remaining(st) {
  let v = 0;
  for (const k in st.collect) v += Math.max(0, st.collect[k]);
  st.jam.forEach(r => r.forEach(x => { v += x * 1.5; }));
  st.grid.forEach((row, r) => row.forEach(o => {
    if (!o) return;
    if (o.k === 'crate') v += o.hp * 2;
    if (o.k === 'acorn') v -= r * 2.2;
    if (o.k === 'p' && o.sp) v -= o.sp === 'r' ? 3 : 1.5;
  }));
  return v + st.acorn.left * 9;
}
function play(L, seed, cap = 150) {
  const cfg = E.level(L); cfg.moves = 999;
  const st = E.create(cfg, seed); st.quiet = true;
  const R = { seed: seed ^ 0x5bd1 };
  for (let n = 1; n <= cap; n++) {
    const moves = E.validMoves(st);
    let best = null, bestV = Infinity;
    // A person misses things: sometimes take any legal move.
    if (moves.length && E.rand(R) < .2) best = moves[Math.floor(E.rand(R) * moves.length)];
    else for (const [a, b] of moves) {
      const s2 = E.clone(st); s2.quiet = true; s2.seed = (E.rand(R) * 2 ** 31) | 0; // no peeking at future spawns
      if (!E.applySwap(s2, a, b).ok) continue;
      const v = E.isDone(s2) ? -1e9 : remaining(s2) + E.rand(R) * .6;
      if (v < bestV) { bestV = v; best = [a, b]; }
    }
    if (!best) { E.reshuffle(st); continue; }
    E.applySwap(st, ...best);
    if (E.isDone(st)) return n;
  }
  return cap;
}
const from = +process.argv[2] || 1, to = +process.argv[3] || 48, seeds = +process.argv[4] || 24;
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const out = [];
for (let L = from; L <= to; L++) {
  const t0 = Date.now(), res = [];
  for (let s = 0; s < seeds; s++) res.push(play(L, 1000 + s * 31));
  const p = L === 1 ? .9 : L <= 4 ? .8 : L <= 10 ? .65 : L <= 20 ? .55 : .45;
  const m = pct(res, p);
  out.push(m);
  console.log(`L${L} ${E.level(L).theme.padEnd(7)} min ${Math.min(...res)} med ${pct(res, .5)} max ${Math.max(...res)} -> moves ${m}  (${Date.now() - t0}ms)`);
}
console.log(JSON.stringify(out));
