const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\raona\\.gemini\\antigravity\\brain\\1aa8a653-80c4-43df-90bb-e17ca432d50c';

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

class CDPClient {
  constructor(ws) {
    this.ws = ws;
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function runTest() {
  console.log('Launching headless Edge...');
  const edge = spawn(EDGE_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--window-size=1440,900',
    'about:blank'
  ]);

  edge.stderr.on('data', d => {});

  let versionData = null;
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch (e) {}
  }

  if (!versionData) {
    edge.kill();
    throw new Error('Failed to connect to Edge CDP port 9222');
  }

  console.log('CDP Version:', versionData['Browser']);

  // Create new page target
  const newTabRes = await fetch('http://127.0.0.1:9222/json/new?http://localhost:5000/');
  const target = await newTabRes.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  const cdp = new CDPClient(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');

  console.log('Navigating to http://localhost:5000/ ...');
  await cdp.send('Page.navigate', { url: 'http://localhost:5000/' });
  await sleep(2000);

  // Take screenshot of desktop home
  const shot1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const homeShotPath = path.join(ARTIFACTS_DIR, '01-home-desktop.png');
  fs.writeFileSync(homeShotPath, Buffer.from(shot1.data, 'base64'));
  console.log('Saved home desktop screenshot:', homeShotPath);

  // Mobile viewport for home page
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await sleep(1000);
  const shot2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const homeMobileShotPath = path.join(ARTIFACTS_DIR, '01-home-mobile.png');
  fs.writeFileSync(homeMobileShotPath, Buffer.from(shot2.data, 'base64'));
  console.log('Saved home mobile screenshot:', homeMobileShotPath);

  // Reset to desktop 1440x900
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  ws.close();
  edge.kill();
  console.log('Test completed successfully.');
}

runTest().catch(e => {
  console.error('CDP test error:', e);
  process.exit(1);
});

