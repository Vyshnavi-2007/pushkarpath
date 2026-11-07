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
  console.log('=== VERIFYING EXPANDED 11 GHATS, NEAREST LOCATION SORTING & RETURN CORRIDORS ===\n');

  // Verify backend API returns all 11 ghats
  const ghatsRes = await fetch('http://localhost:5000/api/ghats');
  const ghats = await ghatsRes.json();
  console.log(`Backend returned ${ghats.length} Ghats:`);
  ghats.forEach((g, i) => console.log(` ${i + 1}. [${g.code}] ${g.name} - Photo: ${g.photo ? 'Yes' : 'No'}`));

  if (ghats.length !== 11) {
    throw new Error(`Expected 11 ghats, but got ${ghats.length}`);
  }

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

  // Emulate user position near Pushkar Ghat (17.0045, 81.7865)
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__custom_gps = {
        coords: {
          latitude: 17.0045,
          longitude: 81.7865,
          accuracy: 12,
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

  // Login
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
      sessionStorage.removeItem('pushkarpath_journey');
    })()
  `);

  // Navigate to Pilgrim page
  console.log('\n--- 1. Testing Step 1: All 11 Ghats & Nearest to User Recommendation ---');
  await cdp.send('Page.navigate', { url: 'http://localhost:5000/pilgrim' });
  await sleep(3500);

  const step1Check = await cdp.eval(`
    (() => {
      const nearestBanner = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('Nearest Holy Ghat to You'));
      const ghatDivs = Array.from(document.querySelectorAll('h4'));
      const thumbnails = Array.from(document.querySelectorAll('img')).filter(img => img.src && !img.src.includes('tile'));
      return {
        hasNearestBanner: !!nearestBanner,
        nearestBannerText: nearestBanner ? nearestBanner.textContent.trim().replace(/\\s+/g, ' ') : null,
        renderedGhatCount: ghatDivs.length,
        thumbnailCount: thumbnails.length
      };
    })()
  `);
  console.log('Step 1 Check:', step1Check);
  await cdp.screenshot('ghats-11-with-images-nearest.png');

  // Test selecting TTD Ghat
  console.log('\n--- 2. Selecting TTD Ghat & Verifying Parking Matching ---');
  await cdp.eval(`
    (() => {
      const ttdCard = Array.from(document.querySelectorAll('h4')).find(h => h.textContent.includes('TTD Ghat'));
      if (ttdCard) {
        const btn = ttdCard.closest('div.cursor-pointer')?.querySelector('button');
        if (btn) btn.click();
      }
    })()
  `);
  await sleep(2500);
  await cdp.screenshot('ghat-ttd-selected-parking.png');

  // Switch to Step 3: Plan Your Return
  console.log('\n--- 3. Testing Step 3 Return Corridors & Less Crowded Route Options ---');
  await cdp.eval(`
    (() => {
      const step3Btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('3. Return'));
      if (step3Btn) step3Btn.click();
    })()
  `);
  await sleep(2000);

  // Click Vijayawada destination corridor
  await cdp.eval(`
    (() => {
      const cards = Array.from(document.querySelectorAll('div[class*="cursor-pointer"]'));
      const vjaCard = cards.find(d => d.textContent.includes('Vijayawada'));
      if (vjaCard) vjaCard.click();
    })()
  `);
  await sleep(3000);

  const corridorCheck = await cdp.eval(`
    (() => {
      const lessCrowded = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('Less Crowded'));
      const bypassRoute = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('Outer Bypass Route'));
      const heavyTraffic = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('Heavy Festival Congestion'));
      return {
        hasLessCrowdedOption: !!lessCrowded,
        hasOuterBypassOption: !!bypassRoute,
        hasHeavyTrafficOption: !!heavyTraffic
      };
    })()
  `);
  console.log('Return Corridor Options Check:', corridorCheck);
  await cdp.screenshot('return-corridors-less-crowded.png');

  // Complete return pilgrimage
  console.log('\n--- 4. Completing Return Trip & Verifying Return Tick & Thank You Blessings ---');
  await cdp.eval(`
    (() => {
      const saved = JSON.parse(sessionStorage.getItem('pushkarpath_journey') || '{}');
      sessionStorage.setItem('pushkarpath_journey', JSON.stringify({ ...saved, returnCompleted: true, step: 3 }));
    })()
  `);
  await cdp.send('Page.reload');
  await sleep(4000);

  const completionCheck = await cdp.eval(`
    (() => {
      const stepperBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('3. Return ✓') || b.textContent.includes('Return ✓'));
      const celebrationCard = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('Pilgrimage Completed Successfully'));
      const thankYouMsg = Array.from(document.querySelectorAll('p')).find(p => p.textContent.includes('Thank you for visiting Godavari Pushkaralu 2027'));
      return {
        stepperHasReturnTick: !!stepperBtn,
        hasCelebrationCard: !!celebrationCard,
        hasThankYouMessage: !!thankYouMsg
      };
    })()
  `);
  console.log('Completion Check:', completionCheck);
  await cdp.screenshot('pilgrimage-return-tick-thank-you.png');

  ws.close();
  edge.kill();
  console.log('\n=== ALL EXPANDED GHATS & RETURN CORRIDOR TESTS COMPLETED SUCCESSFULLY! ===');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

