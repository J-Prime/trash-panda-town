// Drives Bin Stacker with emulated touch gestures and reports how the piece responded.
const { spawn } = require('child_process'), path = require('path'), fs = require('fs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const url = 'file://' + path.resolve(__dirname, '../index.html') + '?test';
(async () => {
  const prof = fs.mkdtempSync('/tmp/tpt-chrome-');
  const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9334', '--user-data-dir=' + prof, '--window-size=390,664', 'about:blank'], { stdio: 'ignore' });
  let list;
  for (let i = 0; i < 50 && !list; i++) { await new Promise(r => setTimeout(r, 200)); try { list = await (await fetch('http://127.0.0.1:9334/json')).json(); } catch (e) {} }
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pending = new Map(), errors = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.result?.value;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 664, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url }); await wait(1200);
  await ev(`localStorage.clear(); localStorage.setItem('x', '1'); location.reload()`); await wait(1200);
  await ev(`document.getElementById('nameInput').value='Sam'; document.querySelector('#mBtns button').click()`);
  // A path of [dx, dy] offsets in cells, played over `ms`.
  const gesture = async (pts, ms) => {
    const { x, y, cell } = await ev(`(() => { const r = document.querySelector('.st-cv').getBoundingClientRect(), p = __tpt.GAMES.stack._peek(); return { x: r.left + r.width * .3, y: r.top + r.height * .3, cell: p.cell }; })()`);
    const at = ([dx, dy]) => [{ x: x + dx * cell, y: y + dy * cell, id: 1 }];
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(pts[0]) });
    for (let i = 1; i < pts.length; i++) { await wait(ms / (pts.length - 1)); await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(pts[i]) }); }
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await wait(60);
  };
  const line = (dx, dy, n) => Array.from({ length: n + 1 }, (_, i) => [dx * i / n, dy * i / n]);
  const peek = () => ev(`JSON.stringify(__tpt.GAMES.stack._peek())`).then(JSON.parse);
  const tests = [
    ['tap rotates', [[0, 0], [0.05, 0.05]], 60],
    ['drag right 3 cells, drifting down', line(3.2, 0.9, 12), 320],
    ['drag left 2 cells', line(-2.2, 0.2, 10), 260],
    ['slow drag down 4 cells', line(0.2, 4.3, 16), 900],
    ['flick down', line(0, 5, 2), 20],
    ['flick up holds', line(0, -3, 2), 20],
  ];
  for (const [name, pts, ms] of tests) {
    await ev(`__tpt.S.tut.stack = 1; __tpt.S.lv.stack = 1; __tpt.openGame('stack')`); await wait(600);
    const a = await peek(); await gesture(pts, ms); const b = await peek();
    console.log(name.padEnd(36), `dx ${b.x - a.x}  dy ${b.y - a.y}  rot ${a.rs}->${b.rs}  piece ${a.k}->${b.k}  score +${b.score - a.score}`);
    await ev(`__tpt.closeGame()`);
  }
  console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
  ws.close(); ch.kill();
})();
