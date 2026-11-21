// Checks that audio starts after a real tap when the browser requires a user gesture, as iOS does.
const { spawn } = require('child_process'), path = require('path'), fs = require('fs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const url = 'file://' + path.resolve(__dirname, '../index.html') + '?test';
(async () => {
  const prof = fs.mkdtempSync('/tmp/tpt-chrome-');
  const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9334', '--user-data-dir=' + prof, '--window-size=390,664', '--autoplay-policy=user-gesture-required', 'about:blank'], { stdio: 'ignore' });
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
  await ev(`document.getElementById('nameInput').value='Sam'`); await new Promise(r => setTimeout(r, 100));
  { const { x, y } = await ev(`(() => { const r = document.querySelector('#mBtns button').getBoundingClientRect(); return { x: r.left + 20, y: r.top + 10 }; })()`); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); }
  await ev(`document.querySelector('#mBtns button').click()`);
  const tap = async sel => {
    const { x, y } = await ev(`(() => { const r = document.querySelector('${sel}').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(300);
  };
  console.log('before any tap:', await ev('__tpt.audio') || 'not created');
  await ev(`__tpt.S.tut.pop = 1; __tpt.openGame('pop')`); await wait(800);
  console.log('game opened by script, no tap:', await ev('__tpt.audio') || 'not created');
  await tap('.pop-board'); console.log('after one tap on the board:', await ev('__tpt.audio'));
  await ev(`__tpt.closeGame()`); await wait(400);
  await tap('#muteBtn'); console.log('after muting, muted =', await ev('__tpt.S.muted'));
  await tap('#muteBtn'); console.log('after unmuting:', await ev('__tpt.audio'), 'muted =', await ev('__tpt.S.muted'));
  console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
  ws.close(); ch.kill();
})();
