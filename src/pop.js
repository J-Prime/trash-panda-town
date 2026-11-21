
/* =====================================================================
   Snack Pop (match three). Logic lives in PopEngine; this replays its frames.
   ===================================================================== */
const Pop = (() => {
  const E = PopEngine, R = E.ROWS, C = E.COLS;
  const SN = ['🍓', '🧀', '🍩', '🥨', '🍪', '🫐'];
  const SMASH = 25, SHAKE = 15, CONT = [30, 60, 90];
  let st, cfg, board, cell, els, jam, selEl, busy, alive, sel, start, smashMode, contN, idleT, lastSn, boostBtns;

  function mount() {
    alive = true; busy = false; sel = null; start = null; smashMode = false; contN = 0;
    cfg = E.level(S.lv.pop);
    st = E.create(cfg, (Date.now() ^ (S.lv.pop * 7919)) | 0);
    board = h('div', 'pop-board'); stage.append(board);
    els = new Map(); jam = [];
    for (let r = 0; r < R; r++) { jam.push([]); for (let c = 0; c < C; c++) { const j = h('div', 'jm'); board.append(j); jam[r].push(j); } }
    if (cfg.acorns) board.append(h('div', 'basket', '<span>🧺 Basket</span>'));
    selEl = h('div', 'pop-sel'); selEl.hidden = true; board.append(selEl);
    board.addEventListener('pointerdown', down);
    board.addEventListener('pointermove', movep);
    board.addEventListener('pointerup', up);
    board.addEventListener('pointercancel', () => { start = null; });
    const smashB = h('button', 'btn ghost', `${PAWI(20)} Smash · ${CAPSM}${SMASH}`);
    const shakeB = h('button', 'btn ghost', `🧺 Shake · ${CAPSM}${SHAKE}`);
    smashB.onclick = toggleSmash; shakeB.onclick = shakeBoard;
    boostBtns = { smashB, shakeB };
    controls.append(smashB, shakeB);
    layout();
    lastSn = { g: st.grid, jam: st.jam };
    render(lastSn, true);
    stats(); intro(); idle();
  }
  function unmount() { alive = false; clearTimeout(idleT); }
  function layout() {
    cell = Math.max(24, Math.floor(Math.min(stage.clientWidth / C, stage.clientHeight / R, 62)));
    board.style.setProperty('--cell', cell + 'px');
    board.style.width = cell * C + 'px'; board.style.height = cell * R + 'px';
    jam.forEach((row, r) => row.forEach((j, c) => { j.style.transform = `translate(${c * cell}px,${r * cell}px)`; }));
    if (lastSn) render(lastSn);
    if (sel) showSel(sel);
  }

  function intro() {
    const g = E.goals(st), L = S.lv.pop, mv = `${st.moves} moves`;
    const col = Object.entries(g.collect).map(([t, n]) => `${n} ${SN[t]}`).join(', ');
    const lines = {
      collect: `Help me collect ${col} in ${mv}.${L === 1 ? ' Match 4 or 5 to make specials.' : ''}`,
      jam: `Jam everywhere! Match on the sticky squares to wipe them up. Thick jam takes two. ${mv}.`,
      crate: `Crates in the way. Match next to them to break them. Banded crates take two hits. And I need ${col}. ${mv}.`,
      acorn: `Drop ${plural(g.acorns, 'acorn')} into the basket at the bottom. Swipe an acorn into the snack below to roll it down. ${mv}.`,
    };
    say(lines[cfg.theme] + (g.crates && cfg.theme !== 'crate' ? ' Break every crate too.' : ''));
  }
  function stats() {
    const g = E.goals(st), chips = [{ html: `Moves <b>${st.moves}</b>`, warn: st.moves <= 3 }];
    Object.entries(g.collect).forEach(([t, n]) => chips.push({ html: `<span class="e">${SN[t]}</span>${Math.max(0, n)}`, done: n <= 0 }));
    if (cfg.theme === 'jam' || g.jam) chips.push({ html: `<span class="e">🍯</span>${g.jam}`, done: !g.jam });
    if (cfg.crates.some(r => r.some(Boolean))) chips.push({ html: `<span class="e">📦</span>${g.crates}`, done: !g.crates });
    if (cfg.acorns) chips.push({ html: `<span class="e">🌰</span>${Math.max(0, g.acorns)}`, done: g.acorns <= 0 });
    setStats(chips);
  }

  /* ---------- drawing ---------- */
  function place(e, r, c, instant) {
    if (instant) e.style.transition = 'none';
    e.style.transform = `translate(${c * cell}px,${r * cell}px)`;
    if (instant) { void e.offsetWidth; e.style.transition = ''; }
  }
  function paint(e, o) {
    const key = `${o.k}${o.t}${o.sp}${o.hp}`;
    if (e._k === key) return;
    const was = e._k; e._k = key;
    if (o.k === 'crate') { e.className = 'pc crate' + (o.hp > 1 ? ' hp2' : ''); e.innerHTML = '<i></i>'; if (was) { e.classList.add('hit'); } return; }
    if (o.k === 'acorn') { e.className = 'pc acorn'; e.innerHTML = '<span>🌰</span>'; return; }
    e.className = 'pc' + (o.sp ? ' sp-' + o.sp : '') + (was && o.sp ? ' made' : '');
    e.innerHTML = `<span>${o.sp === 'r' ? '🥮' : SN[o.t]}</span>`;
  }
  function render(sn, intro) {
    lastSn = sn;
    const seen = new Set();
    sn.g.forEach((row, r) => row.forEach((o, c) => {
      if (!o) return;
      seen.add(o.id);
      let e = els.get(o.id);
      if (!e) {
        e = h('div', 'pc'); board.insertBefore(e, selEl); els.set(o.id, e);
        place(e, intro ? r - R - 1 : o.from != null ? o.from : r, c, true);
      }
      paint(e, o); place(e, r, c);
    }));
    for (const [id, e] of els) if (!seen.has(id)) { els.delete(id); e.classList.add('gone'); setTimeout(() => e.remove(), 280); }
    sn.jam.forEach((row, r) => row.forEach((v, c) => { jam[r][c].className = 'jm' + (v ? ' j' + Math.min(2, v) : ''); }));
  }
  function fx(list) {
    list.forEach(f => {
      const e = h('div', 'fx ' + f.type);
      if (f.type === 'h') e.style.top = f.r * cell + 'px';
      if (f.type === 'v') e.style.left = f.c * cell + 'px';
      if (f.type === 'b' || f.type === 'r') {
        const rad = (f.rad || 0) + .5;
        Object.assign(e.style, { left: (f.c + .5 - rad) * cell + 'px', top: (f.r + .5 - rad) * cell + 'px', width: rad * 2 * cell + 'px', height: rad * 2 * cell + 'px' });
      }
      board.append(e); setTimeout(() => e.remove(), 520);
    });
  }
  function cheer(t) { const e = h('div', 'cheer', t); board.append(e); setTimeout(() => e.remove(), 1000); }

  async function play(frames) {
    for (const f of frames) {
      if (!alive) return;
      if (f.type === 'swap') { render(f.snap); await sleep(170); }
      else if (f.type === 'convert') { render(f.snap); sfx.good(); await sleep(360); }
      else if (f.type === 'clear') {
        if (f.fx.length) { fx(f.fx); sfx.boom(); buzz(15); }
        render(f.snap); sfx.pop(f.step); stats();
        if (f.step === 3) cheer('Tasty!'); else if (f.step === 4) cheer('Delicious!'); else if (f.step === 6) cheer('Snacktastic!');
        await sleep(f.fx.length ? 300 : 200);
      } else if (f.type === 'fall') { render(f.snap); await sleep(220); }
      else if (f.type === 'collect') { render(f.snap); sfx.good(); stats(); await sleep(240); }
      else if (f.type === 'shuffle') { say('No moves left on the board, so I gave the basket a shake.'); render(f.snap); await sleep(450); }
    }
    if (alive) render({ g: st.grid, jam: st.jam });
  }

  /* ---------- input ---------- */
  function rc(e) { const b = board.getBoundingClientRect(); return [Math.floor((e.clientY - b.top) / cell), Math.floor((e.clientX - b.left) / cell)]; }
  const inside = ([r, c]) => r >= 0 && r < R && c >= 0 && c < C;
  function showSel(p) { sel = p; selEl.hidden = !p; if (p) selEl.style.transform = `translate(${p[1] * cell}px,${p[0] * cell}px)`; }
  function down(e) {
    if (busy || modalOpen()) return;
    const p = rc(e); if (!inside(p)) return;
    unhint();
    if (smashMode) { doSmash(p); return; }
    start = { p, x: e.clientX, y: e.clientY };
    try { board.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function movep(e) {
    if (!start || busy) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < cell * .35) return;
    const [r, c] = start.p, t = Math.abs(dx) > Math.abs(dy) ? [r, c + Math.sign(dx)] : [r + Math.sign(dy), c];
    start = null;
    if (inside(t)) trySwap([r, c], t);
  }
  function up() {
    if (!start) return;
    const p = start.p; start = null;
    if (sel && Math.abs(sel[0] - p[0]) + Math.abs(sel[1] - p[1]) === 1) { const a = sel; showSel(null); trySwap(a, p); return; }
    if (sel && sel[0] === p[0] && sel[1] === p[1]) { showSel(null); return; }
    const o = st.grid[p[0]][p[1]];
    if (o && o.k !== 'crate') { showSel(p); sfx.tap(); }
  }

  async function trySwap(a, b) {
    if (busy) return;
    showSel(null);
    const A = st.grid[a[0]][a[1]], B = st.grid[b[0]][b[1]];
    if (!A || !B) return;
    if (A.k === 'crate' || B.k === 'crate') { sfx.bad(); shakeEl(els.get((A.k === 'crate' ? A : B).id)); return; }
    busy = true; clearTimeout(idleT);
    const res = E.applySwap(st, a, b);
    if (!res.ok) {
      sfx.bad();
      const ea = els.get(A.id), eb = els.get(B.id);
      place(ea, ...b); place(eb, ...a); await sleep(180);
      place(ea, ...a); place(eb, ...b); await sleep(200);
      busy = false; idle(); return;
    }
    sfx.tap(); stats();
    if (res.combo) say({ rr: 'Two moon pies! The whole basket is gone!', r: 'Moon pie! Every one of those, gone.', rh: 'Moon pie plus a blaster. Blasters everywhere!', rv: 'Moon pie plus a blaster. Blasters everywhere!', rb: 'Moon pie plus a bomb. Bombs everywhere!', bb: 'Double bomb! Kaboom!', bh: 'Bomb and blaster, giant cross!', bv: 'Bomb and blaster, giant cross!', hh: 'Cross blast!', hv: 'Cross blast!', vv: 'Cross blast!' }[res.combo] || 'Combo!');
    else if (res.roll) say('Roll, little acorn, roll.');
    await play(res.frames);
    busy = false;
    after();
  }
  function after() {
    if (!alive) return;
    stats();
    if (E.isDone(st)) return finish();
    if (st.moves <= 0) return outOfMoves();
    if (st.moves === 3) say('Only 3 moves left. Make them count!');
    idle();
  }

  /* ---------- boosters ---------- */
  function toggleSmash() {
    if (busy) return;
    if (!smashMode && S.caps < SMASH) { toast(`Smash costs ${SMASH} caps.`); sfx.bad(); return; }
    smashMode = !smashMode; boostBtns.smashB.classList.toggle('on', smashMode);
    board.classList.toggle('aiming', smashMode);
    say(smashMode ? 'Tap anything to smash it. Specials go off, crates crack, jam gets wiped.' : 'Never mind, paws away.');
    sfx.tap();
  }
  async function doSmash(p) {
    const o = st.grid[p[0]][p[1]];
    if (!o) return;
    if (o.k === 'acorn') { toast('Acorns are too tough to smash.'); return; }
    if (!spend(SMASH)) return;
    smashMode = false; boostBtns.smashB.classList.remove('on'); board.classList.remove('aiming');
    busy = true; clearTimeout(idleT);
    const res = E.smash(st, ...p);
    buzz(25);
    await play(res.frames);
    busy = false; after();
  }
  async function shakeBoard() {
    if (busy || !spend(SHAKE)) return;
    busy = true; unhint();
    E.reshuffle(st); render({ g: st.grid, jam: st.jam }); sfx.good();
    say('Shook the whole basket up. Fresh look!');
    await sleep(300); busy = false; idle();
  }

  /* ---------- hint ---------- */
  function unhint() { clearTimeout(idleT); board.querySelectorAll('.hint').forEach(e => e.classList.remove('hint')); }
  function idle() {
    unhint();
    idleT = setTimeout(() => {
      if (!alive || busy || modalOpen()) return idle();
      const mv = E.validMoves(st); if (!mv.length) return;
      const m = mv[rnd(mv.length)];
      m.forEach(([r, c]) => els.get(st.grid[r][c].id)?.classList.add('hint'));
    }, 6000);
  }

  /* ---------- end ---------- */
  function finish() {
    clearTimeout(idleT);
    const left = st.moves, mv = cfg.moves;
    const stars = left >= Math.max(3, Math.round(mv * .22)) ? 3 : left >= Math.max(1, Math.round(mv * .1)) ? 2 : 1;
    const caps = 10 + 2 * left + 5 * stars;
    say('That\'s everything! Picnic saved.');
    setTimeout(() => alive && win('pop', { stars, caps, title: 'Picnic saved!',
      text: left ? `${plural(left, 'move')} to spare. Pip is doing a happy little dance.` : 'Done on the very last move!' }), 600);
  }
  function outOfMoves() {
    const g = E.goals(st), bits = [];
    Object.entries(g.collect).forEach(([t, n]) => { if (n > 0) bits.push(`${n} ${SN[t]}`); });
    if (g.jam) bits.push(`${g.jam} jam`); if (g.crates) bits.push(plural(g.crates, 'crate'));
    if (g.acorns > 0) bits.push(plural(g.acorns, 'acorn'));
    const cost = CONT[Math.min(contN, CONT.length - 1)];
    lose('pop', { title: 'Out of moves', text: `So close. Still to go: ${bits.join(', ')}.`,
      cont: { label: '+5 moves', cost, fn: () => { contN++; st.moves += 5; stats(); say('Five more moves. Go go go!'); idle(); } } });
  }

  return { mount, unmount, layout };
})();
