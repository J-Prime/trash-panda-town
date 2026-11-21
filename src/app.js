/* =====================================================================
   Living outside the browser tab: save codes, updates and offline support.
   ===================================================================== */

/* ---------- save codes ---------- */
// Saves live in this browser only, so a code is how progress moves between phones, or from Safari into the home-screen app.
const CODE_PREFIX = 'TPT1-';
function saveCode() {
  const bytes = new TextEncoder().encode(JSON.stringify(S));
  let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b); });
  return CODE_PREFIX + btoa(bin);
}
function readCode(text) {
  const raw = (text || '').replace(/\s+/g, '');
  const at = raw.indexOf(CODE_PREFIX);
  if (at < 0) return null;
  try {
    const bin = atob(raw.slice(at + CODE_PREFIX.length));
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    return data && typeof data === 'object' && data.lv && Array.isArray(data.town) ? cleanSave(data) : null;
  } catch (e) { return null; }
}
// A pasted code is untrusted text (anyone could send one), and parts of the save are drawn as HTML.
// So the save is rebuilt from the fields the game knows, as numbers, flags and known project ids only.
function cleanSave(d) {
  const out = fresh(), obj = v => (v && typeof v === 'object' ? v : {});
  const num = (v, min = 0, max = 1e7) => { const n = Math.floor(+v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null; };
  const ids = new Set([...ALLEY, ...FOREST].map(p => p.id));
  out.name = String(d.name || '').slice(0, 20);
  out.sfx = num(d.sfx, 0, 2) ?? (d.muted ? 0 : 2);
  out.music = num(d.music, 0, 2) ?? (d.muted ? 0 : 1);
  out.region = d.region === 'forest' ? 'forest' : 'alley';
  out.trip = d.trip ? 1 : 0;
  out.town = [...new Set(Array.isArray(d.town) ? d.town.filter(id => ids.has(id)) : [])];
  ['caps', 'stars', 'totalStars', 'helps', 'parties'].forEach(k => { out[k] = num(d[k]) ?? out[k]; });
  if (d.stackBest != null) out.stackBest = num(d.stackBest) ?? 0;
  ORDER.forEach(k => {
    out.lv[k] = num(obj(d.lv)[k], 1, 9999) ?? 1;
    out.got[k] = num(obj(d.got)[k]) ?? 0;
    if (obj(d.tut)[k]) out.tut[k] = 1;
    const best = {};
    Object.entries(obj(obj(d.best)[k])).forEach(([L, st]) => { const l = num(L, 1, 9999), n = num(st, 0, 3); if (l != null && n != null) best[l] = n; });
    if (Object.keys(best).length) out.best[k] = best;
  });
  return out; // An unfinished kitchen night isn't carried over; it restarts fresh.
}
function copyText(text, box) {
  // The clipboard API needs https; the old LAN address is plain http, so fall back to selecting the box.
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(() => true, () => false);
  try {
    box.removeAttribute('readonly'); box.focus(); box.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    box.setAttribute('readonly', ''); box.blur();
    return Promise.resolve(ok);
  } catch (e) { return Promise.resolve(false); }
}
const saveSummary = d => {
  const parts = [`${d.town.filter(id => ALLEY.some(p => p.id === id)).length} of ${ALLEY.length} alley projects`];
  if (d.trip || d.region === 'forest') parts.push(`${d.town.filter(id => FOREST.some(p => p.id === id)).length} of ${FOREST.length} forest projects`);
  parts.push(`${d.stars || 0} ★`, `${d.caps || 0} caps`);
  return parts.join(', ');
};

function showSaveCode() {
  const code = saveCode();
  showModal({ k: 'sort', title: 'Your save code',
    text: 'This code holds all your progress. Copy it, then paste it into the game on the other phone or in the home-screen app. It also works as a backup.',
    html: `<textarea class="codebox" id="saveCodeBox" readonly rows="4" aria-label="Save code">${code}</textarea><p class="mnote">${esc(saveSummary(S))}</p>`,
    buttons: [
      { label: 'Copy code', primary: true, fn: () => copyText(code, $('#saveCodeBox')).then(ok => toast(ok ? 'Copied! Now paste it in the other game.' : 'Press and hold the code to copy it.')) },
      { label: 'Paste a code', fn: showLoadCode },
      { label: 'Done', fn: hideModal },
    ] });
}
function showLoadCode() {
  showModal({ k: 'sort', title: 'Load a save code',
    text: 'Paste a code from the other game. It replaces the progress on this phone.',
    html: '<textarea class="codebox" id="loadCodeBox" rows="4" placeholder="TPT1-…" aria-label="Paste a save code" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>',
    buttons: [
      { label: 'Load it', primary: true, fn: () => {
        const data = readCode($('#loadCodeBox').value);
        if (!data) { toast('That code didn\'t work. Copy the whole thing and try again.'); return; }
        showModal({ k: 'sort', title: `Load ${data.name ? data.name + '\'s' : 'this'} save?`,
          text: `${esc(saveSummary(data))}.<br><br>The progress on this phone will be replaced.`,
          buttons: [
            { label: 'Load it', primary: true, fn: () => {
              try {
                localStorage.setItem(KEY + '-backup', JSON.stringify(S));
                localStorage.setItem(KEY, JSON.stringify(data));
                sessionStorage.setItem('tpt-loaded', '1');
              } catch (e) {}
              location.reload();
            } },
            { label: 'Cancel', fn: showLoadCode },
          ] });
      } },
      { label: 'Back', fn: showSaveCode },
    ] });
}
$('#saveBtn').onclick = () => { sfx.tap(); showSaveCode(); };

/* ---------- updates ---------- */
// Every build publishes version.json. When a newer build is out, reload while she's sitting on the town screen.
let updateTried = '';
function checkForUpdate() {
  if (!/^https?:$/.test(location.protocol)) return;
  fetch('version.json', { cache: 'no-store' }).then(r => r.json()).then(v => {
    if (!v.build || v.build === BUILD || v.build === updateTried) return;
    // One try per build, so a slow CDN can't cause a reload loop.
    try { if (sessionStorage.getItem('tpt-tried') === v.build) return; sessionStorage.setItem('tpt-tried', v.build); sessionStorage.setItem('tpt-note', v.note || ''); } catch (e) {}
    updateTried = v.build;
    const idle = () => !curKey && $('#modal').hidden && !$('.cine') && !$('.mapview');
    if (idle()) location.reload();
    else { const t = setInterval(() => { if (idle()) { clearInterval(t); location.reload(); } }, 1500); }
  }).catch(() => {});
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdate(); });
function afterReload() {
  try {
    if (sessionStorage.getItem('tpt-loaded')) { sessionStorage.removeItem('tpt-loaded'); setTimeout(() => toast('Save loaded. Welcome back!'), 700); return; }
    if (sessionStorage.getItem('tpt-tried') === BUILD) {
      const note = sessionStorage.getItem('tpt-note'); sessionStorage.removeItem('tpt-tried');
      setTimeout(() => toast(note ? `Updated! ${note}` : 'Updated to the newest version.'), 700);
    }
  } catch (e) {}
}

/* ---------- offline ---------- */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
