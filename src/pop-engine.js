/* =====================================================================
   Snack Pop engine: pure game logic, no DOM. The UI replays its frames.
   ===================================================================== */
const PopEngine = (() => {
  const ROWS = 9, COLS = 8;
  const K = (r, c) => r * COLS + c;
  function rand(st) {
    st.seed = (st.seed + 0x6D2B79F5) | 0;
    let t = Math.imul(st.seed ^ (st.seed >>> 15), 1 | st.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const ri = (st, n) => Math.floor(rand(st) * n);
  const grid0 = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  const movable = o => !!o && o.k !== 'crate';

  /* ---------- level design ---------- */
  const SHAPES = {
    middle: (r, c) => Math.abs(r - 4) + Math.abs(c - 3.5),
    bottom: (r, c) => (ROWS - 1 - r) * 1.6 + Math.abs(c - 3.5) * .4,
    top: (r, c) => r * 1.6 + Math.abs(c - 3.5) * .4,
    frame: (r, c) => Math.min(r, ROWS - 1 - r, c, COLS - 1 - c) * 3,
    cross: (r, c) => Math.min(Math.abs(r - 4), Math.abs(c - 3.5)) * 2.5,
    corners: (r, c) => Math.min(Math.hypot(r, c), Math.hypot(ROWS - 1 - r, c)),
  };
  function pickSym(R, shape, count, ok) {
    const half = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS / 2; c++)
      if (ok(r, c) && ok(r, COLS - 1 - c)) half.push({ r, c, m: SHAPES[shape](r, c) + rand(R) * .9 });
    half.sort((a, b) => a.m - b.m);
    const out = [];
    for (const p of half) { if (out.length >= count) break; out.push([p.r, p.c], [p.r, COLS - 1 - p.c]); }
    return out;
  }
  // Moves per level come from bot simulations (tools/calibrate-pop.js). Beyond the table, levels repeat the last cycle.
  const MOVES = [14, 20, 15, 22, 17, 29, 24, 16, 18, 25, 19, 11, 22, 34, 35, 18, 23, 29, 25, 25, 28, 30, 32, 22, 28, 18, 32, 24, 29, 30, 38, 27, 24, 29, 32, 33, 28, 24, 33, 28, 28, 29, 33, 33, 27, 29, 28, 33];
  function level(L) {
    const base = L > 48 ? 37 + ((L - 37) % 12) : L;
    const R = { seed: L * 7919 + 101 };
    const theme = ['collect', 'jam', 'crate', 'acorn'][(base - 1) % 4];
    const t = Math.floor((base - 1) / 4);
    const cfg = { L, theme, types: base <= 2 ? 5 : 6, jam: grid0(), crates: grid0(), collect: {}, acorns: 0, acornMax: 1, moves: MOVES[base - 1] || 30 };
    const pickShape = list => list[ri(R, list.length)];
    const free = (r, c) => !cfg.crates[r][c] && !cfg.jam[r][c];
    const addCrates = (n, shape, hp2) => {
      const rowCount = Array(ROWS).fill(0);
      pickSym(R, shape, n, (r, c) => r > 0 && r < ROWS - 1 && free(r, c)).forEach(([r, c], i) => {
        if (rowCount[r] >= COLS - 2) return;
        rowCount[r]++; cfg.crates[r][c] = i < n * hp2 ? 2 : 1;
      });
    };
    const addJam = (n, shape, dbl) => pickSym(R, shape, n, free).forEach(([r, c], i) => { cfg.jam[r][c] = i < n * dbl ? 2 : 1; });
    const goalTypes = k => { const ts = []; while (ts.length < k) { const x = ri(R, cfg.types); if (!ts.includes(x)) ts.push(x); } return ts; };
    if (theme === 'collect') {
      const k = t === 0 ? 2 : 3;
      goalTypes(k).forEach(x => { cfg.collect[x] = Math.min(32, 15 + 3 * t); });
      if (t >= 1) addCrates(Math.min(14, 2 + 2 * t), pickShape(['middle', 'cross', 'frame']), t >= 3 ? .5 : 0);
    } else if (theme === 'jam') {
      addJam(Math.min(30, 12 + 3 * t), pickShape(['middle', 'cross', 'top']), Math.min(.4, .15 * (t - 1)));
      if (t >= 2) addCrates(Math.min(10, 2 * t - 2), 'top', 0);
    } else if (theme === 'crate') {
      addCrates(Math.min(24, 8 + 3 * t), pickShape(['middle', 'top', 'cross', 'frame']), Math.min(.75, .3 * t));
      goalTypes(1).forEach(x => { cfg.collect[x] = Math.min(30, 12 + 3 * t); });
    } else {
      cfg.acorns = Math.min(4, 2 + (t >> 2)); cfg.acornMax = 2;
      if (t >= 2) addCrates(Math.min(10, 2 * t), pickShape(['top', 'middle']), t >= 6 ? .5 : 0);
    }
    return cfg;
  }

  /* ---------- state ---------- */
  function create(cfg, seed) {
    const st = { types: cfg.types, seed: seed | 0, nid: 1, moves: cfg.moves, quiet: false, made: 0,
      jam: cfg.jam.map(r => r.slice()), collect: { ...cfg.collect },
      acorn: { left: cfg.acorns, toSpawn: cfg.acorns, maxOn: cfg.acornMax }, grid: null };
    for (let tries = 0; tries < 200; tries++) {
      const g = st.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (cfg.crates[r][c]) { g[r][c] = { id: st.nid++, k: 'crate', hp: cfg.crates[r][c] }; continue; }
        let t, n = 0;
        do { t = ri(st, st.types); n++; } while (n < 30 && (
          (c >= 2 && g[r][c - 1]?.t === t && g[r][c - 2]?.t === t && g[r][c - 1].k === 'p' && g[r][c - 2].k === 'p') ||
          (r >= 2 && g[r - 1][c]?.t === t && g[r - 2][c]?.t === t && g[r - 1][c].k === 'p' && g[r - 2][c].k === 'p')));
        g[r][c] = { id: st.nid++, k: 'p', t, sp: null };
      }
      if (st.acorn.toSpawn) {
        // The first acorns start partway down so the opening moves already matter.
        const cols = [1, 2, 3, 4, 5, 6].filter(c => g[2][c].k === 'p');
        for (let i = 0; i < st.acorn.maxOn && st.acorn.toSpawn && cols.length; i++) {
          const c = cols.splice(ri(st, cols.length), 1)[0];
          g[2][c] = { id: st.nid++, k: 'acorn', t: -1 }; st.acorn.toSpawn--;
        }
      }
      if (!findRuns(st).length && validMoves(st).length >= 3) break;
      st.acorn.toSpawn = cfg.acorns;
    }
    return st;
  }
  function clone(st) { return JSON.parse(JSON.stringify(st)); }

  /* ---------- matching ---------- */
  function T(st, r, c) { const o = st.grid[r][c]; return o && o.k === 'p' && o.sp !== 'r' ? o.t : -1; }
  function findRuns(st) {
    const runs = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS;) {
      const t = T(st, r, c); let e = c + 1;
      if (t >= 0) while (e < COLS && T(st, r, e) === t) e++;
      if (t >= 0 && e - c >= 3) runs.push({ d: 'h', cells: Array.from({ length: e - c }, (_, i) => [r, c + i]) });
      c = e;
    }
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS;) {
      const t = T(st, r, c); let e = r + 1;
      if (t >= 0) while (e < ROWS && T(st, e, c) === t) e++;
      if (t >= 0 && e - r >= 3) runs.push({ d: 'v', cells: Array.from({ length: e - r }, (_, i) => [r + i, c]) });
      r = e;
    }
    return runs;
  }
  function runAt(st, r, c) {
    const t = T(st, r, c); if (t < 0) return false;
    let a = c, b = c; while (a > 0 && T(st, r, a - 1) === t) a--; while (b < COLS - 1 && T(st, r, b + 1) === t) b++;
    if (b - a >= 2) return true;
    a = r; b = r; while (a > 0 && T(st, a - 1, c) === t) a--; while (b < ROWS - 1 && T(st, b + 1, c) === t) b++;
    return b - a >= 2;
  }
  function swapCells(st, a, b) { const g = st.grid, x = g[a[0]][a[1]]; g[a[0]][a[1]] = g[b[0]][b[1]]; g[b[0]][b[1]] = x; }
  // An acorn can always be rolled down one cell, at the cost of a move.
  const rollDown = (A, B, dr) => dr === 1 && A.k === 'acorn' && B.k === 'p';
  function validMoves(st) {
    const out = [], g = st.grid;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const rr = r + dr, cc = c + dc; if (rr >= ROWS || cc >= COLS) continue;
      const A = g[r][c], B = g[rr][cc];
      if (!movable(A) || !movable(B) || (A.k === 'acorn' && B.k === 'acorn')) continue;
      if ((A.sp === 'r' && B.k === 'p') || (B.sp === 'r' && A.k === 'p') || (A.sp && B.sp) || rollDown(A, B, dr)) { out.push([[r, c], [rr, cc]]); continue; }
      swapCells(st, [r, c], [rr, cc]);
      if (runAt(st, r, c) || runAt(st, rr, cc)) out.push([[r, c], [rr, cc]]);
      swapCells(st, [r, c], [rr, cc]);
    }
    return out;
  }

  /* ---------- moves ---------- */
  function snap(st) {
    if (st.quiet) return null;
    const g = st.grid.map(row => row.map(o => o && { id: o.id, k: o.k, t: o.t, sp: o.sp, hp: o.hp, from: o.from }));
    st.grid.forEach(row => row.forEach(o => { if (o) delete o.from; }));
    return { g, jam: st.jam.map(r => r.slice()) };
  }
  function applySwap(st, a, b) {
    const g = st.grid, A = g[a[0]]?.[a[1]], B = g[b[0]]?.[b[1]];
    if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1 || !movable(A) || !movable(B)) return { ok: false };
    const frames = [];
    if ((A.sp === 'r' && B.k === 'p') || (B.sp === 'r' && A.k === 'p')) {
      const [O, rc, oc] = A.sp === 'r' ? [B, a, b] : [A, b, a];
      st.moves--;
      const init = new Set([K(...rc), K(...oc)]), used = new Set([K(...rc)]), fx = [{ type: 'r', r: rc[0], c: rc[1] }];
      const each = fn => g.forEach((row, r) => row.forEach((o, c) => { if (o && o.k === 'p') fn(o, r, c); }));
      if (O.sp === 'r') { used.add(K(...oc)); each((o, r, c) => init.add(K(r, c))); fx.push({ type: 'all' }); }
      else if (O.sp) {
        used.add(K(...oc));
        each((o, r, c) => { if (!o.sp && o.t === O.t) { o.sp = O.sp === 'b' ? 'b' : (ri(st, 2) ? 'h' : 'v'); init.add(K(r, c)); } });
        frames.push({ type: 'convert', snap: snap(st) });
        init.add(K(...oc)); used.delete(K(...oc));
      } else each((o, r, c) => { if (o.t === O.t) init.add(K(r, c)); });
      resolve(st, frames, null, init, used, fx);
      return { ok: true, frames, combo: O.sp === 'r' ? 'rr' : O.sp ? 'r' + O.sp : 'r' };
    }
    if (A.k === 'p' && B.k === 'p' && A.sp && B.sp) {
      swapCells(st, a, b); st.moves--;
      frames.push({ type: 'swap', snap: snap(st) });
      const [r, c] = b, kinds = [A.sp, B.sp].sort().join(''), init = new Set([K(...a), K(...b)]), used = new Set(init), fx = [];
      if (kinds === 'bb') {
        for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) if (Math.abs(rr - r) + Math.abs(cc - c) <= 3) init.add(K(rr, cc));
        fx.push({ type: 'b', r, c, rad: 3 });
      } else if (kinds.includes('b')) {
        for (let i = -1; i <= 1; i++) {
          if (r + i >= 0 && r + i < ROWS) { for (let cc = 0; cc < COLS; cc++) init.add(K(r + i, cc)); fx.push({ type: 'h', r: r + i }); }
          if (c + i >= 0 && c + i < COLS) { for (let rr = 0; rr < ROWS; rr++) init.add(K(rr, c + i)); fx.push({ type: 'v', c: c + i }); }
        }
      } else {
        for (let cc = 0; cc < COLS; cc++) init.add(K(r, cc));
        for (let rr = 0; rr < ROWS; rr++) init.add(K(rr, c));
        fx.push({ type: 'h', r }, { type: 'v', c });
      }
      resolve(st, frames, null, init, used, fx);
      return { ok: true, frames, combo: kinds };
    }
    const [top, low] = a[0] < b[0] ? [A, B] : [B, A];
    if (a[1] === b[1] && rollDown(top, low, 1)) {
      swapCells(st, a, b); st.moves--;
      frames.push({ type: 'swap', snap: snap(st) });
      settleAll(st, frames);
      resolve(st, frames, [a, b]);
      return { ok: true, frames, roll: true };
    }
    swapCells(st, a, b);
    if (!runAt(st, a[0], a[1]) && !runAt(st, b[0], b[1])) { swapCells(st, a, b); return { ok: false }; }
    st.moves--;
    resolve(st, frames, [a, b]);
    return { ok: true, frames };
  }
  function smash(st, r, c) {
    const o = st.grid[r]?.[c]; if (!o || o.k === 'acorn') return { ok: false };
    const frames = []; resolve(st, frames, null, new Set([K(r, c)]), null, [{ type: 'b', r, c, rad: 0 }]);
    return { ok: true, frames };
  }
  function commonType(st) {
    const n = Array(st.types).fill(0);
    st.grid.forEach(row => row.forEach(o => { if (o && o.k === 'p' && o.t >= 0) n[o.t]++; }));
    return n.indexOf(Math.max(...n));
  }
  function blastArea(st, o, k, fx) {
    const r = Math.floor(k / COLS), c = k % COLS, out = [];
    if (o.sp === 'h') { for (let cc = 0; cc < COLS; cc++) out.push(K(r, cc)); fx.push({ type: 'h', r }); }
    else if (o.sp === 'v') { for (let rr = 0; rr < ROWS; rr++) out.push(K(rr, c)); fx.push({ type: 'v', c }); }
    else if (o.sp === 'b') {
      for (let rr = r - 2; rr <= r + 2; rr++) for (let cc = c - 2; cc <= c + 2; cc++)
        if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && Math.abs(rr - r) + Math.abs(cc - c) <= 2) out.push(K(rr, cc));
      fx.push({ type: 'b', r, c, rad: 2 });
    } else if (o.sp === 'r') {
      const t = commonType(st);
      st.grid.forEach((row, rr) => row.forEach((p, cc) => { if (p && p.k === 'p' && p.t === t) out.push(K(rr, cc)); }));
      fx.push({ type: 'r', r, c });
    }
    return out;
  }
  function resolve(st, frames, swaps, init, used, fx0) {
    const g = st.grid, at = k => g[Math.floor(k / COLS)][k % COLS], put = (k, v) => { g[Math.floor(k / COLS)][k % COLS] = v; };
    for (let step = 1; ; step++) {
      const runs = findRuns(st);
      if (!runs.length && !(init && init.size)) break;
      const clear = new Set(init || []), blast = new Set(init || []), match = new Set(), protect = new Map(), fx = fx0 || [];
      init = null; fx0 = null;
      const cellRuns = new Map(), usedRun = new Set();
      runs.forEach((run, i) => run.cells.forEach(([r, c]) => { const k = K(r, c); match.add(k); clear.add(k); if (!cellRuns.has(k)) cellRuns.set(k, []); cellRuns.get(k).push(i); }));
      const pick = cells => {
        const ks = cells.map(([r, c]) => K(r, c)).filter(k => !at(k).sp && !protect.has(k));
        if (!ks.length) return -1;
        const pref = swaps && ks.find(k => swaps.some(s => K(s[0], s[1]) === k));
        return pref != null ? pref : ks[ks.length >> 1];
      };
      runs.forEach((run, i) => { if (run.cells.length >= 5) { usedRun.add(i); const k = pick(run.cells); if (k >= 0) protect.set(k, 'r'); } });
      for (const [k, list] of cellRuns) {
        if (list.length < 2 || list.some(i => usedRun.has(i))) continue;
        list.forEach(i => usedRun.add(i));
        const kk = !at(k).sp && !protect.has(k) ? k : pick(list.flatMap(i => runs[i].cells));
        if (kk >= 0) protect.set(kk, 'b');
      }
      runs.forEach((run, i) => { if (!usedRun.has(i) && run.cells.length === 4) { const k = pick(run.cells); if (k >= 0) protect.set(k, run.d); } });
      protect.forEach((_, k) => clear.delete(k));
      const fired = new Set(used || []); used = null;
      const queue = [...clear];
      while (queue.length) {
        const k = queue.pop(); if (fired.has(k)) continue;
        const o = at(k); if (!o || o.k !== 'p' || !o.sp) continue;
        fired.add(k);
        for (const k2 of blastArea(st, o, k, fx)) {
          if (protect.has(k2)) continue;
          blast.add(k2);
          if (!clear.has(k2)) { clear.add(k2); queue.push(k2); }
        }
      }
      const removed = [], hitCrates = new Set(), jamHit = new Set(protect.keys());
      match.forEach(k => {
        const r = Math.floor(k / COLS), c = k % COLS;
        [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([rr, cc]) => { if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && g[rr][cc]?.k === 'crate') hitCrates.add(K(rr, cc)); });
      });
      blast.forEach(k => { if (at(k)?.k === 'crate') hitCrates.add(k); });
      clear.forEach(k => {
        const o = at(k);
        if (!o) { if (blast.has(k)) jamHit.add(k); return; }
        if (o.k !== 'p') return;
        jamHit.add(k);
        if (o.t >= 0 && st.collect[o.t] > 0) st.collect[o.t]--;
        removed.push(o.id); put(k, null);
      });
      jamHit.forEach(k => { const r = Math.floor(k / COLS), c = k % COLS; if (st.jam[r][c] > 0) st.jam[r][c]--; });
      hitCrates.forEach(k => { const o = at(k); if (--o.hp <= 0) { removed.push(o.id); put(k, null); } });
      protect.forEach((sp, k) => { const o = at(k); o.sp = sp; if (sp === 'r') o.t = -1; st.made++; });
      frames.push({ type: 'clear', removed, fx, step, made: [...protect.values()], snap: snap(st) });
      swaps = null;
      settleAll(st, frames);
    }
    if (!isDone(st) && st.moves > 0 && !validMoves(st).length) { reshuffle(st); frames.push({ type: 'shuffle', snap: snap(st) }); }
  }
  function settle(st) {
    const g = st.grid, spawned = Array(COLS).fill(0);
    let onBoard = 0; g.forEach(row => row.forEach(o => { if (o && o.k === 'acorn') onBoard++; }));
    for (let moved = true; moved;) {
      moved = false;
      for (let r = ROWS - 1; r >= 0; r--) for (let c = 0; c < COLS; c++) {
        if (g[r][c]) continue;
        if (r === 0) {
          const a = st.acorn; let o;
          if (c > 0 && c < COLS - 1 && a.toSpawn > 0 && onBoard < a.maxOn && (onBoard === 0 || rand(st) < .12)) { a.toSpawn--; onBoard++; o = { id: st.nid++, k: 'acorn', t: -1 }; }
          else o = { id: st.nid++, k: 'p', t: ri(st, st.types), sp: null };
          o.from = -(++spawned[c]); g[0][c] = o; moved = true; continue;
        }
        const up = g[r - 1][c];
        if (!up) continue;
        if (up.k !== 'crate') { g[r][c] = up; g[r - 1][c] = null; moved = true; continue; }
        for (const dc of ri(st, 2) ? [-1, 1] : [1, -1]) {
          const cc = c + dc; if (cc < 0 || cc >= COLS) continue;
          const d = g[r - 1][cc];
          if (movable(d) && g[r][cc]) { g[r][c] = d; g[r - 1][cc] = null; moved = true; break; }
        }
      }
    }
  }
  function settleAll(st, frames) {
    for (;;) {
      settle(st);
      frames.push({ type: 'fall', snap: snap(st) });
      const removed = [];
      // Acorns drop into the basket once they reach either of the bottom two rows.
      for (let r = ROWS - 2; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const o = st.grid[r][c];
        if (o && o.k === 'acorn') { removed.push(o.id); st.grid[r][c] = null; st.acorn.left--; }
      }
      if (!removed.length) break;
      frames.push({ type: 'collect', removed, snap: snap(st) });
    }
  }
  function reshuffle(st) {
    const g = st.grid, cells = [], pcs = [];
    g.forEach((row, r) => row.forEach((o, c) => { if (o && o.k === 'p') { cells.push([r, c]); pcs.push(o); } }));
    for (let tries = 0; tries < 400; tries++) {
      if (tries > 120) pcs.forEach(p => { if (!p.sp) p.t = ri(st, st.types); });
      for (let i = pcs.length - 1; i > 0; i--) { const j = ri(st, i + 1); [pcs[i], pcs[j]] = [pcs[j], pcs[i]]; }
      cells.forEach(([r, c], i) => { g[r][c] = pcs[i]; });
      if (!findRuns(st).length && validMoves(st).length) return true;
    }
    return false;
  }

  /* ---------- goals ---------- */
  function goals(st) {
    let jam = 0, crates = 0;
    st.jam.forEach(row => row.forEach(v => { if (v > 0) jam++; }));
    st.grid.forEach(row => row.forEach(o => { if (o && o.k === 'crate') crates++; }));
    return { jam, crates, acorns: st.acorn.left, collect: st.collect };
  }
  function isDone(st) {
    const g = goals(st);
    return !g.jam && !g.crates && !g.acorns && Object.values(g.collect).every(v => v <= 0);
  }
  return { ROWS, COLS, MOVES, level, create, clone, validMoves, applySwap, smash, reshuffle, goals, isDone, rand };
})();
