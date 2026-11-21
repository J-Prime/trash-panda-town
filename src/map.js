/* =====================================================================
   The map: where the crew has been, where they can go, and what's to come.
   Travel (and its cutscene) only happens from here.
   ===================================================================== */
const PLACES = [
  { id: 'alley', name: 'Trash Panda Town', x: 92, y: 402, blurb: 'Home. Bins, fairy lights and the best fire in the city.' },
  { id: 'forest', name: 'Mossy Hollow', x: 252, y: 290, blurb: 'Cousin Willow\'s forest, up the creek past the last streetlamp.',
    hint: 'Something keeps rustling past the last streetlamp. Finish fixing up the alley to find out what.' },
  { id: 'cove', x: 92, y: 178, hint: 'Rosie swears she can smell salt and hot chips on the wind from over this way.' },
  { id: 'peaks', x: 266, y: 84, hint: 'Juniper spotted something shiny up on the mountain through her telescope.' },
];
// here: the crew is here. open: can travel. locked: unlocks when the current place is finished. soon: not built yet.
function placeState(id) {
  if (id === S.region) return 'here';
  if (id === 'alley') return 'open';
  if (id === 'forest') return S.trip || finished('alley') ? 'open' : 'locked';
  return 'soon';
}
// A place that just unlocked and hasn't been visited gets a pulsing ring and a dot on the map button.
const mapNews = () => !S.trip && placeState('forest') === 'open';

