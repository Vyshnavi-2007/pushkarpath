/**
 * Automated Verification for Demo-Only Features:
 * 1. Sample Occupancy (deterministic pattern, 2 full lots, config flag, reset)
 * 2. Staff QR Simulation buttons (IN +3, OUT -1, refusal when empty, refusal when full, 403 for wrong lot)
 * 3. DEMO_MODE=false returns 404
 */

const http = require('http');

async function run() {
  console.log('Starting Demo-Only Features Test Suite...\n');

  // Launch server in-process
  const path = require('path');
  process.chdir(path.join(__dirname, '..'));
  const { server } = require('../server/index');
  // Wait until server is listening
  await new Promise((r) => {
    function check() {
      if (server.listening) r();
      else setTimeout(check, 200);
    }
    check();
  });

  const BASE = 'http://127.0.0.1:5000';

  async function req(method, path, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = await res.text();
    }
    return { status: res.status, data };
  }

  // 1. Logins
  console.log('1. Logging in as Admin (ADMIN-01) and Volunteer (VOL-01)...');
  const adminLogin = await req('POST', '/api/auth/staff/login', { staffId: 'ADMIN-01', passcode: 'pushkar2027' });
  if (adminLogin.status !== 200 || !adminLogin.data.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.data));
  }
  const adminToken = adminLogin.data.token;

  const volLogin = await req('POST', '/api/auth/staff/login', { staffId: 'VOL-01', passcode: 'pushkar2027' });
  if (volLogin.status !== 200 || !volLogin.data.token) {
    throw new Error('VOL-01 login failed: ' + JSON.stringify(volLogin.data));
  }
  const volToken = volLogin.data.token;
  console.log('✓ Logged in successfully.\n');

  // 2. Test initial config
  console.log('2. Testing GET /api/config...');
  const cfg1 = await req('GET', '/api/config');
  console.log('Config 1:', cfg1.data);
  if (!cfg1.data.demoMode || cfg1.data.sampleOccupancy !== false) {
    throw new Error('Initial config mismatch: ' + JSON.stringify(cfg1.data));
  }
  console.log('✓ Initial sampleOccupancy is false.\n');

  // 3. Test POST /api/admin/demo/load-occupancy
  console.log('3. Testing POST /api/admin/demo/load-occupancy...');
  const loadRes = await req('POST', '/api/admin/demo/load-occupancy', {}, adminToken);
  if (loadRes.status !== 200) {
    throw new Error('Load occupancy failed: ' + JSON.stringify(loadRes.data));
  }
  console.log('Load occupancy response:', loadRes.data);

  // Check config
  const cfg2 = await req('GET', '/api/config');
  if (cfg2.data.sampleOccupancy !== true) {
    throw new Error('sampleOccupancy flag was not set to true in GET /api/config!');
  }
  console.log('✓ GET /api/config returned sampleOccupancy: true.\n');

  // Check lot occupancy distribution
  const lotsRes = await req('GET', '/api/lots');
  const allLots = lotsRes.data;
  console.log(`Auditing ${allLots.length} lots for sample occupancy distribution...`);

  const fullLots = allLots.filter((l) => l.occupied === l.capacity);
  console.log(`Found ${fullLots.length} 100% full lots:`, fullLots.map((l) => `${l.code} (${l.occupied}/${l.capacity})`));
  if (fullLots.length !== 2) {
    throw new Error(`Expected exactly 2 full lots, found ${fullLots.length}`);
  }

  const redLots = allLots.filter((l) => l.occupied / l.capacity >= 0.9);
  const amberLots = allLots.filter((l) => l.occupied / l.capacity >= 0.7 && l.occupied / l.capacity < 0.9);
  const midLots = allLots.filter((l) => l.occupied / l.capacity >= 0.5 && l.occupied / l.capacity < 0.7);
  const lowLots = allLots.filter((l) => l.occupied / l.capacity < 0.5);

  console.log(`Distribution: >=90% (red): ${redLots.length}, 70-89% (amber): ${amberLots.length}, 50-69%: ${midLots.length}, 15-45%: ${lowLots.length}`);
  if (redLots.length !== 4 || amberLots.length !== 7 || midLots.length !== 11 || lowLots.length !== 14) {
    throw new Error('Distribution count mismatch!');
  }
  console.log('✓ Deterministic sample occupancy distribution verified!\n');

  // 4. Test simulate IN on a 100% full lot -> should refuse with suggestedLot!
  const fullLotCode = fullLots[0].code;
  console.log(`4. Testing Simulate IN on 100% full lot '${fullLotCode}'...`);
  const fullInRes = await req('POST', '/api/scan/demo-staff', { lotCode: fullLotCode, dir: 'in' }, adminToken);
  console.log('Full lot IN response:', fullInRes.status, fullInRes.data);
  if (fullInRes.status !== 400 || !fullInRes.data.suggestedLot) {
    throw new Error('Full lot did not return 400 with suggestedLot: ' + JSON.stringify(fullInRes.data));
  }
  console.log(`✓ Full lot correctly refused with suggested alternative: ${fullInRes.data.suggestedLot.name} (${fullInRes.data.suggestedLot.available} free)!\n`);

  // 5. Test Simulate OUT on empty demo lot -> should refuse with "No demo pilgrim is parked here to check out."
  console.log("5. Testing Simulate OUT on lot with 0 demo pilgrims...");
  const emptyOutRes = await req('POST', '/api/scan/demo-staff', { lotCode: 'PKG-01', dir: 'out' }, volToken);
  console.log('Empty OUT response:', emptyOutRes.status, emptyOutRes.data);
  if (emptyOutRes.status !== 400 || !emptyOutRes.data.error.includes('No demo pilgrim is parked here')) {
    throw new Error('Empty OUT did not refuse with correct message: ' + JSON.stringify(emptyOutRes.data));
  }
  console.log('✓ Correctly refused OUT scan when no demo pilgrims are parked.\n');

  // 6. Test VOL-01 simulating IN 3 times on PKG-01
  const pkgBefore = (await req('GET', '/api/lots/PKG-01')).data;
  console.log(`6. Testing Simulate IN 3 times on PKG-01 (Current occupied: ${pkgBefore.occupied})...`);

  for (let i = 1; i <= 3; i++) {
    const inRes = await req('POST', '/api/scan/demo-staff', { lotCode: 'PKG-01', dir: 'in' }, volToken);
    if (inRes.status !== 200) {
      throw new Error(`IN scan ${i} failed: ` + JSON.stringify(inRes.data));
    }
    console.log(`  IN scan ${i} success: lot occupied is now ${inRes.data.lot.occupied}/${inRes.data.lot.capacity}`);
  }

  const pkgAfter3 = (await req('GET', '/api/lots/PKG-01')).data;
  if (pkgAfter3.occupied !== pkgBefore.occupied + 3) {
    throw new Error(`Expected occupied to be ${pkgBefore.occupied + 3}, got ${pkgAfter3.occupied}`);
  }
  console.log(`✓ Occupancy successfully incremented by +3!\n`);

  // 7. Test Simulate OUT once on PKG-01
  console.log('7. Testing Simulate OUT once on PKG-01...');
  const outRes = await req('POST', '/api/scan/demo-staff', { lotCode: 'PKG-01', dir: 'out' }, volToken);
  if (outRes.status !== 200) {
    throw new Error('OUT scan failed: ' + JSON.stringify(outRes.data));
  }
  console.log(`  OUT scan success: lot occupied is now ${outRes.data.lot.occupied}/${outRes.data.lot.capacity}`);
  const pkgAfterOut = (await req('GET', '/api/lots/PKG-01')).data;
  if (pkgAfterOut.occupied !== pkgAfter3.occupied - 1) {
    throw new Error(`Expected occupied to be ${pkgAfter3.occupied - 1}, got ${pkgAfterOut.occupied}`);
  }
  console.log(`✓ Occupancy successfully decremented by -1!\n`);

  // 8. Test ScanLog has source: 'demo-staff-button'
  console.log('8. Verifying ScanLogs have source: "demo-staff-button"...');
  const scansRes = await req('GET', '/api/logs/scans?lotCode=PKG-01&limit=5', null, adminToken);
  const demoScans = scansRes.data.logs.filter((s) => s.source === 'demo-staff-button');
  console.log(`Found ${demoScans.length} demo-staff-button logs out of ${scansRes.data.logs.length}`);
  if (demoScans.length === 0) {
    throw new Error('No ScanLogs found with source demo-staff-button');
  }
  console.log('✓ ScanLogs recorded with source demo-staff-button!\n');

  // 9. Test Volunteer 403 on other lot
  console.log('9. Testing VOL-01 simulating scan on unauthorized lot SRW-01 (should return 403)...');
  const unauthRes = await req('POST', '/api/scan/demo-staff', { lotCode: 'SRW-01', dir: 'in' }, volToken);
  console.log('Unauthorized lot response:', unauthRes.status, unauthRes.data);
  if (unauthRes.status !== 403) {
    throw new Error('Volunteer was not forbidden from other lot: ' + unauthRes.status);
  }
  console.log('✓ Volunteer correctly forbidden from other lots (403).\n');

  // 10. Test Reset Demo Data
  console.log('10. Testing POST /api/admin/demo/reset...');
  const resetRes = await req('POST', '/api/admin/demo/reset', {}, adminToken);
  if (resetRes.status !== 200) {
    throw new Error('Reset demo data failed: ' + JSON.stringify(resetRes.data));
  }
  console.log('Reset response:', resetRes.data);

  // Check config
  const cfg3 = await req('GET', '/api/config');
  if (cfg3.data.sampleOccupancy !== false) {
    throw new Error('sampleOccupancy was not reset to false!');
  }
  const lotsAfterReset = (await req('GET', '/api/lots')).data;
  const nonZeroLots = lotsAfterReset.filter((l) => l.occupied !== 0);
  if (nonZeroLots.length > 0) {
    throw new Error(`${nonZeroLots.length} lots still have non-zero occupied count!`);
  }
  console.log('✓ All lots reset to 0 occupied and sampleOccupancy is false.\n');

  // 11. Test DEMO_MODE=false returns 404
  console.log('11. Testing DEMO_MODE=false behavior (should return 404)...');
  process.env.DEMO_MODE = 'false';

  const disabledLoad = await req('POST', '/api/admin/demo/load-occupancy', {}, adminToken);
  const disabledReset = await req('POST', '/api/admin/demo/reset', {}, adminToken);
  const disabledStaff = await req('POST', '/api/scan/demo-staff', { lotCode: 'PKG-01', dir: 'in' }, volToken);

  console.log('Disabled load status:', disabledLoad.status);
  console.log('Disabled reset status:', disabledReset.status);
  console.log('Disabled demo-staff status:', disabledStaff.status);

  if (disabledLoad.status !== 404 || disabledReset.status !== 404 || disabledStaff.status !== 404) {
    throw new Error('Endpoints did not return 404 when DEMO_MODE=false');
  }
  console.log('✓ All demo endpoints return 404 when DEMO_MODE=false!\n');

  console.log('======================================================');
  console.log('  ALL DEMO-ONLY FEATURE TESTS PASSED SUCCESSFULLY!    ');
  console.log('======================================================\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
