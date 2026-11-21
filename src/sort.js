
/* =====================================================================
   Shiny Sort (jar sort): hidden trinkets, solver-checked levels, paid undos.
   ===================================================================== */
const Sort = (() => {
  const TR = [['🔑', '#ffb547'], ['🐚', '#ff7096'], ['💍', '#79e2c0'], ['🔔', '#6fa8ff'], ['🍬', '#b994ff'], ['🧷', '#a6e36b'],
    ['⭐', '#ff8a4c'], ['🎀', '#fff3d6'], ['🪙', '#c9a227'], ['🧲', '#e2483d'], ['💎', '#4fd1e8'], ['🔘', '#8c8aa8']];
  const CAP4 = 4, FREE_UNDO = 3, UNDO_COST = 5, JAR_COST = 30;
  let jars, n, hist, sel, extra, start, wrapEl, alive, L, movesN, undos, restarts, undoBtn, extraBtn, hidden, finished;
  const top = j => j[j.length - 1];
  const done = j => j.length === CAP4 && j.every(v => v.t === j[0].t);
  const runLen = j => { if (!j.length) return 0; let k = 1; while (k < j.length && j[j.length - 1 - k].t === top(j).t) k++; return k; };

  /* ---------- solver (works on plain colour arrays) ---------- */
  function solvable(J, limit = 60000) {
    const seen = new Set(); let nodes = 0;
    const key = s => s.map(j => j.join(',')).sort().join('|');
    const run = j => { let k = 1; while (k < j.length && j[j.length - 1 - k] === j[j.length - 1]) k++; return k; };
    const full = j => j.length === CAP4 && j.every(v => v === j[0]);
    function dfs(s) {
      if (s.every(j => !j.length || full(j))) return true;
      if (++nodes > limit) return null;
      const k = key(s); if (seen.has(k)) return false; seen.add(k);
      const moves = [];
      for (let a = 0; a < s.length; a++) {
        const A = s[a]; if (!A.length || full(A)) continue;
        const r = run(A), t = A[A.length - 1]; let emptyTried = false;
        for (let b = 0; b < s.length; b++) {
          if (a === b) continue; const B = s[b];
          if (B.length >= CAP4) continue;
          if (!B.length) { if (emptyTried || r === A.length) continue; emptyTried = true; moves.push([a, b, 0]); continue; }
          if (B[B.length - 1] !== t) continue;
          const k2 = Math.min(r, CAP4 - B.length);
          moves.push([a, b, (B.length + k2 === CAP4 && B.every(v => v === t)) ? 3 : k2 === r ? 2 : 1]);
        }
      }
      moves.sort((x, y) => y[2] - x[2]);
      for (const [a, b] of moves) {
        const ns = s.map(j => j.slice()), A = ns[a], B = ns[b];
        let k2 = Math.min(run(A), CAP4 - B.length); while (k2--) B.push(A.pop());
        const res = dfs(ns); if (res) return true; if (res === null) return null;
      }
      return false;
    }
    return dfs(J.map(j => j.slice()));
  }
  function gen(cols, empties) {
    for (let tries = 0; tries < 60; tries++) {
      const items = shuffle([...Array(cols)].flatMap((_, i) => [i, i, i, i]));
      const J = []; for (let i = 0; i < cols; i++) J.push(items.slice(i * 4, i * 4 + 4));
      // reject boards that start with sorted jars or too many easy runs
      if (J.some(j => j.every(v => v === j[0]))) continue;
      if (J.filter(j => j[3] === j[2]).length > Math.ceil(cols / 3)) continue;
      for (let e = 0; e < empties; e++) J.push([]);
      if (solvable(J) === true) return J;
    }
    return null;
  }

  function mount() {
    alive = true; L = S.lv.sort; finished = false;
    n = Math.min(12, 3 + Math.floor(L * .6));
    hidden = L >= 4;
    const tight = L >= 10 && L % 3 === 0;
    let J = tight ? (gen(n, 1) || gen(n, 1) || gen(n, 1)) : null;
    if (!J) J = gen(n, 2) || gen(n, 2) || gen(Math.max(3, n - 1), 2);
    jars = J.map(j => j.map((t, k) => ({ t, h: hidden && k < j.length - 1 })));
    start = JSON.stringify(jars);
    hist = []; sel = -1; extra = false; movesN = 0; undos = 0; restarts = 0;
    setTitle(`Level ${L}${tight ? ' · 1 spare jar' : ''}`);
    say(tight ? 'Only one empty jar this time. Think before you pour!' : hidden ? 'Someone jumbled my stash, and it\'s too dark to see the bottom of the jars. Uncover as you go.' : 'Someone jumbled my shiny stash! Put four of a kind in every jar.');
    undoBtn = h('button', 'btn ghost'); undoBtn.onclick = undo;
    const restart = h('button', 'btn ghost', 'Restart'); restart.onclick = doRestart;
    extraBtn = h('button', 'btn ghost'); extraBtn.onclick = addJar;
    controls.append(undoBtn, restart, extraBtn);
    wrapEl = h('div', 'jars'); stage.append(wrapEl);
    layout(); stats();
  }
  function unmount() { alive = false; }
  function layout() {
    if (!wrapEl) return;
    const cnt = jars.length, rows = cnt <= 6 ? 1 : 2, per = Math.ceil(cnt / rows), gx = cnt > 12 ? 6 : 10, gy = 22;
    let jw = Math.min(72, Math.floor((stage.clientWidth - 8 - (per - 1) * gx) / per));
    // a jar is a 12px lid plus the glass (4 trinkets, 30px padding, 6px border); the row area also holds 16px padding and the 14px lift of a selected jar
    const maxIt = Math.floor(((stage.clientHeight - 16 - 14 - (rows - 1) * gy) / rows - 48) / CAP4);
    const it = Math.max(14, Math.min(jw - 10, maxIt)); jw = it + 10;
    wrapEl.style.setProperty('--it', it + 'px'); wrapEl.style.setProperty('--jw', jw + 'px');
    wrapEl.style.setProperty('--gx', gx + 'px');
    wrapEl.style.maxWidth = (per * jw + (per - 1) * gx + 2) + 'px';
    render();
  }
  function stats() {
    const sorted = jars.filter(done).length;
    setStats([{ html: `Moves <b>${movesN}</b>` }, { html: `Sorted ${sorted}/${n}`, done: sorted === n },
      ...(undos ? [{ html: `Undos ${undos}`, warn: true }] : []), ...(restarts ? [{ html: `Restarts ${restarts}`, warn: true }] : [])]);
    const free = Math.max(0, FREE_UNDO - undos);
    undoBtn.innerHTML = free ? `Undo · ${free} free` : `Undo · ${CAPSM} ${UNDO_COST}`;
    undoBtn.disabled = !hist.length;
    extraBtn.innerHTML = extra ? 'Jar added' : `+ Jar · ${CAPSM} ${JAR_COST}`;
    extraBtn.disabled = extra;
  }
  function render() {
    wrapEl.innerHTML = '';
    jars.forEach((j, i) => {
      const b = h('button', 'jar' + (done(j) ? ' done' : '') + (i === sel ? ' sel' : ''));
      b.setAttribute('aria-label', `Jar ${i + 1}, ${j.length} of ${CAP4} full`);
      const up = i === sel ? runLen(j) : 0;
      b.innerHTML = `<div class="lid"></div><div class="glass">${j.map((v, k) => v.h
        ? '<span class="tr hid">?</span>'
        : `<span class="tr${k >= j.length - up ? ' up' : ''}" style="background:${TR[v.t][1]}">${TR[v.t][0]}</span>`).join('')}</div>`;
      b.onclick = () => tap(i, b);
      wrapEl.append(b);
    });
  }
  function anyMove() { return jars.some((A, a) => jars.some((B, b) => a !== b && A.length && !done(A) && B.length < CAP4 && (!B.length || top(B).t === top(A).t))); }
  function tap(i, b) {
    if (modalOpen() || finished) return;
    if (sel < 0) {
      if (!jars[i].length || done(jars[i])) { shakeEl(b); return; }
      sel = i; sfx.tap(); render(); return;
    }
    if (sel === i) { sel = -1; render(); return; }
    const A = jars[sel], B = jars[i];
    if (B.length >= CAP4 || (B.length && top(B).t !== top(A).t)) {
      sfx.bad();
      sel = B.length && !done(B) ? i : -1;
      render(); shakeEl(wrapEl.children[i]); return;
    }
    hist.push(JSON.stringify(jars));
    let k = Math.min(runLen(A), CAP4 - B.length);
    while (k--) B.push(A.pop());
    let revealed = false;
    if (A.length && top(A).h) { top(A).h = false; revealed = true; }
    sel = -1; movesN++;
    if (done(B)) { sfx.good(); buzz(20); } else if (revealed) sfx.reveal(); else sfx.pour();
    render(); stats();
    if (jars.every(j => !j.length || done(j))) { finished = true; setTimeout(() => alive && finish(), 350); return; }
    if (!anyMove()) setTimeout(() => alive && stuck(), 300);
  }
  function finish() {
    const stars = extra ? 1 : (undos || restarts) ? 2 : 3;
    win('sort', { stars, caps: 8 + n * 2 + 5 * stars, title: 'Stash sorted!',
      text: `Every jar holds four of a kind, and Juniper can finally find her favourite key. Done in ${movesN} moves${stars === 3 ? ' without a single do-over' : ''}.` });
  }
  function stuck() {
    showModal({ k: 'sort', title: 'No moves left', text: 'Every jar is full or blocked. Juniper has a few ideas.', buttons: [
      { label: 'Undo last pour', primary: true, disabled: !hist.length, fn: () => { hideModal(); undo(); } },
      { label: `Add a jar · ${CAPSM} ${JAR_COST}`, disabled: extra || S.caps < JAR_COST, note: !extra && S.caps < JAR_COST ? `You have ${S.caps} caps.` : '', fn: () => { hideModal(); addJar(); } },
      { label: 'Restart level', fn: () => { hideModal(); doRestart(); } },
      { label: 'Back to town', fn: closeGame },
    ] });
  }
  function undo() {
    if (!hist.length || finished) return;
    if (undos >= FREE_UNDO && !spend(UNDO_COST)) return;
    undos++; jars = JSON.parse(hist.pop()); sel = -1; sfx.tap(); render(); stats();
  }
  function doRestart() { if (finished) return; jars = JSON.parse(start); if (extra) jars.push([]); hist = []; sel = -1; movesN = 0; restarts++; layout(); stats(); sfx.tap(); }
  function addJar() {
    if (extra || finished || !spend(JAR_COST)) return;
    extra = true; jars.push([]); sel = -1; say('Here, borrow my spare jar.'); layout(); stats(); sfx.good();
  }
  return { mount, unmount, layout, _gen: gen, _solvable: solvable };
})();
