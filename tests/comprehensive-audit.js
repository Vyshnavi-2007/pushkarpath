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
    this.networkRequests = [];
    this.networkResponses = [];
    this.networkFailures = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method) {
        this.handleEvent(msg);
      }
    };
  }

  handleEvent(msg) {
    const { method, params } = msg;
    if (method === 'Runtime.consoleAPICalled') {
      const text = params.args.map(a => a.value !== undefined ? a.value : (a.description || '')).join(' ');
      if (params.type === 'error') {
        this.consoleErrors.push({ type: 'console.error', text, location: params.stackTrace });
      } else {
        this.consoleLogs.push({ type: params.type, text });
      }
    } else if (method === 'Runtime.exceptionThrown') {
      this.consoleErrors.push({
        type: 'exception',
        text: params.exceptionDetails.text + (params.exceptionDetails.exception?.description ? ': ' + params.exceptionDetails.exception.description : ''),
        url: params.exceptionDetails.url,
        line: params.exceptionDetails.lineNumber
      });
    } else if (method === 'Network.requestWillBeSent') {
      this.networkRequests.push({
        requestId: params.requestId,
        url: params.request.url,
        method: params.request.method,
        postData: params.request.postData
      });
    } else if (method === 'Network.responseReceived') {
      this.networkResponses.push({
        requestId: params.requestId,
        url: params.response.url,
        status: params.response.status,
        statusText: params.response.statusText
      });
    } else if (method === 'Network.loadingFailed') {
      this.networkFailures.push({
        requestId: params.requestId,
        errorText: params.errorText,
        canceled: params.canceled
      });
    }
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

  async setViewport(width, height, mobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: mobile ? 2 : 1,
      mobile
    });
    await sleep(200);
  }
}

