// Put your own note here and it shows at the bottom of the town page.
const DEDICATION = '';

/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const rnd = n => Math.floor(Math.random() * n);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const stage = $('#stage'), controls = $('#controls'), statsEl = $('#stats');
const modalOpen = () => !$('#modal').hidden;

/* ---------- save data ---------- */
const KEY = 'trash-panda-town-v2', OLD_KEY = 'trash-panda-town-v1';
const ORDER = ['pop', 'merge', 'stack', 'bingo', 'sort'];
const fresh = () => ({
  v: 2, name: '', caps: 50, stars: 0, totalStars: 0, helps: 0, parties: 0, muted: false,
  lv: { pop: 1, merge: 1, stack: 1, bingo: 1, sort: 1 }, got: { pop: 0, merge: 0, stack: 0, bingo: 0, sort: 0 },
  best: {}, town: [], region: 'alley', trip: 0, kitchen: null, tut: {},
});
let S = fresh();
function load() {
  try {
    const v2 = JSON.parse(localStorage.getItem(KEY));
    if (v2) return v2;
    const v1 = JSON.parse(localStorage.getItem(OLD_KEY));
    if (v1) return { name: v1.name || '', muted: !!v1.muted, caps: 50 + (v1.caps || 0), migrated: true };
  } catch (e) {}
  return null;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function spend(cost) {
  if (S.caps < cost) { toast(`You need ${cost - S.caps} more caps for that.`); sfx.bad(); return false; }
  S.caps -= cost; save(); updateCaps(); return true;
}

/* ---------- sound ---------- */
let AC, master;
// iOS only lets audio start inside a tap, and suspends it again when the page is backgrounded,
// so every tap re-checks it. The 'playback' session makes sound play even with the ringer on silent.
function audio() {
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 2.2; master.connect(AC.destination);
  }
  if (AC.state !== 'running') AC.resume().catch(() => {});
  return AC;
}
function unlockAudio() {
  if (S.muted) return;
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
    const ac = audio(), src = ac.createBufferSource();
    src.buffer = ac.createBuffer(1, 1, 22050); src.connect(ac.destination); src.start(0);
  } catch (e) {}
}
['pointerup', 'touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, unlockAudio, { capture: true, passive: true }));
document.addEventListener('visibilitychange', () => { if (!document.hidden && AC && !S.muted) AC.resume().catch(() => {}); });
function tone(f = 600, d = .08, type = 'sine', v = .07) {
  if (S.muted) return;
  try {
    const ac = audio(), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(v, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + d);
    o.connect(g).connect(master); o.start(); o.stop(ac.currentTime + d + .02);
  } catch (e) {}
}
const sfx = {
  tap: () => tone(420, .05, 'triangle', .05),
  pop: (k = 0) => tone(Math.min(1400, 520 + k * 90) + rnd(60), .09, 'triangle'),
  good: () => { tone(660, .1, 'triangle'); setTimeout(() => tone(880, .14, 'triangle'), 90); },
  bad: () => tone(170, .14, 'square', .03),
  boom: () => { tone(110, .25, 'sawtooth', .05); tone(220, .18, 'triangle', .06); },
  star: i => tone(740 + i * 160, .16, 'triangle', .08),
  win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, .2, 'triangle', .08), i * 120)),
};
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

