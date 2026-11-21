/* =====================================================================
   Sound: effects and music, all made live with Web Audio (nothing to download).
   ===================================================================== */
let AC = null, stale = false, sfxBus, musBus, revIn, noiseBuf;
// Volume for Off / Quiet / Loud. Music sits well under the effects.
const LEVELS = { sfx: [0, .45, 1], music: [0, .28, .55] };
const mf = m => 440 * 2 ** ((m - 69) / 12);
const PENT = [0, 2, 4, 7, 9];
const pent = (i, base = 72) => base + 12 * Math.floor(i / 5) + PENT[((i % 5) + 5) % 5];

function makeContext() {
  if (AC) { try { AC.close(); } catch (e) {} }
  AC = new (window.AudioContext || window.webkitAudioContext)();
  stale = false;
  const comp = AC.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = .004; comp.release.value = .2;
  const master = AC.createGain(); master.gain.value = 1.6; master.connect(comp).connect(AC.destination);
  sfxBus = AC.createGain(); musBus = AC.createGain(); musBus.gain.value = 0;
  sfxBus.connect(master); musBus.connect(master);
  // A small made-up room so notes ring a little instead of stopping dead.
  const rev = AC.createConvolver(), len = Math.floor(AC.sampleRate * 2.2), ir = AC.createBuffer(2, len, AC.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.4; }
  rev.buffer = ir; revIn = AC.createGain(); const revOut = AC.createGain(); revOut.gain.value = .5;
  revIn.connect(rev).connect(revOut).connect(master);
  noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const ac = AC; ac.onstatechange = () => { if (ac === AC && ac.state === 'interrupted') stale = true; };
  setLevels();
}
function setLevels() {
  if (!AC) return;
  const t = AC.currentTime;
  sfxBus.gain.setTargetAtTime(LEVELS.sfx[S.sfx] ?? 1, t, .02);
  musBus.gain.cancelScheduledValues(t); musBus.gain.setTargetAtTime(LEVELS.music[S.music] ?? 0, t, .4);
}
// iOS only starts audio inside a tap. After the phone locks it can hand back a context that claims to be
// running but stays silent, and resume() doesn't fix it. So after any time away, the next tap builds a new one.
// The 'playback' session makes sound play even with the ringer on silent.
function unlockAudio() {
  if (!S.sfx && !S.music) return;
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
    if (!AC || stale || AC.state === 'closed') makeContext();
    if (AC.state !== 'running') AC.resume().catch(() => {});
    const src = AC.createBufferSource(); src.buffer = AC.createBuffer(1, 1, 22050); src.connect(AC.destination); src.start(0);
    music.sync();
  } catch (e) {}
}
['pointerup', 'touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, unlockAudio, { capture: true, passive: true }));
const away = () => { stale = true; music.stop(); };
document.addEventListener('visibilitychange', () => { if (document.hidden) away(); });
window.addEventListener('pagehide', away);
const live = () => AC && !stale && AC.state !== 'closed';

/* ---------- voices ---------- */
const now = () => AC.currentTime + .005;
function route(node, bus, pan, rev) {
  let n = node;
  if (pan && AC.createStereoPanner) { const p = AC.createStereoPanner(); p.pan.value = pan; n.connect(p); n = p; }
  n.connect(bus);
  if (rev) { const s = AC.createGain(); s.gain.value = rev; n.connect(s); s.connect(revIn); }
}
function shape(g, t, a, hold, d, v) {
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a);
  if (hold) g.gain.setValueAtTime(v, t + a + hold);
  g.gain.exponentialRampToValueAtTime(.0001, t + a + hold + d);
  return t + a + hold + d + .05;
}
// A plain oscillator: glides from f to `to`, with an optional lowpass and vibrato.
function osc({ f, to, type = 'sine', t = now(), a = .005, hold = 0, d = .15, v = .2, bus = sfxBus, pan = 0, rev = .12, lp, vib = 0 }) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + a + hold + d * .8);
  let n = o;
  if (lp) { const fl = AC.createBiquadFilter(); fl.frequency.value = lp; o.connect(fl); n = fl; }
  n.connect(g);
  const end = shape(g, t, a, hold, d, v); route(g, bus, pan, rev);
  if (vib) { const l = AC.createOscillator(), lg = AC.createGain(); l.frequency.value = 5.2; lg.gain.value = f * vib; l.connect(lg).connect(o.frequency); l.start(t); l.stop(end); }
  o.start(t); o.stop(end);
}
// Two-oscillator FM: bells, chimes, electric piano and kalimba, depending on ratio and index.
function bell({ f, t = now(), a = .003, d = .6, v = .14, ratio = 3.5, index = 1.6, bus = sfxBus, pan = 0, rev = .3 }) {
  const c = AC.createOscillator(), m = AC.createOscillator(), mg = AC.createGain(), g = AC.createGain();
  c.frequency.value = f; m.frequency.value = f * ratio;
  mg.gain.setValueAtTime(f * index, t); mg.gain.exponentialRampToValueAtTime(f * index * .04 + .01, t + a + d);
  m.connect(mg).connect(c.frequency); c.connect(g);
  const end = shape(g, t, a, 0, d, v); route(g, bus, pan, rev);
  c.start(t); m.start(t); c.stop(end); m.stop(end);
}
function noise({ t = now(), type = 'bandpass', f = 1000, to, q = 1, a = .002, hold = 0, d = .1, v = .15, bus = sfxBus, pan = 0, rev = .1 }) {
  const s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; s.loop = true; fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t);
  if (to) fl.frequency.exponentialRampToValueAtTime(to, t + a + hold + d);
  s.connect(fl).connect(g);
  const end = shape(g, t, a, hold, d, v); route(g, bus, pan, rev);
  s.start(t, Math.random() * .5); s.stop(end);
}
// Music dips while a fanfare plays, then comes back.
function duck(sec) {
  if (!S.music) return;
  const g = musBus.gain, t = AC.currentTime, lvl = LEVELS.music[S.music];
  g.cancelScheduledValues(t); g.setTargetAtTime(lvl * .3, t, .05); g.setTargetAtTime(lvl, t + sec, .5);
}

