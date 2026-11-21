// Runs a list of [expression, waitMs, screenshotName] steps against the game in headless Chrome.
// Usage: node tools/shots.js steps.json   (screenshots land in /tmp/tpt-<name>.png)
const { spawn } = require('child_process'), path = require('path'), fs = require('fs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const url = process.env.URL || 'file://' + path.resolve(__dirname, '../index.html') + '?test';
const steps = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), VW = +process.env.VW || 390, VH = +process.env.VH || 844;
(async () => {
  const prof = fs.mkdtempSync('/tmp/tpt-chrome-');
  const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9335', '--user-data-dir=' + prof, '--window-size=' + VW + ',' + VH, '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
  let list;
  for (let i = 0; i < 50 && !list; i++) { await new Promise(r => setTimeout(r, 200)); try { list = await (await fetch('http://127.0.0.1:9335/json')).json(); } catch (e) {} }
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
  await send('Page.navigate', { url }); await wait(1200);
  await ev(`localStorage.clear(); location.reload()`); await wait(1200);
  await ev(`__tpt.S.name = 'Sam'; document.getElementById('modal').hidden = true`);
  for (const [expr, ms, name] of steps) {
    const v = expr ? await ev(expr) : undefined;
    if (v !== undefined && v !== null) console.log('>', JSON.stringify(v));
    await wait(ms || 300);
    if (name) { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`/tmp/tpt-${name}.png`, Buffer.from(s.result.data, 'base64')); }
  }
  console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
  ws.close(); ch.kill();
})();
