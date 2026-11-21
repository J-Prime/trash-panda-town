
/* =====================================================================
   Bin Stacker (falling blocks): 7-bag, hold, 3-piece preview, SRS kicks, lock delay, T-spins.
   ===================================================================== */
const Stack = (() => {
  const W = 10, H = 18, PANEL = 4.6, LOCK_MS = 500, LOCK_RESETS = 15, CONT = [40, 80, 120];
  const SH = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
  };
  const COL = { I: '#79e2c0', O: '#ffb547', T: '#b994ff', S: '#93d46c', Z: '#ff7096', J: '#6fa8ff', L: '#ff9a5c', G: '#5a5486' };
  // SRS wall kicks, written with y pointing up as in the guideline. Keyed by "from>to" rotation state.
  const KJ = { '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]] };
  const KI = { '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]], '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]] };
  const MODES = {
    pack: { name: 'Pack', blurb: n => `Pack ${n} full rows into the dumpster before dawn.` },
    dig: { name: 'Dig', blurb: n => `Somebody dumped junk in my bin! Clear all ${n} junk rows off the bottom.` },
    rush: { name: 'Rush', blurb: n => `Junk keeps getting thrown in from below. Clear ${n} rows before it piles up.` },
    sprint: { name: 'Truck', blurb: (n, t) => `The truck is early! Clear ${n} rows in ${t} seconds.` },
  };
  let cv, ctx, cell, grid, piece, bag, queue, holdK, holdUsed, lines, score, L, mode, target, junkLeft, pieces,
    b2b, combo, raw, lastRot, lockT, resets, fallAcc, raf, prev, over, alive, keyH, swipe, stops, flashT, popup, elapsed, timeLimit, rushEvery, rushAcc, contN, speedLv;

  function mount() {
    alive = true; L = S.lv.stack; over = false; bag = []; queue = []; stops = []; swipe = null; flashT = 0; popup = null;
    lines = 0; score = 0; raw = 0; pieces = 0; b2b = false; combo = -1; holdK = null; holdUsed = false; elapsed = 0; rushAcc = 0; contN = 0;
    const s = Math.floor((L - 1) / 4);
    mode = ['pack', 'dig', 'rush', 'sprint'][(L - 1) % 4];
    grid = Array.from({ length: H }, () => Array(W).fill(null));
    if (mode === 'pack') target = Math.min(40, 12 + 4 * s);
    if (mode === 'dig') { target = Math.min(12, 4 + 2 * s); junkLeft = target; addJunk(target, true); }
    if (mode === 'rush') { target = Math.min(36, 10 + 3 * s); rushEvery = Math.max(5, 13 - 1.2 * s) * 1000; }
    if (mode === 'sprint') { target = Math.min(36, 12 + 3 * s); timeLimit = Math.round(target * Math.max(4.2, 7 - .4 * s)); }
    speedLv = () => Math.min(15, 1 + s + Math.floor(lines / 10));
    setTitle(`Level ${L} · ${MODES[mode].name}`);
    say(MODES[mode].blurb(target, timeLimit));
    const pad = h('div', 'pad');
    [['hold', holdPiece, false, 'Hold'], ['left', () => shift(-1), true, 'Move left'], ['rotl', () => rotate(-1), false, 'Turn left'], ['rot', () => rotate(1), false, 'Turn right'],
      ['right', () => shift(1), true, 'Move right'], ['down', soft, true, 'Move down'], ['drop', hard, false, 'Drop']].forEach(([k, fn, rep, label]) => {
      const b = h('button', k === 'drop' ? 'hot' : '', icon(k, 24)); b.setAttribute('aria-label', label);
      stops.push(hold(b, fn, rep)); pad.append(b);
    });
    controls.append(pad);
    cv = h('canvas', 'st-cv'); stage.append(cv); ctx = cv.getContext('2d');
    // Touch: the first clear direction locks the drag. Sideways steps the piece a column per cell of finger travel,
    // a slow drag down soft-drops, a quick flick down hard-drops, a flick up holds, and a tap rotates.
    cv.addEventListener('pointerdown', e => {
      if (swipe) return;
      e.preventDefault();
      const t = performance.now();
      swipe = { id: e.pointerId, x: e.clientX, y: e.clientY, ax: e.clientX, ay: e.clientY, lx: e.clientX, ly: e.clientY, t, axis: null, trail: [[t, e.clientY]] };
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    });
    cv.addEventListener('pointermove', e => {
      if (!swipe || e.pointerId !== swipe.id || modalOpen()) return;
      const t = performance.now(), tx = e.clientX - swipe.x, ty = e.clientY - swipe.y;
      swipe.lx = e.clientX; swipe.ly = e.clientY;
      swipe.trail.push([t, e.clientY]); while (swipe.trail.length > 2 && t - swipe.trail[0][0] > 90) swipe.trail.shift();
      if (!swipe.axis && Math.hypot(tx, ty) > cell * .45) {
        swipe.axis = Math.abs(tx) >= Math.abs(ty) ? 'h' : ty > 0 ? 'v' : 'up';
        if (swipe.axis === 'h') swipe.ay = e.clientY;
      }
      if (swipe.axis === 'h') {
        const step = cell * .85;
        while (e.clientX - swipe.ax >= step) { shift(1); swipe.ax += step; }
        while (swipe.ax - e.clientX >= step) { shift(-1); swipe.ax -= step; }
        // a deliberate turn downwards after moving sideways switches to soft drop
        if (e.clientY - swipe.ay > cell * 2.2 && Math.abs(e.clientX - swipe.ax) < step * .6) { swipe.axis = 'v'; swipe.ay = e.clientY; }
      } else if (swipe.axis === 'v') {
        while (e.clientY - swipe.ay >= cell) { soft(); swipe.ay += cell; }
      } else swipe.ay = Math.min(swipe.ay, e.clientY);
    });
    const endSwipe = e => {
      if (!swipe || e.pointerId !== swipe.id) return;
      const sw = swipe; swipe = null;
      if (e.type === 'pointercancel' || modalOpen()) return;
      // the lift event can arrive without a position, so use the last one the finger reported
      const t = performance.now(), ty = sw.ly - sw.y, [t0, y0] = sw.trail[0], vy = (sw.ly - y0) / Math.max(16, t - t0);
      if (!sw.axis) {
        if (t - sw.t < 400) (sw.lx - cv.getBoundingClientRect().left > W * cell ? holdPiece() : rotate(1));
      } else if (sw.axis === 'v' && vy > .55 && ty > cell * 1.5) hard();
      else if (sw.axis === 'up' && ty < -cell * 2 && vy < -.3) holdPiece();
    };
    cv.addEventListener('pointerup', endSwipe);
    cv.addEventListener('pointercancel', endSwipe);
    keyH = e => {
      if (modalOpen()) return;
      const k = e.key;
      if (k === 'ArrowLeft') shift(-1); else if (k === 'ArrowRight') shift(1); else if (k === 'ArrowDown') soft();
      else if (k === 'ArrowUp' || k === 'x') rotate(1); else if (k === 'z') rotate(-1); else if (k === ' ') hard();
      else if (k === 'c' || k === 'Shift') holdPiece(); else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', keyH);
    spawn(); layout(); stats();
    prev = performance.now(); raf = requestAnimationFrame(loop);
  }
  function unmount() { alive = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', keyH); stops.forEach(s => s()); }
  function hold(btn, fn, rep) {
    let t1, t2;
    const stop = () => { clearTimeout(t1); clearInterval(t2); };
    btn.addEventListener('pointerdown', e => { e.preventDefault(); if (modalOpen()) return; fn(); if (rep) t1 = setTimeout(() => { t2 = setInterval(fn, 60); }, 160); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
    return stop;
  }
  function layout() {
    cell = Math.floor(Math.min((stage.clientWidth - 12) / (W + PANEL), (stage.clientHeight - 12) / H));
    const dpr = window.devicePixelRatio || 1, cw = Math.round((W + PANEL) * cell);
    cv.width = cw * dpr; cv.height = H * cell * dpr;
    cv.style.width = cw + 'px'; cv.style.height = H * cell + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function stats() {
    const chips = [];
    if (mode === 'dig') chips.push({ html: `Junk <b>${junkLeft}</b>`, done: !junkLeft });
    else chips.push({ html: `Rows <b>${lines}</b>/${target}`, done: lines >= target });
    if (mode === 'sprint') { const t = Math.max(0, Math.ceil(timeLimit - elapsed / 1000)); chips.push({ html: `🚛 <b>${t}</b>s`, warn: t <= 10 }); }
    chips.push({ html: `Score ${score}` });
    if (combo > 0) chips.push({ html: `Combo ×${combo}` });
    if (b2b) chips.push({ html: 'B2B', done: true });
    setStats(chips);
  }

  /* ---------- pieces ---------- */
  const rotCW = m => m.map((row, r) => row.map((_, c) => m[m.length - 1 - c][r]));
  const rotCCW = m => m.map((row, r) => row.map((_, c) => m[c][m.length - 1 - r]));
  function fits(m, x, y) {
    for (let r = 0; r < m.length; r++) for (let c = 0; c < m.length; c++) {
      if (!m[r][c]) continue;
      const gx = x + c, gy = y + r;
      if (gx < 0 || gx >= W || gy >= H) return false;
      if (gy >= 0 && grid[gy][gx]) return false;
    }
    return true;
  }
  function take() { if (!bag.length) bag = shuffle(Object.keys(SH)); return bag.pop(); }
  function spawn(k) {
    while (queue.length < 4) queue.push(take());
    if (!k) k = queue.shift();
    queue.push(take());
    const m = SH[k].map(r => r.slice());
    piece = { k, m, rs: 0, x: Math.floor((W - m.length) / 2), y: k === 'I' ? -1 : 0 };
    lockT = 0; resets = 0; lastRot = false; fallAcc = 0;
    if (!fits(piece.m, piece.x, piece.y)) return gameOver();
    if (fits(piece.m, piece.x, piece.y + 1) && k !== 'I') piece.y++;
  }
  const grounded = () => piece && !fits(piece.m, piece.x, piece.y + 1);
  function touched() { if (grounded() && resets < LOCK_RESETS) { lockT = 0; resets++; } }
  function shift(dx) {
    if (!live()) return false;
    if (fits(piece.m, piece.x + dx, piece.y)) { piece.x += dx; lastRot = false; touched(); return true; }
    return false;
  }
  function rotate(dir) {
    if (!live() || piece.k === 'O') return;
    const to = (piece.rs + dir + 4) % 4, m = dir > 0 ? rotCW(piece.m) : rotCCW(piece.m);
    const kicks = (piece.k === 'I' ? KI : KJ)[`${piece.rs}>${to}`];
    for (const [kx, ky] of kicks) {
      if (fits(m, piece.x + kx, piece.y - ky)) {
        piece.m = m; piece.x += kx; piece.y -= ky; piece.rs = to; lastRot = true; touched();
        sfx.tick(); return;
      }
    }
  }
  function holdPiece() {
    if (!live() || holdUsed) return;
    const k = piece.k; holdUsed = true;
    if (holdK) { const h0 = holdK; holdK = k; spawn(h0); }
    else { holdK = k; spawn(); }
    sfx.swish();
  }
  const live = () => !over && piece && !modalOpen();
  function soft() { if (!live()) return; if (fits(piece.m, piece.x, piece.y + 1)) { piece.y++; score += 1; raw += 1; lastRot = false; fallAcc = 0; } }
  function hard() { if (!live()) return; let n = 0; while (fits(piece.m, piece.x, piece.y + 1)) { piece.y++; n++; } if (n) lastRot = false; score += n * 2; raw += n * 2; buzz(12); lock(); }

  function tspin() {
    if (piece.k !== 'T' || !lastRot) return false;
    const cx = piece.x + 1, cy = piece.y + 1;
    const filled = ([x, y]) => x < 0 || x >= W || y >= H || (y >= 0 && grid[y][x]);
    return [[cx - 1, cy - 1], [cx + 1, cy - 1], [cx - 1, cy + 1], [cx + 1, cy + 1]].filter(filled).length >= 3;
  }
  function lock() {
    const { m, x, y, k } = piece, ts = tspin(); let top = false;
    for (let r = 0; r < m.length; r++) for (let c = 0; c < m.length; c++) if (m[r][c]) { if (y + r < 0) top = true; else grid[y + r][x + c] = k; }
    piece = null; pieces++; holdUsed = false;
    if (top) return gameOver();
    let cleared = 0, junk = 0;
    for (let r = H - 1; r >= 0; r--) if (grid[r].every(v => v)) { if (grid[r].includes('G')) junk++; grid.splice(r, 1); grid.unshift(Array(W).fill(null)); cleared++; r++; }
    const lvl = speedLv();
    if (cleared || ts) {
      const base = ts ? [400, 800, 1200, 1600][cleared] : [0, 100, 300, 500, 800][cleared];
      const big = cleared && (ts || cleared === 4);
      let pts = base * lvl;
      if (big && b2b) pts = Math.round(pts * 1.5);
      if (cleared) { combo++; if (combo > 0) pts += 50 * combo * lvl; b2b = big ? true : false; } else combo = -1;
      const pc = cleared && grid.every(row => row.every(v => !v));
      if (pc) pts += 2000 * lvl;
      score += pts; raw += pts / lvl; lines += cleared; flashT = performance.now();
      if (mode === 'dig') junkLeft = Math.max(0, junkLeft - junk);
      const label = pc ? 'All clear!' : ts ? ['T-spin!', 'T-spin single!', 'T-spin double!', 'T-spin triple!'][cleared] : ['', '', 'Double', 'Triple', 'Four rows!'][cleared];
      if (label) popup = { t: (big && b2b && cleared && label !== 'All clear!' ? 'Back to back! ' : '') + label, at: performance.now() };
      else if (combo > 1) popup = { t: `Combo ×${combo}`, at: performance.now() };
      if (cleared) { sfx.clear(cleared); buzz(25); } else sfx.star(0);
      if (cleared === 4) say('FOUR ROWS! A legendary pack job!'); else if (ts && cleared) say('A T-spin! Bandit didn\'t know you could do that.'); else if (combo === 3) say('Combo! Keep the clears coming.');
    } else { combo = -1; sfx.land(); }
    stats();
    if ((mode === 'dig' && !junkLeft) || (mode !== 'dig' && lines >= target)) return finish();
    spawn();
  }

  /* ---------- junk ---------- */
  function junkRow(hole) { const row = Array(W).fill('G'); row[hole] = null; return row; }
  function addJunk(n, initial) {
    let hole = rnd(W);
    for (let i = 0; i < n; i++) {
      if (!initial && grid[0].some(v => v)) return false;
      if (Math.random() < .6) hole = (hole + 1 + rnd(W - 1)) % W;
      grid.shift(); grid.push(junkRow(hole));
    }
    if (piece && !fits(piece.m, piece.x, piece.y)) { if (fits(piece.m, piece.x, piece.y - 1)) piece.y--; else return false; }
    return true;
  }

  /* ---------- loop ---------- */
  const gravityMs = () => { const l = speedLv(); return Math.max(30, Math.pow(.8 - (l - 1) * .007, l - 1) * 1000); };
  function loop(ts) {
    if (!alive) return;
    const dt = Math.min(100, ts - prev); prev = ts;
    if (!over && piece && !modalOpen()) {
      elapsed += dt;
      if (grounded()) { lockT += dt; if (lockT >= LOCK_MS || resets >= LOCK_RESETS) lock(); }
      else { fallAcc += dt; const g = gravityMs(); while (fallAcc >= g && piece && fits(piece.m, piece.x, piece.y + 1)) { piece.y++; fallAcc -= g; lastRot = false; } if (grounded()) fallAcc = 0; }
      if (mode === 'rush' && !over) { rushAcc += dt; if (rushAcc >= rushEvery) { rushAcc = 0; if (!addJunk(1)) gameOver(); else { sfx.rumble(); popup = { t: 'Junk!', at: ts }; } } }
      if (mode === 'sprint' && !over) {
        if (Math.floor(elapsed / 1000) !== Math.floor((elapsed - dt) / 1000)) stats();
        if (elapsed >= timeLimit * 1000) timeUp();
      }
    }
    draw();
    raf = requestAnimationFrame(loop);
  }

  /* ---------- end ---------- */
  function finish() {
    over = true; stats();
    let stars;
    if (mode === 'dig') stars = pieces <= target * 2.6 ? 3 : pieces <= target * 3.6 ? 2 : 1;
    else if (mode === 'sprint') { const left = 1 - elapsed / 1000 / timeLimit; stars = left >= .3 ? 3 : left >= .15 ? 2 : 1; }
    else { const per = raw / Math.max(1, lines); stars = per >= 240 ? 3 : per >= 165 ? 2 : 1; }
    const caps = 15 + L * 2 + 5 * stars;
    S.stackBest = Math.max(S.stackBest || 0, score);
    win('stack', { stars, caps, title: mode === 'sprint' ? 'Beat the truck!' : 'Dumpster packed!',
      text: `${mode === 'dig' ? `Junk cleared in ${pieces} pieces.` : mode === 'sprint' ? `${Math.ceil(timeLimit - elapsed / 1000)} seconds to spare.` : `${lines} rows packed.`} Score ${score}. Bandit's crew can sleep in.` });
  }
  function clearBottom(n) { for (let i = 0; i < n; i++) { grid.pop(); grid.unshift(Array(W).fill(null)); } }
  function gameOver() {
    if (over) return;
    over = true; piece = null;
    const cost = CONT[Math.min(contN, CONT.length - 1)];
    const done = mode === 'dig' ? `${target - junkLeft} of ${target} junk rows cleared` : `${lines} of ${target} rows packed`;
    lose('stack', { title: 'The bin overflowed', text: `${done}. Bandit can stomp the trash down if you like.`,
      cont: { label: 'Stomp 5 rows', cost, fn: () => { contN++; if (mode === 'dig') junkLeft = Math.max(0, junkLeft - grid.slice(-5).filter(r => r.includes('G')).length); clearBottom(5); over = false; stats(); spawn(); if (mode === 'dig' && !junkLeft) finish(); } } });
  }
  function timeUp() {
    over = true;
    const cost = CONT[Math.min(contN, CONT.length - 1)];
    lose('stack', { title: 'The truck came', text: `${lines} of ${target} rows packed when the truck pulled up.`,
      cont: { label: '+20 seconds', cost, fn: () => { contN++; timeLimit += 20; over = false; stats(); } } });
  }

  /* ---------- drawing ---------- */
  function rr(x, y, w, hh, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r); ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function block(px, py, s, color, alpha = 1) {
    const p = Math.max(1, s * .06);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color; rr(px + p, py + p, s - 2 * p, s - 2 * p, s * .22); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.3)'; rr(px + s * .22, py + s * .16, s * .56, s * .16, s * .08); ctx.fill();
    ctx.fillStyle = 'rgba(20,16,40,.2)'; rr(px + p * 2, py + s * .72, s - 4 * p, s * .18, s * .09); ctx.fill();
    ctx.globalAlpha = 1;
  }
  function mini(k, cx, cy, s, alpha = 1) {
    const m = SH[k]; let x0 = 9, x1 = 0, y0 = 9, y1 = 0;
    m.forEach((row, y) => row.forEach((v, x) => { if (v) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }));
    const ox = cx - (x1 - x0 + 1) * s / 2, oy = cy - (y1 - y0 + 1) * s / 2;
    m.forEach((row, y) => row.forEach((v, x) => { if (v) block(ox + (x - x0) * s, oy + (y - y0) * s, s, COL[k], alpha); }));
  }
  function draw() {
    if (!ctx || !cell) return;
    const s = cell, bw = W * s, pw = PANEL * s;
    ctx.clearRect(0, 0, bw + pw, H * s);
    ctx.fillStyle = TK.well; ctx.fillRect(0, 0, bw, H * s);
    const high = grid.findIndex(row => row.some(v => v));
    if (high >= 0 && high < 4) { ctx.fillStyle = 'rgba(255,112,150,.12)'; ctx.fillRect(0, 0, bw, 4 * s); }
    ctx.strokeStyle = 'rgba(255,243,214,.05)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 1; x < W; x++) { ctx.moveTo(x * s + .5, 0); ctx.lineTo(x * s + .5, H * s); }
    for (let y = 1; y < H; y++) { ctx.moveTo(0, y * s + .5); ctx.lineTo(bw, y * s + .5); }
    ctx.stroke();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid[y][x]) block(x * s, y * s, s, COL[grid[y][x]]);
    if (piece) {
      let gy = piece.y; while (fits(piece.m, piece.x, gy + 1)) gy++;
      const m = piece.m, fade = grounded() ? 1 - .45 * Math.min(1, lockT / LOCK_MS) : 1;
      for (let r = 0; r < m.length; r++) for (let c = 0; c < m.length; c++) if (m[r][c]) {
        if (gy + r >= 0) block((piece.x + c) * s, (gy + r) * s, s, COL[piece.k], .2);
        if (piece.y + r >= 0) block((piece.x + c) * s, (piece.y + r) * s, s, COL[piece.k], fade);
      }
    }
    const f = performance.now() - flashT;
    if (f < 200) { ctx.fillStyle = `rgba(255,243,214,${.18 * (1 - f / 200)})`; ctx.fillRect(0, 0, bw, H * s); }
    // side panel: hold on top, next three below
    const px = bw + s * .5, pcx = bw + pw / 2 + s * .25, ms = s * .62;
    ctx.fillStyle = TK.muted; ctx.font = `800 ${Math.round(s * .5)}px "Baloo 2", sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('HOLD', pcx, s * .8);
    ctx.fillStyle = TK.dusk; rr(px, s * 1.05, pw - s * .5, s * 2.4, s * .3); ctx.fill();
    if (holdK) mini(holdK, pcx, s * 2.25, ms, holdUsed ? .35 : 1);
    ctx.fillStyle = TK.muted; ctx.fillText('NEXT', pcx, s * 4.4);
    ctx.fillStyle = TK.dusk; rr(px, s * 4.65, pw - s * .5, s * 7.2, s * .3); ctx.fill();
    queue.slice(0, 3).forEach((k, i) => mini(k, pcx, s * (5.85 + i * 2.35), ms, i ? .8 : 1));
    if (popup) {
      const a = (performance.now() - popup.at) / 1100;
      if (a >= 1) popup = null;
      else {
        ctx.globalAlpha = 1 - a * a; ctx.fillStyle = '#ffb547'; ctx.font = `${Math.round(s * .95)}px "Bagel Fat One", sans-serif`;
        ctx.fillText(popup.t, bw / 2, H * s * .42 - a * s * 1.5); ctx.globalAlpha = 1;
      }
    }
    ctx.textAlign = 'start';
  }
  return { mount, unmount, layout, _peek: () => piece && { x: piece.x, y: piece.y, rs: piece.rs, k: piece.k, score, cell } };
})();