/* ---------- art ---------- */
const CAP = (() => {
  let p = '';
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, r = i % 2 ? 10 : 12; p += (i ? 'L' : 'M') + (12 + r * Math.cos(a)).toFixed(2) + ' ' + (12 + r * Math.sin(a)).toFixed(2); }
  return `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="${p}Z" fill="#ffb547"/><circle cx="12" cy="12" r="7" fill="#ffd486"/><circle cx="12" cy="12" r="7" fill="none" stroke="#c9822a" stroke-width="1.2"/></svg>`;
})();
const CAPSM = CAP.replace('width="20" height="20"', 'width="14" height="14"');
const STAR_PATH = 'M12 1.8l3.1 6.4 7 1-5.1 4.9 1.2 7-6.2-3.3-6.2 3.3 1.2-7L1.9 9.2l7-1z';
const STAR = (s = 20, on = true) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path d="${STAR_PATH}" style="fill:${on ? '#ffd23f' : 'var(--hid)'};stroke:${on ? '#b8701c' : 'var(--hidline)'}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
const STARSM = STAR(15);
// Raccoon tracks look like tiny hands with five long fingers.
const PAW = `<svg viewBox="0 0 40 40" fill="currentColor" aria-hidden="true"><path d="M11 25 Q20 18 29 25 Q32 33 20 35 Q8 33 11 25Z"/><ellipse cx="7" cy="19" rx="2.7" ry="5.2" transform="rotate(-40 7 19)"/><ellipse cx="12.6" cy="11.5" rx="2.7" ry="6.2" transform="rotate(-16 12.6 11.5)"/><ellipse cx="20" cy="9" rx="2.7" ry="6.6"/><ellipse cx="27.4" cy="11.5" rx="2.7" ry="6.2" transform="rotate(16 27.4 11.5)"/><ellipse cx="33" cy="19" rx="2.7" ry="5.2" transform="rotate(40 33 19)"/></svg>`;
const PAWI = s => PAW.replace('<svg ', `<svg width="${s}" height="${s}" `);
const ICON = {
  left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>', down: '<path d="M5 9l7 7 7-7"/>',
  rot: '<path d="M19 12a7 7 0 1 1-2.05-4.95"/><path d="M19 3.5V8h-4.5"/>', rotl: '<path d="M5 12a7 7 0 1 0 2.05-4.95"/><path d="M5 3.5V8h4.5"/>',
  drop: '<path d="M6 5l6 6 6-6M6 13l6 6 6-6"/>', hold: '<rect x="5" y="5" width="14" height="14" rx="3"/><path d="M9 12h6"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/>',
  map: '<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  help: '<path d="M9.2 9a3 3 0 1 1 4.3 2.7c-1 .5-1.5 1.2-1.5 2.3"/><path d="M12 18h.01"/>',
};
const icon = (k, s = 26) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

function coonSVG(f, acc, size = 64, x, y) {
  const ink = '#2a2640';
  let pre = '', post = '';
  if (acc === 'leaf') post = `<path d="M50 20 C56 4 74 2 80 8 C72 14 62 18 52 24Z" fill="#79e2c0" stroke="${ink}" stroke-width="2"/><path d="M53 22 L72 9" stroke="#3f9e80" stroke-width="2"/>`;
  if (acc === 'chef') post = `<path d="M30 27 C20 24 22 8 35 10 C37 -1 63 -1 65 10 C78 8 80 24 70 27Z" fill="#fffaf0" stroke="${ink}" stroke-width="2.5"/><rect x="30" y="23" width="40" height="9" rx="3" fill="#f1e6d2" stroke="${ink}" stroke-width="2.5"/>`;
  if (acc === 'bandana') post = `<path d="M18 80 Q50 98 82 80 L80 90 Q50 106 20 90Z" fill="#ff7096" stroke="${ink}" stroke-width="2.5"/><path d="M70 88 L84 98 L78 84Z" fill="#ff7096" stroke="${ink}" stroke-width="2"/>`;
  if (acc === 'glasses') { pre = `<circle cx="50" cy="20" r="10" fill="${f}" stroke="${ink}" stroke-width="3"/>`; post = `<circle cx="34" cy="53" r="10" fill="rgba(255,255,255,.12)" stroke="#ffb547" stroke-width="3"/><circle cx="66" cy="53" r="10" fill="rgba(255,255,255,.12)" stroke="#ffb547" stroke-width="3"/><path d="M44 52 h12" stroke="#ffb547" stroke-width="3"/>`; }
  if (acc === 'star') post = `<path d="M74 14 l3.5 7.5 8 1 -6 5.5 1.5 8 -7 -4 -7 4 1.5 -8 -6 -5.5 8 -1z" fill="#ffb547" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>`;
  if (acc === 'flower') post = `${[[24, 30, '#ff7096'], [36, 22, '#ffd23f'], [50, 19, '#fff3d6'], [64, 22, '#b994ff'], [76, 30, '#ff9a5c']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="${c}" stroke="${ink}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="2.2" fill="#ffb547"/>`).join('')}<path d="M30 27 Q50 34 70 27" stroke="#4aa86a" stroke-width="3" fill="none"/>`;
  if (acc === 'acorn') post = `<path d="M30 30 Q30 8 50 8 Q70 8 70 30 Q50 24 30 30Z" fill="#9c6a3a" stroke="${ink}" stroke-width="2.5"/><path d="M36 22 L44 14 M48 24 L56 13 M60 24 L65 17" stroke="#7d5129" stroke-width="2"/><path d="M50 8 Q52 0 58 -1" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if (acc === 'vip') post = `<path d="M30 24 L36 8 L44 18 L50 4 L56 18 L64 8 L70 24Z" fill="#ffd23f" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>`;
  const pos = x != null ? ` x="${x}" y="${y}"` : '';
  return `<svg viewBox="0 0 100 100"${pos} width="${size}" height="${size}" aria-hidden="true">${pre}
    <path d="M15 48 L20 9 L47 29Z" fill="${f}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M85 48 L80 9 L53 29Z" fill="${f}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M22 39 L24 19 L38 30Z" fill="${ink}"/><path d="M78 39 L76 19 L62 30Z" fill="${ink}"/>
    <ellipse cx="50" cy="57" rx="38" ry="32" fill="${f}" stroke="${ink}" stroke-width="3"/>
    <path d="M50 27 L44 47 L56 47Z" fill="${ink}" opacity=".5"/>
    <ellipse cx="50" cy="71" rx="25" ry="15.5" fill="#f6f1e7"/>
    <path d="M14 55 Q28 38 46 50 Q50 53 54 50 Q72 38 86 55 Q78 67 64 63 Q50 59 36 63 Q22 67 14 55Z" fill="${ink}"/>
    <circle cx="34" cy="53" r="6" fill="#fff"/><circle cx="66" cy="53" r="6" fill="#fff"/>
    <circle cx="35" cy="54" r="3.8" fill="${ink}"/><circle cx="65" cy="54" r="3.8" fill="${ink}"/>
    <circle cx="36.3" cy="52.4" r="1.3" fill="#fff"/><circle cx="66.3" cy="52.4" r="1.3" fill="#fff"/>
    <ellipse cx="50" cy="66.5" rx="6.5" ry="4.5" fill="${ink}"/>
    <path d="M44 73.5 Q50 78.5 56 73.5" stroke="${ink}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="29" cy="71" rx="5" ry="3" fill="#ff7096" opacity=".55"/><ellipse cx="71" cy="71" rx="5" ry="3" fill="#ff7096" opacity=".55"/>
    ${post}</svg>`;
}