/* ---------- effects ---------- */
const play = fn => (...args) => { if (!S.sfx || !live()) return; try { fn(...args); } catch (e) {} };
const spread = () => Math.random() * .6 - .3;
const sfx = {
  tap: play(() => osc({ f: 1100, to: 650, d: .035, v: .09, rev: .03 })),
  tick: play(() => osc({ f: 1600, to: 1350, type: 'triangle', d: .025, v: .05, rev: 0 })),
  // Bubbly bloop that climbs the scale as a combo grows.
  pop: play((k = 0) => { const f = mf(pent(Math.min(k, 10) + rnd(2), 67)), p = spread(); osc({ f: f * .55, to: f, d: .09, v: .2, pan: p, rev: .15 }); bell({ f: f * 2, d: .14, v: .03, index: .6, pan: p, rev: .2 }); }),
  pour: play(() => { const f = mf(pent(5 + rnd(4), 64)); osc({ f, to: f * 1.5, d: .12, v: .15, rev: .2 }); noise({ f: 1600, to: 3400, q: 2, d: .1, v: .05 }); }),
  reveal: play(() => { const t = now(); bell({ f: mf(88), t, d: .5, v: .07, ratio: 4 }); bell({ f: mf(95), t: t + .07, d: .7, v: .06, ratio: 4 }); }),
  good: play(() => { const t = now(); bell({ f: mf(79), t, d: .5, v: .12 }); bell({ f: mf(84), t: t + .09, d: .8, v: .12 }); }),
  bad: play(() => { osc({ f: 240, to: 150, type: 'triangle', d: .16, v: .14, lp: 900, rev: .05 }); osc({ f: 120, to: 80, d: .18, v: .16, rev: 0 }); }),
  uhoh: play(() => { const t = now(); osc({ f: mf(64), t, type: 'triangle', d: .12, v: .09, lp: 1500 }); osc({ f: mf(60), t: t + .14, type: 'triangle', d: .2, v: .09, lp: 1500 }); }),
  boom: play(() => { osc({ f: 150, to: 42, d: .32, v: .45, rev: .15 }); noise({ type: 'lowpass', f: 2600, to: 180, q: .5, d: .4, v: .28, rev: .3 }); }),
  star: play((i = 0) => { const t = now(), f = mf(pent(5 + i * 2, 72)); bell({ f, t, d: 1, v: .13, ratio: 4.01, index: 1.2, pan: (i - 1) * .35, rev: .4 }); osc({ f: f * 2, t: t + .05, d: .25, v: .035, pan: (1 - i) * .3, rev: .5 }); }),
  land: play(() => { osc({ f: 170, to: 70, d: .1, v: .26, rev: .02 }); noise({ type: 'lowpass', f: 900, d: .06, v: .07, rev: 0 }); }),
  swish: play(() => noise({ f: 600, to: 2600, q: 1.5, a: .03, d: .12, v: .1, rev: .15 })),
  clear: play((n = 1) => { const t = now(); noise({ t, type: 'highpass', f: 800, to: 6000, q: .7, a: .05, d: .25, v: .1, rev: .3 }); for (let i = 0; i <= Math.min(n, 4); i++) bell({ f: mf(pent(4 + i * 2, 72)), t: t + .05 + i * .07, d: .7, v: .1, pan: i * .2 - .3, rev: .35 }); }),
  rumble: play(() => { osc({ f: 90, to: 60, type: 'sawtooth', d: .25, v: .08, lp: 400, rev: .05 }); noise({ type: 'lowpass', f: 400, d: .25, v: .12 }); }),
  // Bingo ball: a dinner-bell ding, pitched by the number.
  call: play(n => bell({ f: mf(pent(((n || rnd(15)) % 9) + 3, 67)), d: 1.1, v: .13, ratio: 2.76, index: 2, rev: .45 })),
  daub: play(() => { osc({ f: 220, to: 110, d: .08, v: .28, rev: .02 }); noise({ f: 1200, q: .8, d: .05, v: .09 }); osc({ f: mf(84), to: mf(91), t: now() + .02, d: .1, v: .06, rev: .2 }); }),
  coin: play(() => { const t = now(); osc({ f: mf(93), t, type: 'square', d: .06, v: .05, lp: 5000, rev: .2 }); osc({ f: mf(100), t: t + .07, type: 'square', d: .25, v: .05, lp: 5000, rev: .3 }); }),
  note: play(i => bell({ f: mf([67, 69, 72, 74, 76, 79][i % 6]), d: 1, v: .11, ratio: 3, index: 1, rev: .45 })),
  whoosh: play(() => noise({ f: 300, to: 2200, q: 1.2, a: .35, d: .6, v: .3, rev: .4 })),
  win: play(() => {
    duck(2.4); const t = now();
    [72, 76, 79, 84].forEach((m, i) => { bell({ f: mf(m), t: t + i * .11, d: .8, v: .12, pan: i * .2 - .3, rev: .35 }); osc({ f: mf(m - 12), t: t + i * .11, type: 'triangle', d: .25, v: .06, rev: .2 }); });
    [72, 76, 79, 83].forEach(m => osc({ f: mf(m), t: t + .45, type: 'triangle', a: .08, hold: .3, d: 1, v: .04, lp: 2400, rev: .5 }));
    noise({ t: t + .4, type: 'highpass', f: 5000, to: 9000, a: .2, d: .8, v: .035, rev: .6 });
  }),
  lose: play(() => { duck(1.6); const t = now(); [67, 63, 60].forEach((m, i) => osc({ f: mf(m), to: i === 2 ? mf(m) * .94 : 0, t: t + i * .18, type: 'triangle', a: .01, d: i === 2 ? .6 : .2, v: .11, lp: 1800, rev: .3 })); }),
  // Projects: three hammer knocks, then the fanfare.
  build: play(() => { const t = now(); [0, .14, .28].forEach((dt, i) => { osc({ f: 320 - i * 20, to: 180, t: t + dt, d: .06, v: .24, rev: .1 }); noise({ t: t + dt, f: 2200, q: 1.5, d: .04, v: .1 }); }); setTimeout(sfx.win, 450); }),
};

