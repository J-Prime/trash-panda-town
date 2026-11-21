// Headless Chrome smoke test over CDP: opens every game at a few levels and reports errors and layout overflow.
const { spawn } = require('child_process'), path = require('path'), fs = require('fs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const url = 'file://' + path.resolve(__dirname, '../index.html') + '?test';
const shot = process.argv[2], VW = +process.env.VW || 390, VH = +process.env.VH || 844, SHOTS = process.env.SHOTS;
(async () => {
  const prof = fs.mkdtempSync('/tmp/tpt-chrome-');
  const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9333', '--user-data-dir=' + prof, '--window-size=' + VW + ',' + VH, '--force-device-scale-factor=2', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let list;
  for (let i = 0; i < 50 && !list; i++) { await new Promise(r => setTimeout(r, 200)); try { list = await (await fetch('http://127.0.0.1:9333/json')).json(); } catch (e) {} }
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pending = new Map(), errors = [];
  ws.onmessage = m => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    if (d.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push('CONSOLE ' + d.params.args.map(a => a.value ?? a.description).join(' '));
  };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) errors.push('EVAL ' + r.result.exceptionDetails.exception?.description); return r.result.result?.value; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url }); await wait(1500);
  await ev(`localStorage.clear(); location.reload()`); await wait(1500);
  console.log('name modal open:', await ev(`!document.getElementById('modal').hidden`));
  await ev(`document.getElementById('nameInput').value='Sam'; document.querySelector('#mBtns button').click()`);
  if (process.env.REGION) await ev(`__tpt.S.region = '${process.env.REGION}'; __tpt.applyRegion()`);
  const overflow = `(() => { const s = document.getElementById('stage'), o = []; s.querySelectorAll('*').forEach(e => { const r = e.getBoundingClientRect(), b = s.getBoundingClientRect(); if (r.width && (r.right > b.right + 1 || r.left < b.left - 1 || r.bottom > b.bottom + 1)) o.push(e.className || e.tagName); }); return [...new Set(o)].slice(0, 6).join(',') || 'none'; })()`;
  const ctl = `(() => { const c = document.getElementById('controls'), o = []; if (c.scrollWidth > c.clientWidth + 1) o.push('controls overflow'); document.querySelectorAll('#game *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.bottom > innerHeight + 1 && !e.closest('#stage')) o.push('offscreen:' + (e.id || e.className || e.tagName)); }); return [...new Set(o)].slice(0, 4).join(',') || 'ok'; })()`;
  const plan = { pop: [1, 4, 12], merge: [1, 5, 10], stack: [1, 2, 3, 4, 9], bingo: [1, 3, 7, 10], sort: [1, 4, 12, 15] };
  for (const [k, lvls] of Object.entries(plan)) for (const L of lvls) {
    if (process.env.ONLY && !process.env.ONLY.split(',').includes(k)) continue;
    await ev(`__tpt.S.tut['${k}'] = 1; __tpt.S.lv['${k}'] = ${L}; __tpt.S.kitchen = null; __tpt.openGame('${k}')`);
    await wait(k === 'bingo' ? 5000 : 1500);
    if (k === 'stack') { await ev(`for (let i = 0; i < 4; i++) { for (let j = 0; j < [4,0,4,0][i]; j++) window.dispatchEvent(new KeyboardEvent('keydown', {key: ['ArrowLeft','ArrowRight','ArrowLeft','ArrowRight'][i]})); window.dispatchEvent(new KeyboardEvent('keydown', {key: ' '})); }`); await wait(1200); }
    if (k === 'sort') await ev(`(() => { const j = [...document.querySelectorAll('.jar')]; for (let i = 0; i < 30; i++) { j[i % j.length]?.click(); document.querySelectorAll('.jar')[(i * 7 + 3) % j.length]?.click(); } })()`);
    if (k === 'bingo') await ev(`document.querySelectorAll('.bcell')[3].click(); document.querySelector('#controls .btn:last-child').click()`);
    if (k === 'merge') await ev(`document.querySelectorAll('.mc.gen').forEach(g => g.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true})) || g.dispatchEvent(new PointerEvent('pointerup', {bubbles: true})))`);
    await wait(400);
    if (process.env.PROBE) console.log('PROBE', await ev(process.env.PROBE));
    const info = await ev(`[document.getElementById('gTitle').textContent, document.getElementById('stats').textContent, document.getElementById('modal').hidden ? '' : 'MODAL:' + document.getElementById('mTitle').textContent].join(' | ')`);
    console.log(k, L, '|', info, '| overflow:', await ev(overflow), '|', await ev(ctl));
    if (SHOTS || (shot && shot === `${k}${L}`)) { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(SHOTS ? `/tmp/tpt-${k}${L}.png` : '/tmp/tpt-shot.png', Buffer.from(s.result.data, 'base64')); }
    await ev(`__tpt.closeGame()`);
  }
  if (shot === 'hub') { await ev(`__tpt.S.stars = 40; __tpt.S.town = ['lamp','paint','lights','herbs','sofa']; __tpt.closeGame()`); await wait(800); const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync('/tmp/tpt-shot.png', Buffer.from(s.result.data, 'base64')); }
  console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
  ws.close(); ch.kill();
})();