function mapSVG(sel) {
  const ink = '#6b4a2b', paper = '#efdcb0', sea = '#9cc4c6', fog = '#fbf4e2';
  const st = Object.fromEntries(PLACES.map(p => [p.id, placeState(p.id)]));
  const fogAt = (x, y, w, o = .94) => `<g class="fog" filter="url(#mblur)" opacity="${o}">${[[-w * .45, 6, w * .42, 22], [0, -4, w * .5, 28], [w * .42, 8, w * .4, 20], [-w * .1, 22, w * .6, 18]]
    .map(([dx, dy, rx, ry]) => `<ellipse cx="${x + dx}" cy="${y + dy}" rx="${rx}" ry="${ry}" fill="${fog}"/>`).join('')}</g>`;
  const q = (x, y) => `<circle cx="${x}" cy="${y}" r="13" fill="${paper}" stroke="${ink}" stroke-width="2.5" stroke-dasharray="4 3"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-size="18" fill="${ink}" style="font-family:var(--display)">?</text>`;
  const label = (x, y, t, dim) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="15" fill="${ink}" opacity="${dim ? .55 : 1}" style="font-family:var(--display);letter-spacing:.02em">${t}</text>`;

  let s = `<svg viewBox="0 0 360 480" role="img" aria-label="Map of the crew's adventures">
    <defs><radialGradient id="mpaper" cx="50%" cy="45%" r="75%"><stop offset=".6" stop-color="${paper}"/><stop offset="1" stop-color="#d6b77c"/></radialGradient>
    <filter id="mblur" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="5"/></filter></defs>
    <rect width="360" height="480" rx="18" fill="url(#mpaper)"/>`;
  // Sea and coast along the top left.
  s += `<path d="M0 0 H156 C142 40 166 72 152 112 C140 150 172 190 160 228 C150 258 112 268 64 262 C34 258 14 270 0 282Z" fill="${sea}"/>
    <path d="M156 0 C142 40 166 72 152 112 C140 150 172 190 160 228 C150 258 112 268 64 262 C34 258 14 270 0 282" fill="none" stroke="${ink}" stroke-width="2" opacity=".5"/>`;
  [[30, 40], [86, 70], [40, 116], [110, 34], [24, 214], [70, 236]].forEach(([x, y]) => { s += `<path d="M${x} ${y} q5 -5 10 0 t10 0" stroke="#5f8f94" stroke-width="2" fill="none" stroke-linecap="round"/>`; });
  // The creek runs from the mountains, through the forest, down past the city.
  s += `<path d="M300 132 C292 182 304 222 284 262 C266 296 232 330 206 356 C184 378 176 420 196 480" fill="none" stroke="${sea}" stroke-width="7" stroke-linecap="round"/>`;
  // Hills and little tree marks scattered for texture.
  [[180, 196], [214, 214], [312, 196], [196, 440], [300, 360], [330, 300]].forEach(([x, y]) => { s += `<path d="M${x - 9} ${y} q9 -12 18 0" stroke="${ink}" stroke-width="1.6" fill="none" opacity=".45"/>`; });
  [[176, 300], [326, 252], [150, 336], [320, 400]].forEach(([x, y]) => { s += `<path d="M${x} ${y - 10} l6 10 h-12z" fill="#7d9a5f" opacity=".7"/>`; });

  // Routes between places. A route fades out once it leads somewhere not open yet.
  const route = (d, on) => `<path d="${d}" fill="none" stroke="${ink}" stroke-width="3" stroke-dasharray="1 8" stroke-linecap="round" opacity="${on ? .85 : .3}"/>`;
  s += route('M130 392 C172 384 198 350 222 320', st.forest !== 'locked');
  s += route('M226 262 C200 236 160 228 126 204', false);
  s += route('M116 150 C140 110 190 100 234 102', false);

  // Mountains, with a glint where Juniper saw something shiny.
  s += `<path d="M196 140 L238 58 L262 96 L290 40 L336 140Z" fill="#a89a8a" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M226 82 L238 58 L250 80 L243 76 L236 84Z M278 64 L290 40 L304 66 L296 62 L289 70 L284 62Z" fill="#fffaf0"/>
    <path d="M290 30 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#ffd23f" class="tw"/>`;
  s += fogAt(266, 118, 90) + q(266, 118);
  // The cove: a lighthouse pokes up through the fog.
  s += `<path d="M44 196 Q92 176 140 196 L140 206 H44Z" fill="#e6cf98"/>
    <path d="M84 196 L88 142 H100 L104 196Z" fill="#fffaf0" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/><path d="M86.5 170 H101.5 M87.5 156 H100.5" stroke="#e0565b" stroke-width="7"/>
    <rect x="86" y="130" width="16" height="12" rx="2" fill="#ffd23f" stroke="${ink}" stroke-width="2.5"/><path d="M84 130 L94 120 L104 130Z" fill="#e0565b" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M102 136 L150 122 L150 146Z" fill="#fff3a8" opacity=".55" class="beam"/>`;
  s += fogAt(92, 196, 74) + q(92, 196);

  // Mossy Hollow: pines around the great oak.
  let trees = `<path d="M228 304 V286" stroke="#6b4a2b" stroke-width="5"/><circle cx="246" cy="270" r="22" fill="#5d8f4e" stroke="${ink}" stroke-width="2.5"/><circle cx="262" cy="282" r="16" fill="#6fa35b" stroke="${ink}" stroke-width="2.5"/><rect x="250" y="286" width="8" height="22" fill="#7a5230" stroke="${ink}" stroke-width="2"/>`;
  [[212, 300, 20], [226, 312, 16], [280, 300, 22], [296, 314, 16], [272, 320, 14]].forEach(([x, y, w]) => { trees += `<path d="M${x} ${y - w * 2} L${x + w * .7} ${y} H${x - w * .7}Z" fill="#3f6e4a" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/>`; });
  s += trees;
  if (st.forest === 'locked') s += fogAt(252, 294, 86, .9) + q(252, 290);
  // Trash Panda Town: a little skyline with lit windows and the lamp.
  let city = '';
  [[44, 378, 22, 44], [68, 360, 26, 62], [96, 372, 20, 50], [118, 352, 26, 70]].forEach(([x, y, w, hh], i) => {
    city += `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="${['#5b5486', '#4a4472', '#6a6396', '#544e80'][i]}" stroke="${ink}" stroke-width="2.2"/>`;
    for (let wy = y + 8; wy < y + hh - 6; wy += 12) for (let wx = x + 5; wx < x + w - 6; wx += 9) if ((wx + wy + i) % 3) city += `<rect x="${wx}" y="${wy}" width="4" height="5" fill="#ffd486"/>`;
  });
  city += `<path d="M150 422 V394 q0 -6 8 -6" stroke="${ink}" stroke-width="2.5" fill="none"/><circle cx="160" cy="389" r="3.5" fill="#ffd486" stroke="${ink}" stroke-width="1.5"/><path d="M36 422 H160" stroke="${ink}" stroke-width="2.5"/>`;
  s += city;

  // Compass.
  s += `<g transform="translate(316 440)" opacity=".75"><circle r="16" fill="none" stroke="${ink}" stroke-width="1.6"/><path d="M0 -20 L5 0 L0 20 L-5 0Z" fill="${ink}"/><path d="M-20 0 L0 4 L20 0 L0 -4Z" fill="${ink}" opacity=".5"/>
    <text y="-24" text-anchor="middle" font-size="11" fill="${ink}" style="font-family:var(--display)">N</text></g>`;

  // Labels.
  s += label(92, 444, 'Trash Panda Town') + label(252, 352, st.forest === 'locked' ? '???' : 'Mossy Hollow', st.forest === 'locked') + label(92, 236, '???', true) + label(266, 160, '???', true);

  // Tap targets, selection and the you-are-here pin sit on top.
  PLACES.forEach(p => {
    const y = p.id === 'alley' ? p.y - 12 : p.id === 'forest' ? p.y - 6 : p.y + 16;
    s += `<g class="mnode${sel === p.id ? ' sel' : ''}" data-id="${p.id}" tabindex="0" role="button" aria-label="${p.name && st[p.id] !== 'locked' ? p.name : 'Unknown place'}">
      ${mapNews() && p.id === 'forest' ? `<circle class="ring" cx="${p.x}" cy="${y}" r="40" fill="none" stroke="#ffb547" stroke-width="4"/>` : ''}
      <circle class="hl" cx="${p.x}" cy="${y}" r="48" fill="rgba(255,181,71,.16)" stroke="#b8701c" stroke-width="3" stroke-dasharray="8 6"/>
      <circle cx="${p.x}" cy="${y}" r="50" fill="transparent"/></g>`;
  });
  const here = PLACES.find(p => p.id === S.region), px = here.x + (here.id === 'alley' ? 22 : 0), py = here.y - (here.id === 'alley' ? 62 : 68);
  s += `<g class="pin" style="pointer-events:none"><path d="M${px - 7} ${py + 16} L${px} ${py + 30} L${px + 7} ${py + 16}Z" fill="${ink}"/><circle cx="${px}" cy="${py}" r="20" fill="#fff3d6" stroke="${ink}" stroke-width="3"/>
    ${coonSVG(CREW.stack.fur, 'bandana', 34, px - 17, py - 18)}</g>`;
  return s + '</svg>';
}

