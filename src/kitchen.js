
/* =====================================================================
   Midnight Kitchen (merge). Each night has a fixed queue of guests and an energy budget.
   ===================================================================== */
const Kitchen = (() => {
  const COLS = 6, ROWS = 7, GAP = 5, CONT = [30, 60, 90];
  const CH = [
    { gen: '🗑️', gname: 'trash can', items: ['🥜', '🍪', '🥪', '🍔', '🍕', '🎂', '🍱'], names: ['Peanut', 'Cookie', 'Sandwich', 'Burger', 'Pizza', 'Cake', 'Bento box'] },
    { gen: '🌳', gname: 'tree', items: ['🫐', '🍓', '🍎', '🍉', '🍍', '🧺'], names: ['Blueberry', 'Strawberry', 'Apple', 'Watermelon', 'Pineapple', 'Fruit basket'] },
    { gen: '🫖', gname: 'kettle', items: ['🧊', '🥛', '🍵', '☕', '🧋', '🍹'], names: ['Ice cube', 'Milk', 'Tea', 'Coffee', 'Bubble tea', 'Moon punch'] },
  ];
  const GUESTS = [['Mo', '#a59f8f'], ['Hazel', '#b59a86'], ['Biscuit', '#9aa3b5'], ['Waffles', '#a89cc0'], ['Pip', CREW.pop.fur], ['Bandit', CREW.stack.fur], ['Juniper', CREW.sort.fur], ['Clover', '#9db0a4'], ['Noodle', '#a7a2b0']];
  const VIPS = [['The Mayor', '#c2b59b'], ['Duchess Fluff', '#c9b6d6'], ['Sir Whiskers', '#a9b8c9']];
  let st, wrap, boardEl, ordersEl, cell, drag, alive, selI, tossB;

  /* ---------- a night ---------- */
  function night(N) {
    const chains = N >= 4 ? 3 : 2, maxT = Math.min(5, 2 + Math.floor(N / 3)), p = N >= 3 ? .15 : 0;
    const nOrders = Math.min(10, 3 + Math.ceil(N * .6));
    const grid = Array(ROWS * COLS).fill(null), b = (ROWS - 1) * COLS;
    grid[b] = { gen: 0 }; grid[b + COLS - 1] = { gen: 1 }; if (chains === 3) grid[b + 2] = { gen: 2 };
    const queue = []; let vips = 0, need = 0;
    for (let i = 0; i < nOrders; i++) {
      const vip = N >= 3 && i >= 2 && vips < 2 && Math.random() < .25;
      const nw = N >= 2 && Math.random() < .45 ? 2 : 1, wants = [];
      for (let j = 0; j < nw; j++) {
        let t = 1 + rnd(maxT); if (N >= 4 && Math.random() < .5) t = Math.max(t, 1 + rnd(maxT));
        if (nw === 2) t = Math.max(1, t - 1);
        wants.push({ g: rnd(chains), t });
      }
      const units = wants.reduce((s, w) => s + 2 ** w.t, 0);
      const [who, fur] = vip ? VIPS[vips] : GUESTS[rnd(GUESTS.length)];
      const caps = wants.reduce((s, w) => s + (w.t + 1) * (w.t + 1), 0) + 3;
      queue.push({ who, fur, wants, vip, caps: vip ? caps * 2 : caps, patience: vip ? Math.ceil(units * 1.5 + 8) : 0, units });
      if (vip) vips++; else need += units;
    }
    const crates = N >= 2 ? Math.min(10, 1 + N) : 0;
    const free = grid.map((x, i) => x ? -1 : i).filter(i => i >= 0 && i < b);
    shuffle(free).slice(0, crates).forEach(i => { grid[i] = { g: rnd(chains), t: rnd(Math.min(3, maxT)), box: 1 }; });
    const slack = Math.max(1.06, 1.3 - .025 * N);
    const ideal = need / (1 + p), budget = Math.ceil(ideal * slack) + 2;
    const orders = queue.splice(0, 3);
    return { N, grid, queue, orders, energy: budget, budget, extra: budget - ideal, served: 0, required: nOrders - vips, p, contN: 0, vipServed: 0 };
  }

  function mount() {
    alive = true; drag = null; selI = -1;
    if (!S.kitchen || S.kitchen.N !== S.lv.merge) S.kitchen = night(S.lv.merge);
    st = S.kitchen;
    setTitle(`Night ${st.N}`);
    const first = st.orders.find(o => o.vip);
    say(st.N === 1 ? 'Tap the trash can and the tree for ingredients, then drag matching pairs together. Energy is tight tonight!'
      : st.N === 4 ? 'I got a kettle! Now guests want drinks too.'
      : first ? `${first.who} is here! VIPs pay back energy, but they won't wait long.`
      : `Night ${st.N}. ${plural(st.required, 'guest')} tonight and ${st.energy} ⚡ to cook with.`);
    wrap = h('div', 'mg-wrap'); ordersEl = h('div', 'mg-orders'); boardEl = h('div', 'mg-board');
    wrap.append(ordersEl, boardEl); stage.append(wrap);
    boardEl.addEventListener('pointerdown', down);
    boardEl.addEventListener('pointermove', move);
    boardEl.addEventListener('pointerup', up);
    boardEl.addEventListener('pointercancel', cancel);
    tossB = h('button', 'btn ghost', '🗑 Toss'); tossB.disabled = true; tossB.onclick = toss;
    const rs = h('button', 'btn ghost', 'Restart night'); rs.onclick = () => { S.kitchen = null; save(); openGame('merge'); };
    controls.append(tossB, rs);
    renderOrders(); layout(); stats(); save();
  }
  function unmount() { alive = false; if (drag && drag.ghost) drag.ghost.remove(); drag = null; }
  function layout() {
    const H = stage.clientHeight - ordersEl.offsetHeight - 12;
    cell = Math.max(24, Math.floor(Math.min((stage.clientWidth - (COLS - 1) * GAP) / COLS, (H - (ROWS - 1) * GAP) / ROWS, 60)));
    boardEl.style.setProperty('--cell', cell + 'px');
    renderBoard();
  }
  function stats() {
    setStats([{ html: `⚡ <b>${st.energy}</b>`, warn: st.energy <= Math.max(3, st.budget * .1) }, { html: `Guests <b>${st.served}</b>/${st.required}`, done: st.served >= st.required },
      { html: `Waiting ${st.queue.filter(o => !o.vip).length}` }]);
  }

  const isItem = it => it && it.gen == null && !it.box;
  const isWanted = it => st.orders.some(o => o.wants.some(w => w.g === it.g && w.t === it.t));
  function canServe(o) {
    const used = new Set();
    return o.wants.every(w => { const i = st.grid.findIndex((it, j) => !used.has(j) && isItem(it) && it.g === w.g && it.t === w.t); if (i < 0) return false; used.add(i); return true; });
  }
  function renderOrders() {
    ordersEl.innerHTML = '';
    st.orders.forEach((o, oi) => {
      const ok = canServe(o);
      const card = h('div', 'order' + (ok ? ' ready' : '') + (o.vip ? ' vip' : ''));
      const bar = o.vip ? `<div class="patience" title="Patience"><i style="width:${Math.max(0, o.patience / Math.ceil(o.units * 1.5 + 8) * 100)}%"></i></div>` : '';
      card.innerHTML = `${coonSVG(o.fur, o.vip ? 'vip' : null, 34)}<div class="oname">${o.who}</div><div class="wants">${o.wants.map(w => `<span title="${CH[w.g].names[w.t]}">${CH[w.g].items[w.t]}</span>`).join('')}</div>${bar}`;
      const b = h('button', 'btn sm', ok ? `Serve ${CAPSM}${o.caps}` : `${CAPSM}${o.caps}`);
      b.disabled = !ok; b.setAttribute('aria-label', `Serve ${o.who} for ${o.caps} caps`);
      b.onclick = () => serve(oi);
      card.append(b); ordersEl.append(card);
    });
    for (let i = st.orders.length; i < 3; i++) ordersEl.append(h('div', 'order empty', '<div class="oname">No one waiting</div>'));
  }
  function renderBoard(flash) {
    boardEl.innerHTML = '';
    st.grid.forEach((it, i) => {
      const d = h('div', 'mc');
      if (it) {
        if (it.gen != null) { d.classList.add('gen'); d.innerHTML = `<span>${CH[it.gen].gen}</span>`; }
        else if (it.box) { d.classList.add('box'); d.innerHTML = `<b>${CH[it.g].items[it.t]}</b>`; }
        else { d.innerHTML = `<span>${CH[it.g].items[it.t]}</span><i>${it.t + 1}</i>`; if (isWanted(it)) d.classList.add('want'); }
      }
      if (i === selI) d.classList.add('picked');
      if (flash) (Array.isArray(flash) ? flash : [flash]).forEach(f => { if (f.i === i) d.classList.add(f.cls); });
      boardEl.append(d);
    });
  }
  function refresh(flash) { renderOrders(); renderBoard(flash); stats(); updateCaps(); save(); }
  function select(i) { selI = i; tossB.disabled = i < 0; }

  /* ---------- input ---------- */
  function idx(e) {
    const b = boardEl.getBoundingClientRect(), step = cell + GAP;
    const c = Math.floor((e.clientX - b.left) / step), r = Math.floor((e.clientY - b.top) / step);
    return c < 0 || c >= COLS || r < 0 || r >= ROWS ? -1 : r * COLS + c;
  }
  function down(e) {
    if (modalOpen()) return;
    const i = idx(e); if (i < 0 || !st.grid[i]) return;
    drag = { i, x: e.clientX, y: e.clientY, moved: false, ghost: null };
    try { boardEl.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function move(e) {
    if (!drag) return;
    const it = st.grid[drag.i]; if (!isItem(it)) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.ghost = h('div', 'drag-ghost', CH[it.g].items[it.t]); drag.ghost.style.fontSize = cell * .75 + 'px';
      document.body.append(drag.ghost);
      boardEl.children[drag.i]?.classList.add('lifted');
    }
    drag.ghost.style.transform = `translate(${e.clientX}px,${e.clientY}px) translate(-50%,-65%)`;
  }
  function cancel() { if (drag && drag.ghost) drag.ghost.remove(); drag = null; renderBoard(); }
  function up(e) {
    if (!drag) return;
    const d = drag; drag = null; if (d.ghost) d.ghost.remove();
    if (!d.moved) return tap(d.i);
    const j = idx(e), src = st.grid[d.i];
    if (j < 0 || j === d.i || !isItem(src)) return renderBoard();
    const dst = st.grid[j];
    select(-1);
    if (!dst) { st.grid[j] = src; st.grid[d.i] = null; sfx.tap(); }
    else if (!isItem(dst)) { sfx.bad(); return renderBoard(); }
    else if (dst.g === src.g && dst.t === src.t && src.t < CH[src.g].items.length - 1) return merge(d.i, j);
    else { st.grid[j] = src; st.grid[d.i] = dst; sfx.tap(); }
    refresh(); check();
  }
  function merge(a, j) {
    const src = st.grid[a], t = src.t + 1;
    st.grid[j] = { g: src.g, t }; st.grid[a] = null;
    const flash = [{ i: j, cls: 'merged' }];
    const r = Math.floor(j / COLS), c = j % COLS;
    [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([rr, cc]) => {
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) return;
      const k = rr * COLS + cc, it = st.grid[k];
      if (it && it.box) { delete it.box; flash.push({ i: k, cls: 'opened' }); }
    });
    sfx.good(); buzz(15);
    if (flash.length > 1) say(`Crate popped open! There was a ${CH[st.grid[flash[1].i].g].names[st.grid[flash[1].i].t]} inside.`);
    else if (t >= 4) say(`A ${CH[src.g].names[t]}! Fancy.`);
    refresh(flash); check();
  }
  function tap(i) {
    const it = st.grid[i]; if (!it) return;
    if (it.gen != null) return spawn(it.gen, i);
    if (it.box) { select(-1); renderBoard(); say(`There's a ${CH[it.g].names[it.t]} in that crate. Cook something right next to it to open it.`); return; }
    select(selI === i ? -1 : i); renderBoard();
    const nm = CH[it.g].names[it.t], nx = CH[it.g].names[it.t + 1];
    say(nx ? `That's a ${nm}. Two of them make a ${nx}.` : `A ${nm}! Top of the menu.`);
  }
  function toss() {
    if (selI < 0 || !isItem(st.grid[selI])) return select(-1);
    const it = st.grid[selI]; st.grid[selI] = null; select(-1);
    say(`Tossed the ${CH[it.g].names[it.t].toLowerCase()}. Room to cook.`); sfx.tap();
    refresh(); check();
  }
  function spawn(g, i) {
    if (st.energy <= 0) { say('No energy left. Serve what you can, or cook what\'s on the board.'); sfx.bad(); shakeEl(statsEl); check(); return; }
    const r0 = Math.floor(i / COLS), c0 = i % COLS; let best = [], bd = 1e9;
    st.grid.forEach((it, j) => {
      if (it) return;
      const dd = Math.abs(Math.floor(j / COLS) - r0) + Math.abs(j % COLS - c0);
      if (dd < bd) { bd = dd; best = [j]; } else if (dd === bd) best.push(j);
    });
    if (!best.length) { say('The stall is full! Cook, serve or toss something first.'); sfx.bad(); shakeEl(boardEl); return; }
    const j = best[rnd(best.length)];
    st.grid[j] = { g, t: Math.random() < st.p ? 1 : 0 };
    st.energy--;
    st.orders.forEach(o => { if (o.vip) o.patience--; });
    const gone = st.orders.findIndex(o => o.vip && o.patience <= 0);
    if (gone >= 0) {
      const o = st.orders[gone]; st.orders.splice(gone, 1); fill();
      say(`${o.who} got tired of waiting and left. Oh dear.`); sfx.bad();
    }
    sfx.pop(); refresh({ i: j, cls: 'spawn' }); check();
  }
  function fill() { while (st.orders.length < 3 && st.queue.length) st.orders.push(st.queue.shift()); }
  function serve(oi) {
    const o = st.orders[oi]; if (!o || !canServe(o)) return;
    o.wants.forEach(w => { const i = st.grid.findIndex(it => isItem(it) && it.g === w.g && it.t === w.t); st.grid[i] = null; if (i === selI) select(-1); });
    S.caps += o.caps; st.orders.splice(oi, 1); fill();
    if (o.vip) { const back = Math.ceil(o.units / 2) + 2; st.energy += back; st.vipServed++; toast(`${o.who} tipped ${o.caps} caps and ${back} ⚡!`); say(`${o.who} was delighted! That's a big tip.`); }
    else { st.served++; toast(`${o.who} paid ${o.caps} caps. Yum!`); say(`${o.who} loved it. Who's next?`); }
    sfx.good(); buzz(20);
    refresh(); check();
  }
  function check() {
    if (!alive) return;
    if (st.served >= st.required) return finish();
    if (st.energy > 0 || st.orders.some(canServe)) return;
    const seen = new Set();
    const canMerge = st.grid.some(it => { if (!isItem(it) || it.t >= CH[it.g].items.length - 1) return false; const k = it.g * 10 + it.t; if (seen.has(k)) return true; seen.add(k); return false; });
    if (canMerge) return;
    const cost = CONT[Math.min(st.contN, CONT.length - 1)];
    setTimeout(() => alive && lose('merge', { title: 'Out of energy', text: `${st.served} of ${st.required} guests served. Rosie needs a little more energy to finish the night.`,
      cont: { label: '+10 ⚡', cost, fn: () => { st.contN++; st.energy += 10; save(); stats(); say('A cup of coffee and ten more energy. Let\'s finish this!'); } } }), 400);
  }
  function finish() {
    const left = st.energy, stars = left >= Math.max(2, st.extra * .45) ? 3 : left >= Math.max(1, st.extra * .15) ? 2 : 1;
    const caps = 15 + 5 * stars + st.vipServed * 10, N = st.N;
    S.kitchen = null;
    setTimeout(() => alive && win('merge', { stars, caps, title: 'Night served!',
      text: `Every guest went home full${left ? `, with ${left} ⚡ to spare` : ''}.${st.vipServed ? ` ${plural(st.vipServed, 'VIP')} served too.` : ''}`, nextLabel: `Night ${N + 1}` }), 500);
  }
  return { mount, unmount, layout };
})();
