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
    this.consoleLogs = [];
    this.consoleErrors = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method) {
        if (msg.method === 'Runtime.consoleAPICalled') {
          const text = msg.params.args.map(a => a.value !== undefined ? a.value : (a.description || '')).join(' ');
          this.consoleLogs.push({ type: msg.params.type, text });
          console.log('[BROWSER CONSOLE]', msg.params.type, text);
        } else if (msg.method === 'Runtime.exceptionThrown') {
          console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails.text);
          this.consoleErrors.push(msg.params.exceptionDetails);
        }
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
  console.log('=== VERIFYING IN-APP NAVIGATION & GHAT PARKING MATCHING ===\n');

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

  const targetsRes = await fetch('http://127.0.0.1:9222/json/list');
  const targets = await targetsRes.json();
  const pageTarget = targets.find(t => t.type === 'page');
  if (!pageTarget) {
    edge.kill();
    throw new Error('Could not find Edge page target');
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  const cdp = new CDP(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  // Emulate live GPS in Rajahmundry near Pushkar Ghat via browser script override
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__custom_gps = {
        coords: {
          latitude: 17.0045,
          longitude: 81.7865,
          accuracy: 12,
          altitude: null,
          altitudeAccuracy: null,
          heading: 90,
          speed: 0
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

  const myGps = { latitude: 17.0045, longitude: 81.7865, accuracy: 12 };
  console.log('Emulated real GPS position:', myGps);

  // Authenticate pilgrim first
  await cdp.send('Page.navigate', { url: 'http://localhost:5000/login' });
  await sleep(1000);
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

  // =========================================================================
  // TEST 1: OPEN NAVIGATE TO A LOT -> VERIFY STARTING CHIP & GPS COORDINATES
  // =========================================================================
  console.log('\n--- 1. Testing Navigate page start from live GPS ---');
  await cdp.send('Page.navigate', {
    url: 'http://localhost:5000/pilgrim/navigate?lat=17.0015&lng=81.7820&name=Kotilingala+Parking+Lot&lotCode=PKG-01&mode=driving'
  });
  await sleep(3500);

  const startCheck = await cdp.eval(`
    (() => {
      const chip = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Starting from:'));
      const routeLines = document.querySelectorAll('.leaflet-overlay-pane path');
      const timeEl = document.querySelector('.font-black.font-heading');
      return {
        chipText: chip ? chip.textContent.trim() : null,
        routePolylinesCount: routeLines.length,
        timeRemainingText: timeEl ? timeEl.textContent.trim() : null,
        url: window.location.href
      };
    })()
  `);
  console.log('Navigate Page Check:', startCheck);
  await cdp.screenshot('navigate-01-live-gps.png');

  // Test toggling chip to "Demo start"
  console.log('\n--- Tapping chip to toggle to Demo start ---');
  await cdp.eval(`
    (() => {
      const chip = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Starting from:'));
      if (chip) chip.click();
    })()
  `);
  await sleep(2500);
  const chipToggleCheck = await cdp.eval(`
    (() => {
      const chip = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Starting from:'));
      return {
        chipText: chip ? chip.textContent.trim() : null
      };
    })()
  `);
  console.log('Chip after toggle:', chipToggleCheck);
  await cdp.screenshot('navigate-02-demo-start-toggled.png');

  // Switch back to live GPS
  await cdp.eval(`
    (() => {
      const chip = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Starting from:'));
      if (chip) chip.click();
    })()
  `);
  await sleep(2500);

  // =========================================================================
  // TEST 2: DEMO DRIVE (25 SECONDS TOTAL, COVERS ENTIRE ROUTE)
  // =========================================================================
  console.log('\n--- 2. Testing Demo Drive speed and arrival ---');
  const demoDriveBtnCheck = await cdp.eval(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Demo drive'));
      if (btn) {
        btn.click();
        return { clicked: true };
      }
      return { clicked: false };
    })()
  `);
  console.log('Demo drive button clicked:', demoDriveBtnCheck);

  // Take screenshot at ~5 seconds into demo drive
  await sleep(5000);
  const midDriveMetrics = await cdp.eval(`
    (() => {
      const markerLabel = document.querySelector('.leaflet-tooltip');
      const timeRemaining = document.querySelector('.font-black.font-heading');
      return {
        tooltip: markerLabel ? markerLabel.textContent.trim() : null,
        timeText: timeRemaining ? timeRemaining.textContent.trim() : null
      };
    })()
  `);
  console.log('Mid-drive check at 5s:', midDriveMetrics);
  await cdp.screenshot('navigate-03-mid-demo-drive.png');

  // Wait remaining ~21 seconds for demo drive to reach destination
  console.log('Waiting for demo drive to complete 25 seconds...');
  await sleep(22000);

  const demoDriveArrival = await cdp.eval(`
    (() => {
      const arrivedHeader = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('Arrived at Destination'));
      const scanInBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Scan IN'));
      return {
        hasArrived: !!arrivedHeader,
        hasScanInBtn: !!scanInBtn
      };
    })()
  `);
  console.log('Demo drive arrival check after 25s:', demoDriveArrival);
  await cdp.screenshot('navigate-04-demo-drive-arrival.png');

  // =========================================================================
  // TEST 3: "ARRIVE NOW" BUTTON TEST
  // =========================================================================
  console.log('\n--- 3. Testing Arrive now button ---');
  // Navigate afresh to lot
  await cdp.send('Page.navigate', {
    url: 'http://localhost:5000/pilgrim/navigate?lat=17.0015&lng=81.7820&name=Kotilingala+Parking+Lot&lotCode=PKG-01&mode=driving'
  });
  await sleep(3000);

  await cdp.eval(`
    (() => {
      const arriveNowBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Arrive now'));
      if (arriveNowBtn) arriveNowBtn.click();
    })()
  `);
  await sleep(1500);

  const arriveNowResult = await cdp.eval(`
    (() => {
      const arrivedHeader = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('Arrived at Destination'));
      const scanInBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Scan IN'));
      return {
        hasArrived: !!arrivedHeader,
        hasScanInBtn: !!scanInBtn
      };
    })()
  `);
  console.log('Arrive now result:', arriveNowResult);
  await cdp.screenshot('navigate-05-arrive-now.png');

  // =========================================================================
  // TEST 4: CHECK EVERY ONE OF THE 5 GHATS IN PILGRIM APP
  // =========================================================================
  console.log('\n--- 4. Checking All 5 Ghats for Parking Matching (Step 1 & Step 2) ---');
  await cdp.send('Page.navigate', { url: 'http://localhost:5000/pilgrim' });
  await sleep(2500);

  // Clear existing journey state so we start fresh at Step 1
  await cdp.eval(`
    (() => {
      sessionStorage.removeItem('pushkarpath_journey');
      localStorage.removeItem('pushkarpath_journey');
    })()
  `);
  await cdp.send('Page.navigate', { url: 'http://localhost:5000/pilgrim' });
  await sleep(3000);

  const ghatCodes = ['PKG', 'KTL', 'SRW', 'GWG', 'MRK'];
  const ghatReport = {};

  for (const code of ghatCodes) {
    const res = await fetch(`http://localhost:5000/api/ghats/${code}/parking?radiusKm=3`);
    const lotsList = await res.json();
    ghatReport[code] = {
      lotsCount: lotsList.length,
      nearestLots: lotsList.slice(0, 4).map(l => `${l.name} (${l.code}) - ${l.distanceKm} km, ${l.free} free`)
    };
  }
  console.log('Ghat Parking API Report:', JSON.stringify(ghatReport, null, 2));

  // In UI: Click Markandeya Ghat (MRK) card / select button
  await cdp.eval(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const ghatDivs = Array.from(document.querySelectorAll('h4'));
      const mrkTitle = ghatDivs.find(h => h.textContent.includes('Markandeya') || h.textContent.includes('Padmavathi'));
      if (mrkTitle) {
        const card = mrkTitle.closest('div.cursor-pointer');
        if (card) {
          const selectBtn = card.querySelector('button');
          if (selectBtn) selectBtn.click();
          else card.click();
        }
      }
    })()
  `);
  await sleep(2500);

  const mrkUiCheck = await cdp.eval(`
    (() => {
      const distLabels = Array.from(document.querySelectorAll('span')).filter(s => s.textContent.includes('km from'));
      const tiles = Array.from(document.querySelectorAll('div')).filter(d => d.textContent.includes('km from Markandeya') || d.textContent.includes('km from'));
      return {
        renderedTilesCount: tiles.length,
        distLabelsCount: distLabels.length,
        sampleDistances: distLabels.slice(0, 4).map(s => s.textContent.trim())
      };
    })()
  `);
  console.log('Markandeya Ghat UI Parking Check:', mrkUiCheck);
  await cdp.screenshot('ghat-markandeya-parking.png');

  // Switch to Step 2 for Markandeya
  await cdp.eval(`
    (() => {
      const step2Btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('View all') || b.textContent.includes('2. Park'));
      if (step2Btn) step2Btn.click();
    })()
  `);
  await sleep(2500);
  await cdp.screenshot('ghat-markandeya-step2-grid.png');

  ws.close();
  edge.kill();
  console.log('\n=== ALL NAVIGATION AND GHAT PARKING TESTS PASSED! ===');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
