const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\raona\\.gemini\\antigravity\\brain\\1aa8a653-80c4-43df-90bb-e17ca432d50c';

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 1;
    this.callbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
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

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error('Eval exception: ' + res.exceptionDetails.text);
    }
    return res.result?.value;
  }

  async screenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const fullPath = path.join(ARTIFACTS_DIR, filename);
    fs.writeFileSync(fullPath, Buffer.from(res.data, 'base64'));
    console.log(`[SCREENSHOT] Saved: ${filename}`);
    return fullPath;
  }
}

async function run() {
  console.log('Testing Map Tiles and Live GPS start...');

  const edge = spawn(EDGE_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    '--window-size=1440,900',
    'http://localhost:5000/'
  ]);

  await sleep(2500);

  const targetsRes = await fetch('http://localhost:9222/json/list');
  const targets = await targetsRes.json();
  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  const cdp = new CDP(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  // Provide mock GPS coordinates of the user (e.g. 17.0045, 81.7865)
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__custom_gps = {
        coords: {
          latitude: 17.0045,
          longitude: 81.7865,
          accuracy: 14,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };
      if (!navigator.geolocation) navigator.geolocation = {};
      navigator.geolocation.getCurrentPosition = function(success, error, options) {
        setTimeout(() => success(window.__custom_gps), 50);
      };
      navigator.geolocation.watchPosition = function(success, error, options) {
        setTimeout(() => success(window.__custom_gps), 50);
        return 1;
      };
      navigator.geolocation.clearWatch = function(id) {};
    `
  });

  // Authenticate first
  await cdp.send('Page.navigate', { url: 'http://localhost:5000/login' });
  await sleep(1200);
  await cdp.eval(`
    (async () => {
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
    })()
  `);

  // Navigate to /pilgrim
  await cdp.send('Page.navigate', { url: 'http://localhost:5000/pilgrim' });
  await sleep(4000);

  const pageCheck = await cdp.eval(`
    (() => {
      const tileImgs = Array.from(document.querySelectorAll('.leaflet-tile-pane img'));
      const sampleTileSrc = tileImgs.length > 0 ? tileImgs[0].src : null;
      const chipBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Your location') || b.textContent.includes('Live GPS') || b.textContent.includes('Demo start'));
      return {
        totalTileImages: tileImgs.length,
        sampleTileSrc,
        gpsChipText: chipBtn ? chipBtn.textContent.trim() : null
      };
    })()
  `);
  console.log('Pilgrim Page Check:', pageCheck);

  await cdp.screenshot('pilgrim-carto-tiles-live-gps.png');

  // Test selecting Pushkar Ghat (PKG) and Route
  await cdp.eval(`
    (() => {
      const pkgCard = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('Pushkar Ghat') && d.querySelector('button'));
      if (pkgCard) {
        const btn = pkgCard.querySelector('button');
        if (btn) btn.click();
      }
    })()
  `);
  await sleep(2500);

  await cdp.screenshot('pilgrim-step1-ghat-with-tiles.png');

  ws.close();
  edge.kill();
  console.log('Test completed successfully!');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
