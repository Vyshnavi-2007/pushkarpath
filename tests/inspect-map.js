const { spawn } = require('child_process');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function inspect() {
  const edge = spawn(EDGE_PATH, ['--headless=new', '--remote-debugging-port=9223', '--disable-gpu', '--no-sandbox', 'http://localhost:5000/login']);
  await new Promise(r => setTimeout(r, 2000));
  const res = await fetch('http://127.0.0.1:9223/json/list');
  const targets = await res.json();
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  
  let id = 1;
  const send = (method, params = {}) => new Promise(resolve => {
    const cur = id++;
    const handler = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id === cur) {
        ws.removeEventListener('message', handler);
        resolve(m.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: cur, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  // Log in
  await send('Runtime.evaluate', {
    expression: `(async () => {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210' })
      });
      const verifyRes = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210', otp: '123456' })
      });
      const data = await verifyRes.json();
      sessionStorage.setItem('pushkarpath_token', data.token);
      sessionStorage.setItem('pushkarpath_user', JSON.stringify(data.user));
    })()`,
    awaitPromise: true
  });

  await send('Page.navigate', { url: 'http://localhost:5000/pilgrim' });
  await new Promise(r => setTimeout(r, 2000));

  const info = await send('Runtime.evaluate', {
    expression: `(() => {
      const mapContainer = document.querySelector('.leaflet-container');
      const rightCol = mapContainer ? mapContainer.closest('.relative') : null;
      const leftCol = document.querySelector('div.overflow-y-auto');
      const mainContainer = mapContainer ? mapContainer.closest('.flex-1.flex.flex-col') : null;
      return {
        mainContainerRect: mainContainer?.getBoundingClientRect(),
        leftColRect: leftCol?.getBoundingClientRect(),
        rightColRect: rightCol?.getBoundingClientRect(),
        mapRect: mapContainer?.getBoundingClientRect(),
        mapStyle: window.getComputedStyle(mapContainer).height,
        rightColStyle: rightCol ? window.getComputedStyle(rightCol).height : null
      };
    })()`,
    returnByValue: true
  });

  console.log('DOM Map Metrics:', JSON.stringify(info.result.value, null, 2));
  ws.close();
  edge.kill();
}

inspect().catch(console.error);