/* ---------- the neighbours ---------- */
const CREW = {
  pop:   { name: 'Pip', short: 'Pip', fur: '#9a95b8', acc: 'leaf', game: 'Snack Pop', plea: 'Knocked over the picnic basket. Match snacks, wipe up jam, bust crates.' },
  merge: { name: 'Rosie', short: 'Rosie', fur: '#b8a08f', acc: 'chef', game: 'Midnight Kitchen', plea: 'Runs a late-night snack stall. Cook leftovers into meals before the energy runs out.' },
  stack: { name: 'Bandit', short: 'Bandit', fur: '#8d95ab', acc: 'bandana', game: 'Bin Stacker', plea: 'Packing the dumpster before the truck comes at dawn.' },
  bingo: { name: 'Grandma Maple', short: 'Maple', fur: '#b3adbd', acc: 'glasses', game: 'Moon Bingo', plea: 'Calls bingo on the bins every full moon. The regulars play to win.' },
  sort:  { name: 'Juniper', short: 'Juniper', fur: '#a49cc6', acc: 'star', game: 'Shiny Sort', plea: 'Her shiny stash got jumbled. Four of a kind in every jar.' },
  // Forest cousins. They appear in the forest and the trip, but have no game of their own.
  willow: { name: 'Willow', short: 'Willow', fur: '#a88b74', acc: 'flower', game: '', plea: '' },
  moss:   { name: 'Moss', short: 'Moss', fur: '#8e9a86', acc: 'acorn', game: '', plea: '' },
};
const coon = (k, s) => coonSVG(CREW[k].fur, CREW[k].acc, s);

const FACTS = [
  'A group of raccoons is called a gaze.',
  'Baby raccoons are called kits. A mother usually has three to five of them.',
  'Raccoons often dunk their food in water. Wet paws feel textures even better.',
  'In lab tests, raccoons remembered how to solve a puzzle three years later.',
  'Raccoons can turn their back feet around to climb down trees head first.',
  'A raccoon\'s front paws have around four times more touch receptors than its back paws.',
  'Raccoons are mostly nocturnal, and they can run at about 15 mph.',
  'One idea about the black mask is that it cuts glare and helps them see at night.',
];