function mapInfo(id) {
  const p = PLACES.find(x => x.id === id), state = placeState(id), box = $('#mapInfo');
  const list = REGIONS[id]?.list;
  const bar = list ? `<div class="pbar"><i style="width:${Math.round(builtIn(list) / list.length * 100)}%"></i><span>${builtIn(list)} of ${list.length} projects built</span></div>` : '';
  if (state === 'here' || state === 'open') {
    box.innerHTML = `<span class="eyebrow">${state === 'here' ? 'You are here' : mapNews() && id === 'forest' ? 'New place' : 'Ready to travel'}</span><h3>${p.name}</h3><p>${p.blurb}</p>${bar}`;
    const b = h('button', 'btn' + (state === 'here' ? ' ghost' : ''), state === 'here' ? 'You are here' : `Travel to ${p.name}`);
    b.disabled = state === 'here';
    b.onclick = () => travelTo(id);
    box.append(b);
  } else {
    const why = state === 'locked' ? `Finish the alley first: ${builtIn(ALLEY)} of ${ALLEY.length} projects built.`
      : finished('forest') ? 'Coming soon. The crew is still packing.' : 'Coming soon. Finish Mossy Hollow first.';
    box.innerHTML = `<span class="eyebrow">Somewhere in the fog</span><h3>???</h3><p>${p.hint}</p><p class="mlock">${why}</p>`;
  }
}

