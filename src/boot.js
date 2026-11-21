
const GAMES = { pop: Pop, merge: Kitchen, stack: Stack, bingo: Bingo, sort: Sort };

/* ---------- boot ---------- */
let rz;
const relayout = () => { clearTimeout(rz); rz = setTimeout(() => { if (mounted && cur.layout) cur.layout(); }, 120); };
window.addEventListener('resize', relayout);
// iOS ignores user-scalable=no, so pinch and double-tap zoom are blocked here as well as by touch-action in the CSS.
['gesturestart', 'gesturechange', 'dblclick'].forEach(ev => document.addEventListener(ev, e => e.preventDefault(), { passive: false }));
// The stage also changes size when the controls row wraps or a button label grows mid-game.
if (window.ResizeObserver) new ResizeObserver(relayout).observe(stage);
try { window.claude?.hot?.snapshot?.(() => ({ S })); } catch (e) {}

function boot(data) {
  const saved = (data && data.S) || load() || {}, base = fresh();
  S = Object.assign(base, saved);
  ['lv', 'got', 'best', 'tut'].forEach(k => { S[k] = Object.assign(fresh()[k], saved[k] || {}); });
  if ('muted' in saved) { if (saved.muted) { S.sfx = 0; S.music = 0; } delete S.muted; }  // older saves had one on/off switch
  if (!Array.isArray(S.town)) S.town = [];
  if (S.region !== 'forest') S.region = 'alley';
  // Saves from before the map: a crew already in the forest has made the trip.
  if (S.region === 'forest') S.trip = 1;
  delete S.viewing;
  const gift = S.migrated; delete S.migrated; S.v = 2;
  save(); applyRegion(); renderHub(); updateCaps();
  if (gift) setTimeout(() => toast('Welcome back! The raccoons found 50 bonus caps for you.'), 600);
  if (!S.name) askName();
  afterReload(); setTimeout(checkForUpdate, 3000);
  if (/[?&]test\b/.test(location.search)) window.__tpt = { openGame, closeGame, GAMES, playTrip, openMap, travelTo, closeMap, renderHub, applyRegion, coon, ALLEY, FOREST, get S() { return S; }, get audio() { return AC && AC.state; }, get stale() { return stale; }, get buses() { return { AC, sfxBus, musBus }; }, sfx, music };
}
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