/* ---------- how to play ---------- */
const TUT = {
  pop: ['Swipe a snack into its neighbour to line up three or more of the same kind.',
    'Match 4 in a row for a <b>line blaster</b>. Match an L or T shape for a <b>bomb</b>. Match 5 for a <b>moon pie</b> 🥮, which clears every snack of one kind.',
    'Swap two specials into each other for a huge combo.',
    'Each level has a different job: collect snacks, wipe up jam 🍯, break crates 📦, or drop acorns 🌰 to the bottom. You can always roll an acorn down one space.',
    'Moves left over at the end earn extra ★.'],
  merge: ['Tap the trash can 🗑️ and the tree 🌳 for ingredients. Each tap uses one ⚡.',
    'Drag two matching items together to cook the next one up the menu.',
    'Serve every guest before your ⚡ runs out. Energy left over earns ★.',
    'Crates 📦 open when you cook right next to them. VIP guests 👑 pay back energy, but they leave if you keep them waiting.',
    'Space is tight. Select something and Toss it if you don\'t need it.'],
  stack: ['Fill a row from wall to wall to clear it. Clearing several rows at once scores far more.',
    'Hold stores a piece for later. The next three pieces show on the right.',
    'Twist a T piece into a tight slot for a T-spin bonus. Big clears in a row score ×1.5.',
    'Swipe to move, tap to turn, swipe down hard to drop, swipe up to hold. Or use the buttons.',
    'Modes change each level: pack rows, dig out junk, survive rising junk, or race the truck.'],
  bingo: ['Maple calls a number every few seconds. Tap it on your cards before it goes stale. The ring around the ball shows how long you have.',
    'Complete this round\'s pattern on any card, then press <b>BINGO!</b>',
    'The regulars are playing too. If one of them finishes first, you lose. Watch how many they have to go.',
    'Stamping a ⚡ square charges your lucky paw, which can stamp any square.',
    'Every wrong tap costs you a ★ at the end.'],
  sort: ['Tap a jar, then tap another to pour. Trinkets only go onto the same kind, or into an empty jar.',
    'Fill every jar with four of a kind.',
    'From level 4, trinkets under the top one are hidden until you uncover them.',
    'Finish without undo, restarts or a spare jar for ★★★.'],
};
function showTut(k, onDone) {
  showModal({ k, title: `How to play ${CREW[k].game}`, html: `<ol class="tut">${TUT[k].map(t => `<li>${t}</li>`).join('')}</ol>`,
    buttons: [{ label: onDone ? 'Let\'s go' : 'Back to the game', primary: true, fn: () => { S.tut[k] = 1; save(); hideModal(); onDone && onDone(); } }] });
}