function openMap() {
  closeMap();
  let sel = mapNews() ? 'forest' : S.region;
  const el = h('div', 'mapview');
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Map');
  el.innerHTML = `<div class="maphead"><h2>Map</h2><button class="iconbtn" type="button" aria-label="Close map">${icon('close', 20)}</button></div>
    <div class="mapcard"></div><div class="mapinfo" id="mapInfo" aria-live="polite"></div>`;
  document.body.append(el);
  const draw = () => { $('.mapcard', el).innerHTML = mapSVG(sel); mapInfo(sel); };
  const pick = node => { if (!node) return; sfx.tap(); sel = node.dataset.id; draw(); $(`.mnode[data-id="${sel}"]`, el)?.focus({ preventScroll: true }); };
  $('.mapcard', el).onclick = e => pick(e.target.closest('.mnode'));
  $('.mapcard', el).onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e.target.closest('.mnode')); } };
  $('.maphead button', el).onclick = () => { sfx.tap(); closeMap(); };
  draw();
}
function closeMap() { $('.mapview')?.remove(); }

// Going back and forth after the first trip gets a short two-shot transition instead of the full story.
const TRAVEL = {
  forest: [
    { k: 'pop', bg: '#1f2440', art: () => tripCity(false), text: 'Off to the forest again! Willow promised there\'d be pie.' },
    { k: 'willow', bg: '#102620', art: () => forestSVG(null), text: 'Welcome back, cousins! The kettle\'s already on.' },
  ],
  alley: [
    { k: 'stack', bg: '#12302a', art: () => tripCity(true), text: 'Back down the creek path to the city. I can smell the bins already!' },
    { k: 'bingo', bg: '#1b1836', art: () => sceneSVG(null), text: 'Home sweet alley. Just how we left it.' },
  ],
};
function travelTo(id) {
  if (placeState(id) !== 'open') return;
  sfx.tap();
  const first = id === 'forest' && !S.trip;
  const arrive = () => {
    closeMap();
    S.region = id; if (id === 'forest') S.trip = 1;
    save(); applyRegion(); renderHub(); sfx.win();
    $('#hub').scrollTop = 0;
    if (first) setTimeout(() => showModal({ k: 'willow', title: 'Welcome to Mossy Hollow',
      text: `The forest has ${FOREST.length} new projects. Keep helping the crew with their games to earn ★, then fix up the forest one project at a time. You can visit the alley any time from the map.`,
      buttons: [{ label: 'Let\'s get started', primary: true, fn: hideModal }] }), 600);
  };
  if (first) playTrip(arrive); else playCine(TRAVEL[id], 'Tap to arrive', arrive);
}

// shots: [{k, bg, art(), bare?, text}]. Tap anywhere to advance; Skip jumps to the end.
function playCine(shots, lastTap, onDone) {
  const el = h('div', 'cine');
  el.innerHTML = `<button class="cine-skip" type="button">Skip</button><div class="cine-art"></div>
    <div class="cine-cap bubble"><div class="face"></div><div class="say"></div></div><p class="cine-tap">Tap to continue</p>`;
  document.body.append(el);
  let i = -1, done = false;
  const notes = [392, 440, 523, 587, 659, 784];
  const show = () => {
    const sh = shots[i];
    el.style.backgroundColor = sh.bg;
    $('.cine-art', el).innerHTML = `<div class="shot${sh.bare ? ' bare' : ''}">${sh.art()}</div>`;
    $('.face', el).innerHTML = coon(sh.k, 52);
    const say = $('.say', el); say.innerHTML = `<b>${CREW[sh.k].short}:</b> ${sh.text}`;
    say.style.animation = 'none'; void say.offsetWidth; say.style.animation = '';
    $('.cine-tap', el).textContent = i === shots.length - 1 ? lastTap : 'Tap to continue';
    tone(notes[i % notes.length], .28, 'triangle', .06);
  };
  const end = () => {
    if (done) return; done = true;
    el.classList.add('out'); setTimeout(() => el.remove(), 500);
    onDone && onDone();
  };
  const next = () => { if (done) return; i++; if (i >= shots.length) end(); else show(); };
  el.onclick = next;
  $('.cine-skip', el).onclick = e => { e.stopPropagation(); end(); };
  next();
}

$('#mapBtn').innerHTML = icon('map', 20) + '<span>Map</span><i class="dot" aria-hidden="true"></i>';
$('#mapBtn').onclick = () => { sfx.tap(); openMap(); };
