
/* ---------- game shell ---------- */
// mounted stays false while a first-time tutorial is still showing over an unmounted game.
let cur = null, curKey = null, freshBuild = null, mounted = false;

function say(t) { $('#gSay').innerHTML = `<b>${CREW[curKey].short}:</b> ${t}`; }
function setStats(chips) { statsEl.innerHTML = chips.map(c => `<span class="chip${c.done ? ' done' : ''}${c.warn ? ' warn' : ''}">${c.html ?? c}</span>`).join(''); }
function updateCaps() {
  $('#gCaps').innerHTML = CAP + S.caps; $('#hubCaps').innerHTML = CAP + S.caps; $('#hubStars').innerHTML = STAR(18) + S.stars;
}
function setTitle(sub) { $('#gTitle').innerHTML = `<small>${sub || `Level ${S.lv[curKey]}`}</small>${CREW[curKey].game}`; }
function shakeEl(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
function toast(t) { const e = h('div', 'toast', t); document.body.append(e); setTimeout(() => e.classList.add('out'), 1800); setTimeout(() => e.remove(), 2200); }

function showModal({ k, title, text = '', html = '', buttons }) {
  $('#mFace').innerHTML = coon(k, 84);
  $('#mTitle').textContent = title;
  $('#mText').innerHTML = text;
  $('#mText').hidden = !text;
  $('#mExtra').innerHTML = html;
  const bb = $('#mBtns'); bb.innerHTML = '';
  buttons.forEach(b => {
    const e = h('button', 'btn' + (b.primary ? '' : ' ghost'), b.label);
    e.disabled = !!b.disabled; e.onclick = b.fn; bb.append(e);
    if (b.note) bb.append(h('p', 'bnote', b.note));
  });
  $('#modal').hidden = false;
  setTimeout(() => ($('#nameInput') || bb.querySelector('button:not(:disabled)'))?.focus(), 60);
}
function hideModal() { $('#modal').hidden = true; }

const starRow = n => `<div class="starrow">${[0, 1, 2].map(i => `<span class="${i < n ? 'on' : ''}" style="animation-delay:${.25 + i * .28}s">${STAR(46, i < n)}</span>`).join('')}</div>`;
const rewardHTML = caps => `<div class="reward">+ ${CAP.replace(/"20"/g, '"26"')} ${caps}</div>`;

function projectNote() {
  const p = nextProject();
  if (!p) return mapNews() ? '<p class="mnote">A new place has appeared on the map.</p>' : S.stars >= PARTY_COST ? `<p class="mnote">You have enough ★ for a ${region().party.name.toLowerCase()}.</p>` : '';
  return S.stars >= p.cost ? `<p class="mnote">You have enough ★ to build the <b>${p.name.toLowerCase()}</b>!</p>`
    : `<p class="mnote">${S.stars} of ${p.cost} ★ saved for the ${p.name.toLowerCase()}.</p>`;
}

// stars: 1-3 earned this level. The level always moves on, so stars are banked straight away.
function win(k, { stars, caps, title, text, nextLabel }) {
  stars = Math.max(1, Math.min(3, stars));
  const L = S.lv[k];
  S.best[k] = S.best[k] || {}; S.best[k][L] = stars;
  S.lv[k] = L + 1; S.helps++; S.stars += stars; S.totalStars += stars; S.got[k] = (S.got[k] || 0) + stars; S.caps += caps;
  save(); updateCaps(); sfx.win(); buzz([20, 40, 20]);
  for (let i = 0; i < stars; i++) setTimeout(() => sfx.star(i), 350 + i * 280);
  showModal({ k, title, text, html: starRow(stars) + rewardHTML(caps) + projectNote(), buttons: [
    { label: nextLabel || `Level ${L + 1}`, primary: true, fn: () => { hideModal(); openGame(k); } },
    { label: 'Back to town', fn: closeGame },
  ] });
}

// cont: {label, cost, fn} — a paid second chance that keeps the current board.
function lose(k, { title, text, cont }) {
  sfx.bad(); buzz([30, 30, 30]);
  const buttons = [];
  if (cont) buttons.push({ label: `${cont.label} · ${CAPSM} ${cont.cost}`, primary: true, disabled: S.caps < cont.cost,
    note: S.caps < cont.cost ? `You have ${S.caps} caps.` : '',
    fn: () => { if (!spend(cont.cost)) return; hideModal(); cont.fn(); } });
  buttons.push({ label: 'Try again', primary: !cont, fn: () => { hideModal(); openGame(k); } });
  buttons.push({ label: 'Back to town', fn: closeGame });
  showModal({ k, title, text, buttons });
}

function openGame(k) {
  if (mounted && cur.unmount) cur.unmount();
  curKey = k; cur = GAMES[k]; mounted = false;
  $('#hub').hidden = true; $('#game').hidden = false;
  $('#gFace').innerHTML = coon(k, 56);
  stage.innerHTML = ''; controls.innerHTML = ''; statsEl.innerHTML = ''; $('#gSay').innerHTML = '';
  setTitle(); updateCaps();
  // Games measure the stage while mounting; measure again once the stats and speech bubble have settled.
  const start = () => { if (!cur || curKey !== k) return; cur.mount(); mounted = true; requestAnimationFrame(() => { if (curKey === k && mounted && cur.layout) cur.layout(); }); };
  if (!S.tut[k]) showTut(k, start);
  else start();
}
function closeGame() {
  if (mounted && cur.unmount) cur.unmount();
  cur = null; curKey = null; mounted = false; hideModal();
  stage.innerHTML = ''; controls.innerHTML = '';
  $('#game').hidden = true; $('#hub').hidden = false;
  renderHub();
}
$('#backBtn').onclick = closeGame;
$('#helpBtn').innerHTML = icon('help', 20);
$('#helpBtn').onclick = () => { if (curKey && !modalOpen()) { sfx.tap(); showTut(curKey); } };

/* ---------- town ---------- */
function renderHub() {
  updateCaps();
  $('#muteBtn').innerHTML = icon(S.muted ? 'mute' : 'sound', 20);
  $('#mapBtn').classList.toggle('new', mapNews());
  const R = region();
  $('#townName').textContent = R.name;
  $('#greet').innerHTML = `Evening, <button class="namebtn" id="nameBtn">${esc(S.name || 'friend')}</button>. ` +
    (S.helps ? `You've helped ${plural(S.helps, 'time')} and earned ${S.totalStars} ★.` : R.greet);
  $('#nameBtn').onclick = askName;
  renderScene();
  freshBuild = null;
  renderProject();
  const crew = $('#crew'); crew.innerHTML = '';
  ORDER.forEach(k => {
    const c = CREW[k];
    const b = h('button', 'row');
    b.innerHTML = `${coon(k, 60)}<span class="who"><span class="game">${c.game}</span><h3>${c.name}</h3><p>${c.plea}</p></span><span class="lv">${k === 'merge' ? 'Night' : 'Level'}<b>${S.lv[k]}</b><em>${STARSM}${S.got[k] || 0}</em></span>`;
    b.onclick = () => { sfx.tap(); openGame(k); };
    crew.append(b);
  });
  $('#fact').innerHTML = `${PAWI(22)}<span><b>Raccoon fact</b>${FACTS[rnd(FACTS.length)]}</span>`;
  $('#dedi').hidden = !DEDICATION; $('#dedi').textContent = DEDICATION;
}

function renderScene() { $('#scene').innerHTML = region().scene(freshBuild); }

function renderProject() {
  const box = $('#project'), R = region(), list = R.list, p = nextProject();
  // The alley is done and the forest is waiting: point at the map rather than the party.
  if (!p && mapNews()) {
    box.innerHTML = `<div class="pface">${coon('willow', 52)}</div><div class="pbody"><span class="eyebrow">${R.party.done}</span><h3>A new place on the map</h3>
      <p>“A pigeon dropped off a leaf letter from cousin Willow. There's a forest on the map now, up the creek past the last streetlamp.”</p></div>`;
    const b = h('button', 'btn', 'Open the map'); b.onclick = () => { sfx.tap(); openMap(); };
    box.querySelector('.pbody').append(b);
    return;
  }
  const P = R.party, cost = p ? p.cost : PARTY_COST, k = p ? p.k : P.k, can = S.stars >= cost;
  const pct = Math.min(100, Math.round(S.stars / cost * 100));
  const head = p ? `<span class="eyebrow">Project ${builtIn(list) + 1} of ${list.length}</span><h3>${p.name}</h3><p>“${p.ask}”</p>`
    : `<span class="eyebrow">${P.done}</span><h3>${P.name}</h3><p>“${P.invite} ${PARTY_CAPS} caps.”${S.parties ? ` ${plural(S.parties, 'party')} so far.` : ''}</p>`;
  box.innerHTML = `<div class="pface">${coon(k, 52)}</div><div class="pbody">${head}
    <div class="pbar" role="progressbar" aria-valuemin="0" aria-valuemax="${cost}" aria-valuenow="${Math.min(S.stars, cost)}"><i style="width:${pct}%"></i><span>${STARSM} ${Math.min(S.stars, cost)} / ${cost}</span></div></div>`;
  const b = h('button', 'btn' + (can ? '' : ' ghost'), can ? (p ? `Build · ${cost} ★` : `${P.verb} · ${cost} ★`) : `Need ${cost - S.stars} more ★`);
  b.disabled = !can;
  b.onclick = () => p ? build(p) : party();
  box.querySelector('.pbody').append(b);
}
function build(p) {
  if (S.stars < p.cost) return;
  S.stars -= p.cost; S.town.push(p.id); save();
  freshBuild = p.id; renderHub(); sfx.win(); buzz([20, 40, 20]);
  $('#scene').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  const last = !nextProject(), forest = S.region === 'forest';
  const thanks = { k: p.k, title: `${p.name} built!`, text: p.thanks };
  const toMap = { label: 'Open the map', primary: true, fn: () => { hideModal(); openMap(); } };
  if (last && !forest && !S.trip) Object.assign(thanks, { text: p.thanks + '<br><br>Wait. Is that a pigeon on the lamp? It dropped off a leaf letter, and a new place has appeared on your map.',
    buttons: [toMap, { label: 'Later', fn: hideModal }] });
  else if (last && forest) Object.assign(thanks, { text: p.thanks + `<br><br>Mossy Hollow is mended. From now on, spend ${PARTY_COST} ★ on a forest feast whenever you like. Keep an eye on the map: the crew has heard rumours of other places.`,
    buttons: [{ label: 'Hooray!', primary: true, fn: hideModal }, { ...toMap, primary: false }] });
  else thanks.buttons = [{ label: 'Lovely', primary: true, fn: hideModal }];
  setTimeout(() => showModal(thanks), 900);
}
function party() {
  if (S.stars < PARTY_COST) return;
  const P = region().party;
  S.stars -= PARTY_COST; S.parties++; S.caps += PARTY_CAPS; save(); renderHub(); sfx.win();
  showModal({ k: ORDER[S.parties % 5], title: `${P.name}!`, text: P.text,
    html: rewardHTML(PARTY_CAPS), buttons: [{ label: 'Lovely', primary: true, fn: hideModal }] });
}
$('#muteBtn').onclick = () => { S.muted = !S.muted; save(); renderHub(); sfx.tap(); };

function askName() {
  showModal({ k: 'bingo', title: 'Who is helping tonight?', text: 'The raccoons would like to know who to thank.',
    html: `<input id="nameInput" maxlength="20" placeholder="Your name" autocomplete="off" value="${esc(S.name)}">`,
    buttons: [{ label: 'Meet the raccoons', primary: true, fn: () => { S.name = $('#nameInput').value.trim() || 'friend'; save(); hideModal(); renderHub(); } }] });
  setTimeout(() => { const i = $('#nameInput'); if (i) i.onkeydown = e => { if (e.key === 'Enter') $('#mBtns button').click(); }; }, 0);
}
