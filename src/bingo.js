
/* =====================================================================
   Moonlight Bingo: patterns, rival players, a daub window and the lucky paw.
   ===================================================================== */
const Bingo = (() => {
  const LINGO = { 1: "Kelly's eye", 2: 'one little duck', 3: 'cup of tea', 7: 'lucky seven', 8: 'garden gate', 9: 'doctor\'s orders', 10: "Maple's den", 11: 'legs eleven', 13: 'unlucky for some', 16: 'sweet sixteen', 21: 'key of the door', 22: 'two little ducks', 26: 'pick and mix', 30: 'dirty Gertie', 44: 'droopy drawers', 45: 'halfway there', 50: 'half a century', 52: 'chicken vindaloo', 66: 'clickety click', 71: 'bang on the drum', 75: 'strive and strive' };
  const LINES = [];
  for (let i = 0; i < 5; i++) { LINES.push([0, 1, 2, 3, 4].map(c => i * 5 + c)); LINES.push([0, 1, 2, 3, 4].map(r => r * 5 + i)); }
  LINES.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
  const PATS = {
    line: { name: 'Any line', need: 1, masks: LINES, show: LINES[0] },
    two: { name: 'Two lines', need: 2, masks: LINES, show: [...LINES[0], ...LINES[9]] },
    corners: { name: 'Four corners', need: 1, masks: [[0, 4, 20, 24]] },
    stamp: { name: 'Corner stamp', need: 1, masks: [[0, 1, 5, 6], [3, 4, 8, 9], [15, 16, 20, 21], [18, 19, 23, 24]], show: [0, 1, 5, 6] },
    plus: { name: 'Plus sign', need: 1, masks: [[10, 11, 12, 13, 14, 2, 7, 17, 22]] },
    x: { name: 'Big X', need: 1, masks: [[0, 6, 12, 18, 24, 4, 8, 16, 20]] },
    t: { name: 'Letter T', need: 1, masks: [[0, 1, 2, 3, 4, 7, 12, 17, 22]] },
    frame: { name: 'Picture frame', need: 1, masks: [[0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 23, 24]] },
  };
  const ORDER = ['line', 'corners', 'line', 'stamp', 'two', 'plus', 'x', 't', 'two', 'frame'];
  const RIVALS = [['Tom', '🐈‍⬛'], ['Pigeon Pat', '🐦'], ['Ronnie Rat', '🐀']];
  const CONT = [40, 80, 120];
  let L, pat, cards, rivals, pool, called, W, every, acc, raf, prev, ended, alive, paw, pawMode, wrong, missed, contN,
    ballEl, ringEl, histEl, rivEl, cardsWrap, pawBtn, bingoBtn;
  const togo = d => { const rem = pat.masks.map(m => m.filter(i => !d[i]).length).sort((a, b) => a - b); return pat.need === 1 ? rem[0] : rem[0] + rem[1]; };
  const isLive = n => { const i = called.lastIndexOf(n); return i >= 0 && called.length - 1 - i < W; };

  function makeCard() {
    const n = [];
    for (let c = 0; c < 5; c++) { const v = shuffle(Array.from({ length: 15 }, (_, i) => c * 15 + i + 1)).slice(0, 5); for (let r = 0; r < 5; r++) n[r * 5 + c] = v[r]; }
    n[12] = 0;
    return { n, d: n.map(v => v === 0) };
  }
  function mount() {
    alive = true; ended = false; L = S.lv.bingo; contN = 0;
    pat = PATS[ORDER[(L - 1) % ORDER.length]];
    const nCards = L <= 2 ? 1 : L <= 6 ? 2 : 3, nRiv = L <= 2 ? 1 : L <= 5 ? 2 : 3, rCards = L <= 4 ? 1 : 2, bolts = L <= 10 ? 2 : 1;
    const miss = Math.max(.06, .34 - L * .025);
    W = Math.max(3, 5 - Math.floor((L - 1) / 4)); every = Math.max(2100, 3400 - (L - 1) * 110);
    paw = 0; pawMode = false; wrong = 0; missed = 0; acc = every - 1200;
    cards = Array.from({ length: nCards }, () => { const c = makeCard(); c.bolt = shuffle([...Array(25).keys()].filter(i => i !== 12)).slice(0, bolts); c.stale = []; return c; });
    rivals = RIVALS.slice(0, nRiv).map(([name, em]) => ({ name, em, miss, cards: Array.from({ length: rCards }, makeCard), at: -1, out: false }));
    pool = shuffle(Array.from({ length: 75 }, (_, i) => i + 1)); called = [];
    setTitle(`Level ${L} · ${pat.name}`);
    say(`Settle in, dear. This round is <b>${pat.name.toLowerCase()}</b>. ${nRiv === 1 ? 'Tom is playing too' : `${nRiv} of the regulars are playing too`}, so don't dawdle.`);

    const top = h('div', 'caller');
    const ballBox = h('div', 'ballbox');
    ballBox.innerHTML = `<svg class="ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/><circle class="rp" cx="50" cy="50" r="46" pathLength="100"/></svg>`;
    ballEl = h('div', 'ball', '<small>MOON</small>…'); ballBox.append(ballEl); ringEl = ballBox.querySelector('.rp');
    const mid = h('div', 'cmid');
    histEl = h('div', 'hist'); rivEl = h('div', 'rivals');
    mid.append(histEl, rivEl);
    top.append(ballBox, mid, patSVG());
    cardsWrap = h('div', 'cards');
    cards.forEach((cd, ci) => {
      const el = h('div', 'card');
      'BINGO'.split('').forEach(l => el.append(h('div', 'hd', l)));
      cd.cells = cd.n.map((v, i) => {
        const b = h('button', 'bcell');
        if (i === 12) { b.classList.add('free'); b.innerHTML = PAW + '<span>FREE</span>'; b.setAttribute('aria-label', 'Free space'); }
        else { b.innerHTML = `<span>${v}</span>`; b.setAttribute('aria-label', String(v)); if (cd.bolt.includes(i)) b.classList.add('bolt'); }
        if (pat.masks.length === 1 && pat.masks[0].includes(i)) b.classList.add('tgt');
        b.onclick = () => tapCell(cd, i);
        el.append(b); return b;
      });
      cd.el = el; cardsWrap.append(el);
    });
    stage.append(h('div', 'bg-wrap'));
    stage.firstChild.append(top, cardsWrap);
    pawBtn = h('button', 'btn ghost'); pawBtn.onclick = togglePaw;
    bingoBtn = h('button', 'btn', 'BINGO!'); bingoBtn.onclick = claim;
    controls.append(pawBtn, bingoBtn);
    update(); requestAnimationFrame(layout);
    prev = performance.now(); raf = requestAnimationFrame(loop);
  }
  function unmount() { alive = false; cancelAnimationFrame(raf); }
  function patSVG() {
    const show = pat.show || pat.masks[0], d = h('div', 'patbox');
    let s = '<svg viewBox="0 0 50 50" width="46" height="46" aria-hidden="true">';
    for (let i = 0; i < 25; i++) s += `<rect x="${(i % 5) * 10 + 1}" y="${Math.floor(i / 5) * 10 + 1}" width="8" height="8" rx="2" style="fill:${show.includes(i) ? 'var(--lamp)' : 'var(--line)'}"/>`;
    d.innerHTML = s + `</svg><small>${pat.name}</small>`;
    return d;
  }
  function layout() {
    if (!cardsWrap) return;
    // a card is 5 cells plus 28px of gaps, padding and border wide, and 5.55 cells plus 28px tall
    const n = cards.length, w = stage.clientWidth - 4, hh = stage.clientHeight - (stage.querySelector('.caller')?.offsetHeight || 78) - 10 - 4;
    let best = 0, cols = 1;
    for (let c = 1; c <= n; c++) {
      const r = Math.ceil(n / c), cell = Math.min((w - (c - 1) * 10 - c * 28) / (5 * c), (hh - (r - 1) * 10 - r * 28) / (5.6 * r));
      if (cell > best) { best = cell; cols = c; }
    }
    cardsWrap.style.setProperty('--bc', Math.floor(Math.min(best, 62)) + 'px');
    cardsWrap.style.gridTemplateColumns = `repeat(${cols}, auto)`;
  }
  function update() {
    const myBest = Math.min(...cards.map(c => togo(c.d)));
    setStats([{ html: `Balls <b>${called.length}</b>/75` }, { html: `You <b>${myBest}</b> to go`, done: !myBest },
      ...(wrong ? [{ html: `Wrong taps ${wrong}`, warn: true }] : []), ...(missed ? [{ html: `Missed ${missed}`, warn: true }] : [])]);
    rivEl.innerHTML = rivals.map(r => {
      const t = r.out ? '' : Math.min(...r.cards.map(c => togo(c.d)));
      return `<span class="rv${r.out ? ' out' : t === 0 ? ' hot' : t <= 2 ? ' warm' : ''}" title="${esc(r.name)}">${r.em}${rivals.length > 2 ? '' : ' ' + esc(r.name)} <b>${r.out ? 'out' : t === 0 ? 'BINGO?' : t + ' to go'}</b></span>`;
    }).join('');
    histEl.innerHTML = called.slice(-W, -1).reverse().map((v, i) => `<span style="opacity:${1 - i * .18}">${v}</span>`).join('');
    pawBtn.innerHTML = `${PAW.replace('<svg ', '<svg width="20" height="20" ')} Lucky paw ×${paw}`;
    pawBtn.disabled = !paw || ended; pawBtn.classList.toggle('on', pawMode);
    cardsWrap.classList.toggle('aiming', pawMode);
    bingoBtn.classList.toggle('ready', !myBest);
  }
  function loop(ts) {
    if (!alive) return;
    const dt = Math.min(100, ts - prev); prev = ts;
    if (!ended && !modalOpen()) { acc += dt; if (acc >= every) { acc = 0; callNext(); } }
    ringEl.style.strokeDashoffset = String(100 * Math.min(1, acc / every));
    raf = requestAnimationFrame(loop);
  }
  function callNext() {
    const winner = rivals.find(r => !r.out && r.at >= 0 && called.length >= r.at + 1);
    if (winner) return rivalWins(winner);
    if (!pool.length) return outOfBalls();
    // anything that just fell out of the daub window is gone for good
    if (called.length >= W) {
      const old = called[called.length - W];
      cards.forEach(cd => { const i = cd.n.indexOf(old); if (i >= 0 && !cd.d[i]) { cd.cells[i].classList.add('miss'); cd.stale.push(i); missed++; } });
    }
    const n = pool.pop(); called.push(n);
    const letter = 'BINGO'[Math.floor((n - 1) / 15)];
    ballEl.innerHTML = `<small>${letter}</small>${n}`;
    ballEl.classList.remove('in'); void ballEl.offsetWidth; ballEl.classList.add('in');
    if (!rivals.some(r => !r.out && r.at >= 0)) say(LINGO[n] ? `${letter} ${n}, ${LINGO[n]}!` : `${letter} ${n}. That's ${letter}, ${n}.`);
    tone(740, .12, 'sine', .06);
    rivals.forEach(r => {
      if (r.out) return;
      r.cards.forEach(c => { const i = c.n.indexOf(n); if (i >= 0 && Math.random() > r.miss) c.d[i] = true; });
      if (r.at < 0 && r.cards.some(c => !togo(c.d))) { r.at = called.length; say(`${r.em} ${r.name} is wriggling in their seat. Hurry, dear!`); tone(300, .2, 'square', .03); }
    });
    update();
  }
  function tapCell(cd, i) {
    if (ended || modalOpen() || cd.d[i]) return;
    const b = cd.cells[i], n = cd.n[i];
    if (pawMode) { paw--; pawMode = false; stamp(cd, i); say('Lucky paw! That square is yours.'); return update(); }
    if (isLive(n)) {
      stamp(cd, i);
      if (cd.bolt.includes(i)) { paw++; b.classList.add('charged'); say('Zap! Your lucky paw charged up.'); sfx.star(1); }
      else if (!togo(cd.d)) say('Oh my whiskers, you have it! Shout BINGO!');
      return update();
    }
    sfx.bad(); shakeEl(b);
    if (called.includes(n)) say(`${n} has gone stale, dear. Use the lucky paw if you need it.`);
    else { wrong++; say(`${n} hasn't been called yet.`); }
    update();
  }
  function stamp(cd, i) { cd.d[i] = true; const b = cd.cells[i]; b.classList.remove('miss'); b.classList.add('daub'); b.insertAdjacentHTML('beforeend', PAW); sfx.pop(); buzz(10); }
  function togglePaw() {
    if (!paw || ended) return;
    pawMode = !pawMode; sfx.tap();
    if (pawMode) say('Lucky paw ready. Tap any square to stamp it.');
    update();
  }
  function claim() {
    if (ended || modalOpen()) return;
    if (cards.some(c => !togo(c.d))) return doWin();
    wrong++; sfx.bad(); shakeEl(bingoBtn);
    say(`Not yet! You need the ${pat.name.toLowerCase()} on one card.`);
    update();
  }
  function doWin() {
    ended = true; update();
    const stars = 1 + (missed ? 0 : 1) + (wrong ? 0 : 1);
    const note = [missed ? `${missed} number${missed === 1 ? '' : 's'} went stale` : 'you never missed a number', wrong ? `${wrong} wrong tap${wrong === 1 ? '' : 's'}` : 'no wrong taps'].join(' and ');
    win('bingo', { stars, caps: 12 + L * 2 + 5 * stars, title: 'BINGO!', text: `Grandma Maple is dancing on the bin lids. Won on ball ${called.length}: ${note}.` });
  }
  function rivalWins(r) {
    ended = true; update();
    sfx.bad();
    const cost = CONT[Math.min(contN, CONT.length - 1)];
    lose('bingo', { title: `${r.name} called BINGO`, text: `${r.em} ${r.name} beat you to it. Maple could check their card very, very carefully, if you make it worth her while.`,
      cont: { label: `Check ${r.name}'s card`, cost, fn: () => { contN++; r.out = true; ended = false; acc = every - 1500; say(`Smudged! ${r.name} is out. Carry on, dear.`); update(); } } });
  }
  function outOfBalls() {
    ended = true; update();
    lose('bingo', { title: 'Out of moon balls', text: 'That was the last ball in the hat. Grandma Maple says the next round is a lucky one.' });
  }
  return { mount, unmount, layout };
})();