/* ---------- town projects ---------- */
// Each region has its own list. Ids are unique across regions because S.town holds them all.
const ALLEY = [
  { id: 'lamp', name: 'Street lamp', cost: 3, k: 'bingo', ask: 'This alley is so dark I can\'t read the bingo balls. Could we put up a lamp?', thanks: 'Oh, that\'s lovely and bright. I can read my cards again!' },
  { id: 'paint', name: 'Bin paint job', cost: 4, k: 'stack', ask: 'My dumpster\'s all rust. A fresh coat of paint would make it feel like home.', thanks: 'Look at her shine. Best bin on the block.' },
  { id: 'lights', name: 'String lights', cost: 5, k: 'sort', ask: 'Sparkly lights along the wall. Please? They\'d be the shiniest thing I own.', thanks: 'They twinkle! I could look at them all night.' },
  { id: 'curtains', name: 'Window curtains', cost: 5, k: 'merge', ask: 'My kitchen window is just a dark hole. Curtains and a warm light would make it feel like a real café.', thanks: 'Cosy! People can see the kitchen glowing from the street.' },
  { id: 'herbs', name: 'Herb pots', cost: 6, k: 'merge', ask: 'Fresh herbs would make my midnight menu so much better.', thanks: 'Basil, mint and chives. The customers will smell it from the street.' },
  { id: 'sofa', name: 'Crate sofa', cost: 8, k: 'pop', ask: 'Somewhere to sit and eat snacks! Some old crates and a cushion would do.', thanks: 'Comfiest crates in town. Snack break, everyone!' },
  { id: 'hopscotch', name: 'Chalk hopscotch', cost: 8, k: 'pop', ask: 'I found a whole box of chalk! Can we draw a hopscotch on the ground? Pleeease?', thanks: 'One, two, three, hop! I\'m the hopscotch champion of the alley.' },
  { id: 'mural', name: 'Moon mural', cost: 9, k: 'sort', ask: 'That blank wall is begging for a painting of the moon.', thanks: 'Our very own moon. Now we have two!' },
  { id: 'pond', name: 'Dunking pond', cost: 10, k: 'pop', ask: 'Raccoons love to dunk their food. A little pond would be perfect.', thanks: 'Splash! Everything tastes better after a good dunk.' },
  { id: 'door', name: 'Painted door', cost: 11, k: 'bingo', ask: 'My front door is peeling, dear. A coat of red paint and a welcome mat would do wonders.', thanks: 'A red door with a round window. Visitors will feel welcome now.' },
  { id: 'neon', name: 'Neon sign', cost: 12, k: 'bingo', ask: 'Every proper town needs a sign. Something bright, so the whole city knows where we are.', thanks: 'Trash Panda Town, in lights. I might cry, dear.' },
  { id: 'telescope', name: 'Rooftop telescope', cost: 13, k: 'sort', ask: 'The stars are the shiniest things of all. If I had a telescope on the roof, I could collect them by looking.', thanks: 'I can see the craters on the moon! And the moon is shinier than anything in my jars.' },
  { id: 'cart', name: 'Food cart', cost: 14, k: 'merge', ask: 'A real food cart with an awning. Then my stall would be a proper restaurant.', thanks: 'A real cart! Midnight Kitchen is open for business.' },
  { id: 'balcony', name: 'Fire-escape balcony', cost: 15, k: 'stack', ask: 'I want somewhere up high to watch for the garbage truck. A balcony on the fire escape would be perfect.', thanks: 'I can see three streets from up here. No truck will ever sneak up on us again.' },
  { id: 'fire', name: 'Fire pit', cost: 16, k: 'stack', ask: 'Last thing. A fire pit, so the whole crew can sit together on cold nights.', thanks: 'The whole gang, round the fire. This town is finished, and it\'s perfect.' },
];
// FOREST and forestSVG live in forest.js; the map and travel live in map.js.
// Once a place is finished, its project card becomes a party that turns spare ★ into caps.
const REGIONS = {
  alley: { name: 'Trash Panda Town', place: 'the alley', theme: '#1b1836', get list() { return ALLEY; }, scene: f => sceneSVG(f),
    greet: 'Help the neighbours to earn ★, then spend them fixing up the alley.',
    party: { name: 'Block party', done: 'The alley is finished', verb: 'Party', k: 'bingo',
      invite: 'Everyone\'s invited. Bring snacks, and the neighbours chip in', text: 'The whole alley came out to dance under the lights. The neighbours chipped in for the next round of snacks.' } },
  forest: { name: 'Mossy Hollow', place: 'the forest', theme: '#102620', get list() { return FOREST; }, scene: f => forestSVG(f),
    greet: 'Help the crew earn ★, then spend them fixing up the storm-wrecked forest.',
    party: { name: 'Forest feast', done: 'Mossy Hollow is mended', verb: 'Feast', k: 'willow',
      invite: 'Everyone\'s invited. Bring pie, and the forest critters chip in', text: 'Everyone gathered by the creek for berry pie and stories. The forest critters chipped in for the next round of snacks.' } },
};
const region = () => REGIONS[S.region] || REGIONS.alley;
const PARTY_COST = 10, PARTY_CAPS = 100;
const built = id => S.town.includes(id);
const nextProject = () => region().list.find(p => !built(p.id));
const builtIn = list => list.filter(p => built(p.id)).length;
const finished = id => builtIn(REGIONS[id].list) === REGIONS[id].list.length;
// Colours the canvas games need, read back from the CSS tokens whenever the region changes.
const TK = {};
function applyRegion() {
  document.documentElement.dataset.region = S.region === 'forest' ? 'forest' : 'alley';
  const cs = getComputedStyle(document.documentElement);
  ['well', 'dusk', 'muted', 'line'].forEach(k => { TK[k] = cs.getPropertyValue('--' + k).trim(); });
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = region().theme;
}