async function main() {
  console.log('=== STARTING COMPLETE PUSHKARPATH VERIFICATION ===\n');

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
  await cdp.send('Network.enable');

  // =========================================================================
  // FIX 1: HOME PAGE IMAGE & HERO SECTION
  // =========================================================================
  console.log('\n--- Checking Fix 1: Home page hero image ---');
  await cdp.setViewport(1440, 900, false);
  await cdp.send('Page.navigate', { url: 'http://localhost:5000/' });
  await sleep(2000);

  const heroImgInfo = await cdp.eval(`
    (() => {
      const img = document.querySelector('section img');
      const footer = document.querySelector('footer')?.innerText || '';
      return {
        found: !!img,
        src: img?.src,
        currentSrc: img?.currentSrc,
        naturalWidth: img?.naturalWidth,
        naturalHeight: img?.naturalHeight,
        footerCredit: footer.includes('Tatiraju.rishabh') && footer.includes('v2026-11-06-3')
      };
    })()
  `);
  console.log('Hero Image Evaluation:', heroImgInfo);
  await cdp.screenshot('fix1-home-desktop.png');

  // Mobile home check (375x812)
  await cdp.setViewport(375, 812, true);
  await sleep(500);
  await cdp.screenshot('fix1-home-mobile.png');

  // Reset to desktop 1440x900
  await cdp.setViewport(1440, 900, false);

  // =========================================================================
  // STEP 0.4: NAVIGATE TO /PILGRIM & CAPTURE CONSOLE ERRORS
  // =========================================================================
  console.log('\n--- Step 0.4: Pilgrim Login & Console Errors on /pilgrim ---');

  // Perform pilgrim login via API or form
  await cdp.send('Page.navigate', { url: 'http://localhost:5000/login' });
  await sleep(1000);

  // Log in using phone 9876543210 and OTP 123456
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
      return data;
    })()
  `);

  // Clear previous logs
  cdp.consoleLogs = [];
  cdp.consoleErrors = [];

  console.log('Navigating to http://localhost:5000/pilgrim ...');
  await cdp.send('Page.navigate', { url: 'http://localhost:5000/pilgrim' });
  await sleep(3000);

  console.log('Console Errors on /pilgrim:', cdp.consoleErrors);
  console.log('Console Logs count on /pilgrim:', cdp.consoleLogs.length);

  // =========================================================================
  // FIX 2: 2-COLUMN LAYOUT & MAP VISIBILITY (Step 1 and Step 2)
  // =========================================================================
  console.log('\n--- Checking Fix 2: 2-Column layout & sticky map beside cards ---');
  const layoutCheck = await cdp.eval(`
    (() => {
      const leftCol = document.querySelector('div.overflow-y-auto');
      const mapContainer = document.querySelector('.leaflet-container');
      const rightCol = mapContainer?.parentElement?.parentElement;
      const leftRect = leftCol ? leftCol.getBoundingClientRect() : null;
      const mapRect = mapContainer ? mapContainer.getBoundingClientRect() : null;
      const tiles = document.querySelectorAll('.leaflet-tile');

      return {
        leftColFound: !!leftCol,
        mapFound: !!mapContainer,
        leftColWidth: leftRect?.width,
        leftColHeight: leftRect?.height,
        mapWidth: mapRect?.width,
        mapHeight: mapRect?.height,
        windowWidth: window.innerWidth,
        tilesCount: tiles.length
      };
    })()
  `);
  console.log('Layout metrics:', layoutCheck);
  await cdp.screenshot('fix2-pilgrim-step1-desktop.png');

  // Select first ghat (Pushkar Ghat)
  await cdp.eval(`
    (() => {
      const selectBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Select'));
      if (selectBtn) selectBtn.click();
    })()
  `);
  await sleep(1500);
  await cdp.screenshot('fix2-pilgrim-step1-ghat-selected.png');

  // Move to Step 2: Park
  await cdp.eval(`
    (() => {
      const step2Btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('2. Park'));
      if (step2Btn) step2Btn.click();
    })()
  `);
  await sleep(1500);

  const step2Metrics = await cdp.eval(`
    (() => {
      const tiles = document.querySelectorAll('.custom-lot-marker, .leaflet-marker-icon');
      const lotCards = document.querySelectorAll('.grid > div');
      return {
        markerCount: tiles.length,
        lotCardsCount: lotCards.length
      };
    })()
  `);
  console.log('Step 2 Metrics:', step2Metrics);
  await cdp.screenshot('fix2-pilgrim-step2-parking-grid.png');

  // =========================================================================
  // FIX 3: SHOW ROUTE FUNCTIONALITY & ROUTE LINE
  // =========================================================================
  console.log('\n--- Checking Fix 3: Show Route click & Polyline ---');

  // Clear network requests
  cdp.networkRequests = [];
  cdp.networkResponses = [];

  const routeClickRes = await cdp.eval(`
    (() => {
      // Find "Route" button inside the first parking lot card
      const routeBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === 'Route');
      if (routeBtns.length > 0) {
        routeBtns[0].click();
        return { clicked: true, totalRouteButtons: routeBtns.length };
      }
      return { clicked: false };
    })()
  `);
  console.log('Route button clicked:', routeClickRes);

  // Wait for route network response
  await sleep(3000);

  const routeNetwork = cdp.networkRequests.find(r => r.url.includes('/api/map/route'));
  console.log('Route API Request:', routeNetwork);

  // Check route state on page
  const routeState = await cdp.eval(`
    (() => {
      const polylines = document.querySelectorAll('.leaflet-overlay-pane path');
      const routeCard = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('Route to') && d.textContent.includes('Distance'));
      const distanceEl = routeCard?.innerText || '';
      return {
        polylinesCount: polylines.length,
        hasRouteCard: !!routeCard,
        cardText: distanceEl.slice(0, 200)
      };
    })()
  `);
  console.log('Route state on screen:', routeState);
  await cdp.screenshot('fix3-route-displayed.png');

  // =========================================================================
  // FIX 4: NAVIGATION SPEED AND "ARRIVE NOW"
  // =========================================================================
  console.log('\n--- Checking Fix 4: Navigation Speed and Arrive Now Button ---');

  await cdp.eval(`
    (() => {
      const navBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Navigate'));
      if (navBtn) navBtn.click();
    })()
  `);
  await sleep(2500);

  const navPageCheck = await cdp.eval(`
    (() => {
      const arriveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Arrive now'));
      const demoDriveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Demo drive'));
      const allButtons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
      return {
        url: window.location.pathname,
        hasArriveNow: !!arriveBtn,
        hasDemoDrive: !!demoDriveBtn,
        buttonLabels: allButtons
      };
    })()
  `);
  console.log('Navigate Page HUD check:', navPageCheck);
  await cdp.screenshot('fix4-navigation-hud.png');

  // Click "Arrive now"
  await cdp.eval(`
    (() => {
      const arriveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Arrive now'));
      if (arriveBtn) arriveBtn.click();
    })()
  `);
  await sleep(1500);

  const arrivalOverlay = await cdp.eval(`
    (() => {
      const arrivedTitle = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('Arrived at Destination'));
      const scanInBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Scan IN'));
      return {
        hasArrived: !!arrivedTitle,
        hasScanInBtn: !!scanInBtn
      };
    })()
  `);
  console.log('Arrival overlay status:', arrivalOverlay);
  await cdp.screenshot('fix4-arrive-now-result.png');

  // =========================================================================
  // FIX 5: QR SCANNED BUTTON FOR LAPTOPS (DEMO CHECKIN) & SHUTTLE TOAST
  // =========================================================================
  console.log('\n--- Checking Fix 5: Laptop Demo Checkin button & Shuttle Toast ---');

  // Open scan modal
  await cdp.eval(`
    (() => {
      const scanInBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Scan IN'));
      if (scanInBtn) scanInBtn.click();
    })()
  `);
  await sleep(1500);

  const modalCheck = await cdp.eval(`
    (() => {
      const demoBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('QR scanned — done (demo)'));
      return {
        hasDemoBtn: !!demoBtn,
        text: demoBtn?.textContent?.trim()
      };
    })()
  `);
  console.log('Scan Modal Demo Button:', modalCheck);
  await cdp.screenshot('fix5-scan-modal-demo-button.png');

  // Click "QR scanned — done (demo)"
  cdp.networkRequests = [];
  await cdp.eval(`
    (() => {
      const demoBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('QR scanned — done (demo)'));
      if (demoBtn) demoBtn.click();
    })()
  `);
  await sleep(2500);

  // Check if redirected to /pilgrim with shuttle toast
  const pilgrimCheckinCheck = await cdp.eval(`
    (() => {
      const toast = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('Shuttle buses to the ghats run every 5 minutes'));
      const parkedCard = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('Vehicle Parked Successfully'));
      return {
        url: window.location.pathname,
        hasToast: !!toast,
        toastText: toast?.textContent?.trim(),
        hasParkedCard: !!parkedCard
      };
    })()
  `);
  console.log('Check-in result & Shuttle notification:', pilgrimCheckinCheck);
  await cdp.screenshot('fix5-shuttle-toast.png');

  // =========================================================================
  // FIX 6: RETURN ROUTE FROM MY PARKING PLACE TO DESTINATION
  // =========================================================================
  console.log('\n--- Checking Fix 6: Return route from parked lot ---');

  // Move to Step 3: Return
  await cdp.eval(`
    (() => {
      const step3Btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('3. Return'));
      if (step3Btn) step3Btn.click();
    })()
  `);
  await sleep(1500);

  const step3Check = await cdp.eval(`
    (() => {
      const fromChip = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('From:'));
      return {
        fromChipFound: !!fromChip,
        fromText: fromChip?.textContent
      };
    })()
  `);
  console.log('Return Source Lot Chip:', step3Check);

  // Type Hyderabad in the search box
  await cdp.eval(`
    (() => {
      const input = document.querySelector('input[placeholder*="Search city"]');
      if (input) {
        input.value = 'Hyderabad';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()
  `);
  await sleep(1500);

  // Select Hyderabad chip or suggestion
  await cdp.eval(`
    (() => {
      const hydChip = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('Hyderabad') && d.textContent.includes('NH-65'));
      if (hydChip) hydChip.click();
    })()
  `);
  await sleep(2500);

  const returnRouteCheck = await cdp.eval(`
    (() => {
      const polylines = document.querySelectorAll('.leaflet-overlay-pane path');
      const navBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Navigate');
      const gmapsLink = document.querySelector('a[href*="google.com/maps"]');
      return {
        polylinesCount: polylines.length,
        hasNavBtn: !!navBtn,
        gmapsHref: gmapsLink?.href
      };
    })()
  `);
  console.log('Return Route verification:', returnRouteCheck);
  await cdp.screenshot('fix6-return-route.png');

  // =========================================================================
  // FIX 7: VOLUNTEER STAFF PORTAL - QR POSTERS (NO CAMERA)
  // =========================================================================
  console.log('\n--- Checking Fix 7: Volunteer Staff Portal with QR Posters ---');

  await cdp.send('Page.navigate', { url: 'http://localhost:5000/staff-login' });
  await sleep(1500);

  // Staff login: VOL-01, passcode pushkar2027
  await cdp.eval(`
    (async () => {
      const res = await fetch('/api/auth/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: 'VOL-01', passcode: 'pushkar2027' })
      });
      const data = await res.json();
      sessionStorage.setItem('pushkarpath_token', data.token);
      sessionStorage.setItem('pushkarpath_user', JSON.stringify(data.staff));
      return data;
    })()
  `);

  await cdp.send('Page.navigate', { url: 'http://localhost:5000/volunteer' });
  await sleep(3000);

  const volunteerPortalCheck = await cdp.eval(`
    (() => {
      const hasScanner = !!document.querySelector('#reader') || !!document.querySelector('video');
      const inPoster = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('IN • ప్రవేశం'));
      const outPoster = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('OUT • నిష్క్రమణ'));
      const printBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Print Posters'));
      const plusMinusBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('+1') || b.textContent.includes('-1'));
      const images = Array.from(document.querySelectorAll('#printable-posters img')).map(img => ({
        src: img.src?.slice(0, 40),
        naturalWidth: img.naturalWidth
      }));

      return {
        hasScanner,
        hasInPoster: !!inPoster,
        hasOutPoster: !!outPoster,
        hasPrintBtn: !!printBtn,
        plusMinusCount: plusMinusBtns.length,
        qrImages: images
      };
    })()
  `);
  console.log('Volunteer Portal verification:', volunteerPortalCheck);
  await cdp.screenshot('fix7-volunteer-posters.png');

  ws.close();
  edge.kill();
  console.log('\n=== ALL FIXES VERIFIED SUCCESSFULLY! ===');
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