/* ---------- music ---------- */
// A tiny generative band for each place. The chords loop; the melody and fills change every time round.
const M = {
  keys: (f, t, d, v) => { bell({ f, t, a: .006, d, v, ratio: 1, index: .9, bus: musBus, pan: spread(), rev: .25 }); bell({ f: f * 2, t, d: .3, v: v * .12, ratio: 7, index: .3, bus: musBus, rev: .2 }); },
  // Sawtooth through a lowpass so the bass line still shows up on a phone speaker.
  bass: (f, t, d, v) => osc({ f, t, type: 'sawtooth', a: .01, hold: d * .3, d: d * .7, v: v * .7, lp: 750, bus: musBus, rev: .04 }),
  kick: t => { osc({ f: 110, to: 45, t, d: .22, v: .32, bus: musBus, rev: 0 }); noise({ t, type: 'lowpass', f: 2500, d: .02, v: .04, bus: musBus, rev: 0 }); },
  brush: t => noise({ t, f: 2200, q: .6, a: .01, d: .16, v: .06, bus: musBus, rev: .15 }),
  hat: (t, v) => noise({ t, type: 'highpass', f: 7500, d: .035, v: v * (.6 + Math.random() * .6), bus: musBus, pan: .25, rev: .05 }),
  vibes: (f, t, d) => bell({ f, t, d: d * 1.6, v: .055, ratio: 4, index: .5, bus: musBus, pan: spread(), rev: .45 }),
  pad: (fs, t, d) => fs.forEach(f => [-7, 7].forEach(c => osc({ f: f * 2 ** (c / 1200), t, type: 'triangle', a: d * .3, hold: d * .3, d: d * .6, v: .018, lp: 1300, bus: musBus, rev: .4 }))),
  kalimba: (f, t, v) => bell({ f, t, d: .5, v, ratio: 4.2, index: 1, bus: musBus, pan: spread(), rev: .35 }),
  flute: (f, t, d) => { osc({ f, t, a: .09, hold: d * .5, d: d * .6, v: .045, bus: musBus, rev: .45, vib: .006 }); noise({ t, f: f * 2, q: 4, a: .05, d: d * .5, v: .008, bus: musBus, rev: .3 }); },
  chirp: t => [0, .09].forEach(dt => osc({ f: 2600 + rnd(600), to: 3800 + rnd(500), t: t + dt, d: .05, v: .022, bus: musBus, pan: Math.random() * 1.4 - .7, rev: .5 })),
};
// A few notes from the chord, placed near `centre`, on random eighths of the bar.
function phrase(chord, centre, slots, n) {
  const pool = chord.map(m => m + 12 * Math.round((centre - m) / 12)), out = [];
  [...slots].sort(() => Math.random() - .5).slice(0, n).forEach(p => { out[p] = pool[rnd(pool.length)]; });
  return out;
}
const SONGS = {
  // Midnight Alley: lo-fi jazz. Electric piano, walking bass, brushed drums, swung eighths.
  alley: { bpm: 76, swing: .64,
    chords: [[50, [62, 65, 69, 72]], [43, [59, 62, 65, 69]], [48, [64, 67, 71, 74]], [45, [60, 64, 67, 69]]],  // Dm9 G9 Cmaj9 Am7
    play(s, t, beat) {
      const bar = Math.floor(s / 8) % 4, pos = s % 8, [root, ch] = this.chords[bar];
      if (pos === 0) { ch.forEach((m, i) => M.keys(mf(m), t + i * .015, beat * 2.4, .055)); M.bass(mf(root), t, beat * 1.6, .2); this.mel = Math.random() < .5 ? phrase(ch, 77, [0, 2, 3, 5, 6, 7], 2 + rnd(2)) : []; }
      if (pos === 3 && Math.random() < .6) ch.slice(1).forEach(m => M.keys(mf(m), t, beat * .6, .03));
      if (pos === 4) M.bass(mf(root + 7), t, beat * .9, .16);
      if (pos === 6 && Math.random() < .6) { const nx = this.chords[(bar + 1) % 4][0]; M.bass(mf(nx + (nx > root ? -1 : 1)), t, beat * .5, .13); }
      if (pos === 0 || (pos === 5 && Math.random() < .4)) M.kick(t);
      if (pos === 2 || pos === 6) M.brush(t);
      M.hat(t, pos % 2 ? .02 : .035);
      if (this.mel[pos]) M.vibes(mf(this.mel[pos]), t, beat);
    } },
  // Whispering Woods: folk. Kalimba arpeggios, a soft pad, shaker and the odd bird.
  forest: { bpm: 92, swing: .54,
    chords: [[43, [67, 71, 74]], [40, [67, 71, 76]], [36, [67, 72, 76]], [38, [66, 69, 74]]],  // G Em C D
    play(s, t, beat) {
      const bar = Math.floor(s / 8) % 4, pos = s % 8, [root, ch] = this.chords[bar], notes = [...ch, ch[0] + 12];
      if (pos === 0) { M.pad(ch.map(mf), t, beat * 4); M.bass(mf(root), t, beat * 2, .15); this.mel = Math.random() < .4 ? phrase(ch, 81, [0, 2, 4, 6], 2) : []; }
      if (pos === 4) M.bass(mf(root + 7), t, beat * 1.5, .11);
      if (pos === 0 || Math.random() < .85) M.kalimba(mf(notes[[0, 1, 2, 3, 2, 1, 2, 1][pos]]), t, pos === 0 ? .07 : .045);
      M.hat(t, pos % 2 ? .018 : .01);
      if (pos === 0 && Math.random() < .25) M.chirp(t + beat * rnd(4));
      if (this.mel[pos]) M.flute(mf(this.mel[pos]), t, beat * 1.6);
    } },
};
// Lookahead scheduler: every 60ms, book any notes due in the next 0.3s on the audio clock, so timing stays tight.
const music = (() => {
  let timer = 0, s = 0, next = 0, song = null;
  function tick() {
    if (!live() || AC.state !== 'running') { next = 0; return; }
    if (!next) next = AC.currentTime + .1;
    while (next < AC.currentTime + .3) {
      const want = SONGS[S.region] || SONGS.alley;
      if (song !== want && s % 8 === 0) { song = want; s = 0; song.mel = []; }  // change tune at a bar line
      const beat = 60 / song.bpm;
      try { song.play(s, next, beat); } catch (e) {}
      next += beat * (s % 2 ? 1 - song.swing : song.swing); s++;
    }
  }
  return {
    sync() { if (S.music && live()) { if (!timer) { s = 0; next = 0; song = null; timer = setInterval(tick, 60); } } else this.stop(); },
    stop() { clearInterval(timer); timer = 0; },
  };
})();

/* ---------- settings ---------- */
const LVL_NAMES = ['Off', 'Quiet', 'Loud'];
function soundIcon() { $('#muteBtn').innerHTML = icon(S.sfx || S.music ? 'sound' : 'mute', 20); }
function openSound() {
  const row = (k, label) => `<div class="sndrow"><span id="lbl-${k}">${label}</span><div class="seg" role="radiogroup" aria-labelledby="lbl-${k}">${LVL_NAMES.map((n, v) => `<button type="button" role="radio" data-k="${k}" data-v="${v}" aria-checked="${S[k] === v}">${n}</button>`).join('')}</div></div>`;
  showModal({ k: 'bingo', title: 'Sound', text: 'The alley and the woods each have their own tune.', html: `<div class="sndset">${row('music', 'Music')}${row('sfx', 'Sound effects')}</div>`, buttons: [{ label: 'Done', primary: true, fn: hideModal }] });
  document.querySelectorAll('.seg button').forEach(b => b.onclick = () => {
    const k = b.dataset.k; S[k] = +b.dataset.v; save();
    b.parentNode.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', x === b));
    unlockAudio(); setLevels(); music.sync(); soundIcon();
    if (k === 'sfx') sfx.good();
  });
}