function sceneSVG(freshId) {
  const ink = '#2a2640', has = id => built(id), cls = id => `pj${id === freshId ? ' new' : ''}`;
  const painted = has('paint');
  let s = `<svg viewBox="0 0 360 230" role="img" aria-label="Your alley: ${builtIn(ALLEY)} of ${ALLEY.length} projects built">
  <defs>
    <pattern id="brick" width="24" height="12" patternUnits="userSpaceOnUse"><rect width="24" height="12" fill="#352c62"/><path d="M0 .5H24M0 6.5H24M6 .5V6.5M18 6.5V12" stroke="#28214d" stroke-width="1.2"/></pattern>
    <radialGradient id="lampglow"><stop offset="0" stop-color="#ffb547" stop-opacity=".42"/><stop offset="1" stop-color="#ffb547" stop-opacity="0"/></radialGradient>
    <radialGradient id="fireglow"><stop offset="0" stop-color="#ff9a5c" stop-opacity=".55"/><stop offset="1" stop-color="#ff9a5c" stop-opacity="0"/></radialGradient>
    <filter id="neon" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <circle cx="326" cy="24" r="27" fill="#fff3d6" opacity=".1"/><circle cx="326" cy="24" r="15" fill="#fff3d6"/>
  <rect x="0" y="48" width="360" height="140" fill="url(#brick)"/><rect x="0" y="43" width="360" height="7" rx="2" fill="#4a4180"/>
  <rect x="30" y="64" width="54" height="40" rx="3" fill="#1d1a3b" stroke="#4a4180" stroke-width="3"/><path d="M57 64V104M30 84H84" stroke="#4a4180" stroke-width="3"/>
  <rect x="0" y="186" width="360" height="44" fill="#201c40"/><rect x="0" y="185" width="360" height="4" fill="#4a4180"/>
  <rect x="150" y="112" width="38" height="75" rx="3" fill="#251f45" stroke="#4a4180" stroke-width="3"/><circle cx="180" cy="152" r="2.6" fill="#ffb547"/>`;
  if (has('curtains')) s += `<g class="${cls('curtains')}"><rect x="31.5" y="65.5" width="51" height="37" fill="#ffcf7a" opacity=".5"/><path d="M57 64V104M30 84H84" stroke="#4a4180" stroke-width="3"/>
    <path d="M32 66 Q46 66 44 84 Q42 96 32 102Z M82 66 Q68 66 70 84 Q72 96 82 102Z" fill="#ff7096" stroke="${ink}" stroke-width="1.5"/><rect x="27" y="61" width="60" height="5" rx="2.5" fill="#c46a4a" stroke="${ink}" stroke-width="1.5"/></g>`;
  if (has('door')) s += `<g class="${cls('door')}"><rect x="150" y="112" width="38" height="75" rx="3" fill="#c84f6a" stroke="#4a4180" stroke-width="3"/><circle cx="169" cy="129" r="8" fill="#ffd486" stroke="#8a2f47" stroke-width="2.5"/><path d="M169 121V137M161 129H177" stroke="#8a2f47" stroke-width="1.5"/>
    <rect x="156" y="144" width="26" height="34" rx="2" fill="none" stroke="#a63d56" stroke-width="2"/><circle cx="180" cy="158" r="2.8" fill="#ffd23f" stroke="${ink}" stroke-width="1"/><rect x="142" y="184" width="54" height="6" rx="3" fill="#79e2c0" stroke="${ink}" stroke-width="1.5"/></g>`;
  if (has('balcony')) s += `<g class="${cls('balcony')}"><rect x="318" y="62" width="30" height="38" rx="2" fill="#1d1a3b" stroke="#4a4180" stroke-width="3"/><rect x="320" y="64" width="26" height="34" fill="#ffcf7a" opacity=".38"/>
    <path d="M304 106V128M314 106V128M304 113H314M304 121H314" stroke="#8d95ab" stroke-width="2"/><path d="M301 88H358M301 88V102M311 88V102M321 88V102M331 88V102M341 88V102M351 88V102" stroke="#8d95ab" stroke-width="2" fill="none"/>
    <rect x="299" y="101" width="61" height="5" rx="1.5" fill="#8d95ab" stroke="${ink}" stroke-width="1.5"/><path d="M343 88h12l-1.5 -8h-9z" fill="#c46a4a" stroke="${ink}" stroke-width="1.2"/><circle cx="346" cy="76" r="4" fill="#5fbf7f"/><circle cx="352" cy="75" r="4.5" fill="#93d46c"/></g>`;
  if (has('telescope')) s += `<g class="${cls('telescope')}"><path d="M204 44 L212 30 L220 44 M212 30 V44" stroke="#9a95b8" stroke-width="2.2" fill="none" stroke-linecap="round"/><g transform="rotate(-28 212 29)"><rect x="198" y="25" width="30" height="8" rx="2" fill="#6fa8ff" stroke="${ink}" stroke-width="1.8"/><rect x="226" y="23" width="6" height="12" rx="1.5" fill="#b9d6ff" stroke="${ink}" stroke-width="1.5"/><rect x="194" y="26.5" width="5" height="5" rx="1" fill="#ffd23f" stroke="${ink}" stroke-width="1.2"/></g></g>`;
  if (has('hopscotch')) {
    const sq = [[270, 208], [284, 201], [284, 215], [298, 208], [312, 201], [312, 215], [326, 208]];
    s += `<g class="${cls('hopscotch')}"><g fill="none" stroke="#fff3d6" stroke-width="1.6" opacity=".75">${sq.map(([x, y]) => `<rect x="${x}" y="${y}" width="14" height="14" rx="1"/>`).join('')}<path d="M341 208 q12 7 0 14"/></g>
      <g font-family="Baloo 2, sans-serif" font-size="8" font-weight="800" fill="#fff3d6" opacity=".8" text-anchor="middle">${sq.map(([x, y], i) => `<text x="${x + 7}" y="${y + 10}">${i + 1}</text>`).join('')}</g>
      <rect x="346" y="218" width="9" height="3.4" rx="1.7" fill="#ff7096" transform="rotate(-20 350 220)"/><rect x="338" y="224" width="9" height="3.4" rx="1.7" fill="#79e2c0"/></g>`;
  }
  if (has('mural')) s += `<g class="${cls('mural')}"><circle cx="268" cy="94" r="27" fill="#fff3d6" opacity=".92"/><circle cx="259" cy="86" r="5" fill="#e9d29d"/><circle cx="276" cy="102" r="7" fill="#e9d29d"/><circle cx="279" cy="83" r="3" fill="#e9d29d"/>
    <path d="M246 128 L250 106 L258 114 Q268 108 278 114 L286 106 L290 128Z" fill="#28214d"/><path d="M231 70l2 4 4 .6-3 2.8.8 4-3.8-2-3.8 2 .8-4-3-2.8 4-.6z M305 116l1.5 3 3 .5-2.2 2 .5 3-2.8-1.5-2.8 1.5.5-3-2.2-2 3-.5z" fill="#ffd23f"/></g>`;
  if (has('lights')) {
    let w = 'M0 56', b = '';
    for (let x = 0; x <= 360; x += 10) { const t = (x % 180) / 180; w += ` L${x} ${(56 + 12 * Math.sin(t * Math.PI)).toFixed(1)}`; }
    for (let x = 10, i = 0; x < 360; x += 20, i++) { const y = 56 + 12 * Math.sin(((x % 180) / 180) * Math.PI) + 5; b += `<circle cx="${x}" cy="${y.toFixed(1)}" r="3.4" fill="${['#ffb547', '#79e2c0', '#ff7096', '#fff3d6'][i % 4]}" class="tw" style="animation-delay:${(i % 5) * .4}s"/>`; }
    s += `<g class="${cls('lights')}"><path d="${w}" fill="none" stroke="#5a5486" stroke-width="1.5"/>${b}</g>`;
  }
  if (has('neon')) s += `<g class="${cls('neon')}"><rect x="126" y="86" width="86" height="20" rx="6" fill="#1b1836" stroke="#ff7096" stroke-width="2"/><text x="169" y="100.5" text-anchor="middle" font-family="Bagel Fat One, Arial Rounded MT Bold, sans-serif" font-size="11" fill="#ffb3c7" filter="url(#neon)" class="buzz">TRASH PANDA</text></g>`;
  if (has('lamp')) s += `<g class="${cls('lamp')}"><ellipse cx="136" cy="160" rx="70" ry="78" fill="url(#lampglow)"/><rect x="120" y="70" width="4" height="117" fill="#5a5486"/><path d="M122 73 Q122 62 134 62" fill="none" stroke="#5a5486" stroke-width="4"/><path d="M128 61h14l-3 6h-8z" fill="#5a5486"/><ellipse cx="135" cy="68.5" rx="4" ry="2.4" fill="#ffd486"/></g>`;
  if (has('herbs')) s += `<g class="${cls('herbs')}">${[196, 207, 218].map((x, i) => `<circle cx="${x}" cy="168" r="5.5" fill="${['#5fbf7f', '#79e2c0', '#93d46c'][i]}"/><circle cx="${x - 3}" cy="164" r="3.5" fill="${['#4aa86a', '#5fcca8', '#7cc05a'][i]}"/><path d="M${x - 5} 172h10l-1.5 15h-7z" fill="#c46a4a" stroke="${ink}" stroke-width="1.5"/>`).join('')}</g>`;
  if (has('sofa')) s += `<g class="${cls('sofa')}"><rect x="228" y="144" width="60" height="14" rx="2" fill="#9c6a3a" stroke="${ink}" stroke-width="2"/><rect x="228" y="162" width="29" height="25" rx="2" fill="#a8743f" stroke="${ink}" stroke-width="2"/><rect x="259" y="162" width="29" height="25" rx="2" fill="#a8743f" stroke="${ink}" stroke-width="2"/><path d="M232 170h21M232 178h21M263 170h21M263 178h21" stroke="#7d5129" stroke-width="1.5"/><rect x="226" y="154" width="64" height="10" rx="5" fill="#ff7096" stroke="${ink}" stroke-width="2"/></g>`;
  if (has('cart')) s += `<g class="${cls('cart')}"><rect x="298" y="150" width="54" height="34" rx="3" fill="#e0b25b" stroke="${ink}" stroke-width="2"/><rect x="301" y="136" width="3" height="16" fill="#5a5486"/><rect x="346" y="136" width="3" height="16" fill="#5a5486"/><path d="M294 128h62v8q-3.9 6-7.8 0-3.9 6-7.8 0-3.9 6-7.8 0-3.9 6-7.8 0-3.9 6-7.8 0-3.9 6-7.8 0-3.9 6-7.8 0-3.9 6-7.8 0z" fill="#ff7096" stroke="${ink}" stroke-width="2"/><path d="M302 128v8M318 128v8M334 128v8M350 128v8" stroke="#fff3d6" stroke-width="5"/><circle cx="308" cy="187" r="5" fill="${ink}"/><circle cx="342" cy="187" r="5" fill="${ink}"/><text x="325" y="171" text-anchor="middle" font-size="13">🍔</text></g>`;
  s += coonSVG(CREW.stack.fur, 'bandana', 46, 36, 100);
  s += `<path d="M10 136 L108 136 L104 145 L14 145Z" fill="${painted ? '#4fb88b' : '#7d6857'}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M14 144 L104 144 L99 187 L19 187Z" fill="${painted ? '#3f9a74' : '#6d5a4c'}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>`;
  s += painted ? `<g class="${cls('paint')}"><path d="M20 154h78" stroke="#79e2c0" stroke-width="4"/><g transform="translate(47 158) scale(.6)" fill="#fff3d6">${PAW.replace(/<\/?svg[^>]*>/g, '')}</g></g>`
    : `<circle cx="32" cy="160" r="5" fill="#9a5b3a" opacity=".8"/><circle cx="76" cy="172" r="7" fill="#9a5b3a" opacity=".7"/><circle cx="88" cy="152" r="3" fill="#9a5b3a" opacity=".8"/>`;
  s += `<circle cx="26" cy="189" r="4" fill="${ink}"/><circle cx="92" cy="189" r="4" fill="${ink}"/>`;
  if (has('pond')) s += `<g class="${cls('pond')}"><ellipse cx="62" cy="211" rx="40" ry="11" fill="#6fa8ff" stroke="#b9d6ff" stroke-width="3"/><ellipse cx="54" cy="209" rx="12" ry="3" fill="#b9d6ff" opacity=".6"/><ellipse cx="78" cy="208" rx="6" ry="4" fill="#ffd23f"/><circle cx="82" cy="203" r="3.4" fill="#ffd23f"/><path d="M85 203l3 1-3 1z" fill="#ff9a5c"/></g>`;
  if (has('fire')) s += `<g class="${cls('fire')}"><ellipse cx="206" cy="200" rx="56" ry="34" fill="url(#fireglow)"/><ellipse cx="206" cy="216" rx="20" ry="6" fill="#5a5486" stroke="${ink}" stroke-width="2"/><g class="flame"><path d="M196 214 Q194 200 202 192 Q202 202 207 204 Q206 194 213 188 Q214 202 216 214Z" fill="#ff9a5c"/><path d="M201 214 Q201 205 206 200 Q207 207 211 214Z" fill="#ffd23f"/></g></g>`;
  const pos = { pop: [98, 172], sort: [148, 160], bingo: has('sofa') ? [236, 116] : [236, 168], merge: has('cart') ? [300, 160] : [306, 166] };
  for (const k of ['pop', 'sort', 'bingo', 'merge']) s += coonSVG(CREW[k].fur, CREW[k].acc, 42, ...pos[k]);
  if (!has('lamp')) s += `<rect width="360" height="230" fill="#0b0a1c" opacity=".38"/>`;
  return s + '</svg>';
}
