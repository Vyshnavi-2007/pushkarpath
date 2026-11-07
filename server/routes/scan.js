const express = require('express');
const router = express.Router();
const ParkingLot = require('../models/ParkingLot');
const ScanLog = require('../models/ScanLog');
const User = require('../models/User');
const { authenticate, authorize, authorizeActive } = require('../middleware/auth');
const { verifyPosterPayload, generatePosterPayload, generatePosterDataURL } = require('../lib/qr');
const { emitLotUpdate, emitScanNew } = require('../lib/socketManager');
const { getDistanceMeters } = require('./ghats');

/**
 * Finds the nearest open lot with available space
 */
async function findNearestOpenLot(currentLotCode) {
  const currentLot = await ParkingLot.findOne({ code: currentLotCode });
  const openLots = await ParkingLot.find({
    code: { $ne: currentLotCode },
    status: 'open',
    $expr: { $lt: ['$occupied', '$capacity'] }
  });

  if (!openLots.length) return null;

  if (currentLot && currentLot.location && currentLot.location.lat !== undefined) {
    const sorted = openLots.map((lot) => {
      const dist =
        lot.location && lot.location.lat !== undefined
          ? getDistanceMeters(
              currentLot.location.lat,
              currentLot.location.lng,
              lot.location.lat,
              lot.location.lng
            )
          : Infinity;
      return { lot, dist };
    });

    sorted.sort((a, b) => a.dist - b.dist);
    const best = sorted[0].lot;
    return {
      code: best.code,
      name: best.name,
      sector: best.sector,
      category: best.category,
      capacity: best.capacity,
      occupied: best.occupied,
      available: Math.max(0, best.capacity - best.occupied),
      location: best.location,
      distanceMeters: sorted[0].dist === Infinity ? null : sorted[0].dist
    };
  }

  // Fallback if current lot has no coordinates
  const fallback = openLots[0];
  return {
    code: fallback.code,
    name: fallback.name,
    sector: fallback.sector,
    category: fallback.category,
    capacity: fallback.capacity,
    occupied: fallback.occupied,
    available: Math.max(0, fallback.capacity - fallback.occupied),
    location: fallback.location,
    distanceMeters: null
  };
}

/**
 * Shared core checkin/checkout execution
 * Used by POST /api/scan/checkin, POST /api/scan/demo-checkin, and volunteer scanner
 */
async function executeCheckin({ user, lotCode, point, source = 'poster' }) {
  const cleanLotCode = String(lotCode || '').trim().toUpperCase();
  const cleanPoint = String(point || '').trim().toLowerCase(); // 'in' or 'out'

  const lot = await ParkingLot.findOne({ code: cleanLotCode });
  if (!lot) {
    return { status: 404, body: { success: false, error: `Parking area '${cleanLotCode}' not found.` } };
  }

  const userId = user._id ? user._id.toString() : user.id;

  // 10-second duplicate scan check for this user at this lot & point
  const tenSecAgo = new Date(Date.now() - 10000);
  const recentScan = await ScanLog.findOne({
    lotCode: cleanLotCode,
    staffId: userId,
    point: cleanPoint === 'in' ? 'entry' : 'exit',
    createdAt: { $gte: tenSecAgo }
  });

  if (recentScan) {
    return {
      status: 429,
      body: {
        success: false,
        error: 'Duplicate scan detected. Please wait at least 10 seconds between scans.'
      }
    };
  }

  const dbUser = await User.findById(userId);

  // ================= IN / ENTRY =================
  if (cleanPoint === 'in') {
    // 1. One active check-in per pilgrim rule
    if (dbUser && dbUser.activeCheckin && dbUser.activeCheckin.lotCode) {
      return {
        status: 400,
        body: {
          success: false,
          error: `You are already checked in at lot ${dbUser.activeCheckin.lotCode}. Please scan the OUT poster there before parking elsewhere.`
        }
      };
    }

    // 2. Check if lot is closed
    if (lot.status === 'closed') {
      const suggestedLot = await findNearestOpenLot(lot.code);
      const scanLog = await ScanLog.create({
        type: 'REJECTED',
        point: 'entry',
        vehicleNo: dbUser?.phone ? `PILGRIM-${dbUser.phone.slice(-4)}` : 'PILGRIM-APP',
        lotCode: lot.code,
        staffId: userId,
        source: source || 'poster',
        reason: `Lot ${lot.name} is currently closed.`
      });
      emitScanNew(scanLog);
      return {
        status: 400,
        body: {
          success: false,
          error: `Lot ${lot.name} is currently closed.`,
          suggestedLot
        }
      };
    }

    // 3. Capacity guard
    if (lot.occupied >= lot.capacity) {
      const suggestedLot = await findNearestOpenLot(lot.code);
      const scanLog = await ScanLog.create({
        type: 'REJECTED',
        point: 'entry',
        vehicleNo: dbUser?.phone ? `PILGRIM-${dbUser.phone.slice(-4)}` : 'PILGRIM-APP',
        lotCode: lot.code,
        staffId: userId,
        source: source || 'poster',
        reason: `Lot ${lot.name} is full (${lot.occupied}/${lot.capacity}).`
      });
      emitScanNew(scanLog);
      return {
        status: 400,
        body: {
          success: false,
          error: `Lot ${lot.name} is full (${lot.occupied}/${lot.capacity}).`,
          suggestedLot
        }
      };
    }

    // 4. Atomic capacity-guarded +1 update
    const updatedLot = await ParkingLot.findOneAndUpdate(
      {
        code: lot.code,
        status: 'open',
        $expr: { $lt: ['$occupied', '$capacity'] }
      },
      { $inc: { occupied: 1 } },
      { new: true }
    );

    if (!updatedLot) {
      const suggestedLot = await findNearestOpenLot(lot.code);
      return {
        status: 400,
        body: {
          success: false,
          error: `Lot ${lot.name} just became full.`,
          suggestedLot
        }
      };
    }

    // Record active check-in
    const now = new Date();
    if (dbUser) {
      dbUser.activeCheckin = {
        lotCode: lot.code,
        enteredAt: now
      };
      await dbUser.save();
    }

    const scanLog = await ScanLog.create({
      type: 'ENTRY',
      point: 'entry',
      vehicleNo: dbUser?.phone ? `PILGRIM-${dbUser.phone.slice(-4)}` : 'PILGRIM-APP',
      lotCode: lot.code,
      staffId: userId,
      source: source || 'poster',
      reason: source === 'demo-button' ? 'Demo Scan Button' : 'Pilgrim Poster Check-in'
    });

    emitLotUpdate(updatedLot);
    emitScanNew(scanLog);

    return {
      status: 200,
      body: {
        success: true,
        point: 'in',
        lotCode: lot.code,
        message: `Successfully checked in at ${lot.name}!`,
        lot: updatedLot,
        enteredAt: now
      }
    };
  }

  // ================= OUT / EXIT =================
  if (cleanPoint === 'out') {
    if (!dbUser || !dbUser.activeCheckin || dbUser.activeCheckin.lotCode !== lot.code) {
      return {
        status: 400,
        body: {
          success: false,
          error: `You do not have an active check-in at lot ${lot.code}.`
        }
      };
    }

    // Atomic -1 decrement
    const updatedLot =
      (await ParkingLot.findOneAndUpdate(
        { code: lot.code, occupied: { $gt: 0 } },
        { $inc: { occupied: -1 } },
        { new: true }
      )) || (await ParkingLot.findOne({ code: lot.code }));

    const now = new Date();
    let durationMin = 0;
    if (dbUser.activeCheckin && dbUser.activeCheckin.enteredAt) {
      durationMin = Math.max(
        1,
        Math.round((now.getTime() - new Date(dbUser.activeCheckin.enteredAt).getTime()) / 60000)
      );
    }

    dbUser.activeCheckin = {
      lotCode: null,
      enteredAt: null
    };
    await dbUser.save();

    const scanLog = await ScanLog.create({
      type: 'EXIT',
      point: 'exit',
      vehicleNo: dbUser?.phone ? `PILGRIM-${dbUser.phone.slice(-4)}` : 'PILGRIM-APP',
      lotCode: lot.code,
      staffId: userId,
      durationMin,
      source: source || 'poster',
      reason: source === 'demo-button' ? 'Demo Scan Button' : 'Pilgrim Poster Checkout'
    });

    if (updatedLot) {
      emitLotUpdate(updatedLot);
    }
    emitScanNew(scanLog);

    return {
      status: 200,
      body: {
        success: true,
        point: 'out',
        lotCode: lot.code,
        message: `Successfully checked out of ${lot.name}. Parked duration: ${durationMin} mins.`,
        lot: updatedLot,
        durationMin
      }
    };
  }

  return { status: 400, body: { success: false, error: `Invalid direction: ${point}` } };
}

/**
 * GET /api/scan/me
 * Returns current active check-in for the authenticated pilgrim
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user || !user.activeCheckin || !user.activeCheckin.lotCode) {
      return res.status(200).json({ activeCheckin: null });
    }

    const lot = await ParkingLot.findOne({ code: user.activeCheckin.lotCode });
    return res.status(200).json({
      activeCheckin: {
        lotCode: user.activeCheckin.lotCode,
        lotName: lot ? lot.name : user.activeCheckin.lotCode,
        enteredAt: user.activeCheckin.enteredAt,
        lot
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve checkin status: ' + err.message });
  }
});

/**
 * GET /api/scan/posters/:lotCode
 * Generates IN and OUT printable QR posters for volunteers
 */
router.get('/posters/:lotCode', authenticate, async (req, res) => {
  try {
    const lotCode = req.params.lotCode.toUpperCase();
    const lot = await ParkingLot.findOne({ code: lotCode });
    if (!lot) {
      return res.status(404).json({ error: `Lot '${lotCode}' not found.` });
    }

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    const inPayload = generatePosterPayload(lotCode, 'in', 1);
    const outPayload = generatePosterPayload(lotCode, 'out', 1);

    const [inQrUrl, outQrUrl] = await Promise.all([
      generatePosterDataURL(lotCode, 'in', 1, baseUrl),
      generatePosterDataURL(lotCode, 'out', 1, baseUrl)
    ]);

    return res.status(200).json({
      lot,
      inPoster: {
        point: 'in',
        label: 'ENTRY / IN POSTER',
        payload: inPayload,
        token: JSON.stringify(inPayload),
        qrDataUrl: inQrUrl,
        checkinUrl: `${baseUrl}/checkin?q=${encodeURIComponent(JSON.stringify(inPayload))}`
      },
      outPoster: {
        point: 'out',
        label: 'EXIT / OUT POSTER',
        payload: outPayload,
        token: JSON.stringify(outPayload),
        qrDataUrl: outQrUrl,
        checkinUrl: `${baseUrl}/checkin?q=${encodeURIComponent(JSON.stringify(outPayload))}`
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate poster QR: ' + err.message });
  }
});

/**
 * POST /api/scan/demo-checkin
 * Body: { lotCode, dir: 'in' | 'out' }
 * Pilgrim login required.
 * Enabled only when DEMO_MODE=true; otherwise returns 404.
 */
router.post('/demo-checkin', authenticate, async (req, res) => {
  if (process.env.DEMO_MODE !== 'true') {
    return res.status(404).json({ error: 'Demo checkin is only available when DEMO_MODE=true.' });
  }

  const pilgrim = req.user;
  if (pilgrim.role !== 'user' && pilgrim.role !== 'admin') {
    return res.status(403).json({ error: 'Only pilgrims can perform demo checkin.' });
  }

  const { lotCode, dir } = req.body;
  if (!lotCode || !dir) {
    return res.status(400).json({ error: 'lotCode and dir (in/out) are required.' });
  }

  const result = await executeCheckin({
    user: pilgrim,
    lotCode,
    point: dir,
    source: 'demo-button'
  });

  return res.status(result.status).json(result.body);
});

/**
 * POST /api/scan/demo-staff
 * Body: { lotCode, dir: 'in' | 'out' }
 * Staff only (only for their assigned lot; admin: any lot).
 * Enabled by default; disabled only when DEMO_MODE explicitly set to false.
 */
router.post('/demo-staff', authenticate, authorize('staff', 'admin'), async (req, res) => {
  if (process.env.DEMO_MODE === 'false') {
    return res.status(404).json({ error: 'Demo mode disabled' });
  }

  const { lotCode, dir } = req.body;
  if (!lotCode || !dir) {
    return res.status(400).json({ error: 'lotCode and dir (in/out) are required.' });
  }

  const cleanLotCode = String(lotCode).trim().toUpperCase();
  const cleanDir = String(dir).trim().toLowerCase();

  if (cleanDir !== 'in' && cleanDir !== 'out') {
    return res.status(400).json({ error: "dir must be 'in' or 'out'" });
  }

  // Authorization check: staff only for their own lot (admin: any lot)
  const staff = req.user;
  const userLot = staff.assignment?.lotCode || staff.assignedLot;
  if (staff.role !== 'admin' && userLot !== cleanLotCode && userLot !== 'ALL') {
    return res.status(403).json({
      error: `Staff are only authorized to simulate scans for assigned lot ${userLot || '(none)'}.`
    });
  }

  try {
    if (cleanDir === 'in') {
      // IN: create a temporary demo pilgrim (phone "DEMO-<timestamp>-<n>", role user/pilgrim, isDemo:true)
      const count = await User.countDocuments({ isDemo: true });
      const uniqueSuffix = `${Date.now().toString().slice(-4)}${count + 1}`;

      const demoPilgrim = await User.create({
        role: 'user',
        phone: `DEMO-${uniqueSuffix}`,
        name: `Pilgrim Vehicle ${uniqueSuffix}`,
        isDemo: true,
        active: true
      });

      const result = await executeCheckin({
        user: demoPilgrim,
        lotCode: cleanLotCode,
        point: 'in',
        source: 'demo-staff-button'
      });

      return res.status(result.status).json(result.body);
    } else {
      // OUT: pick the oldest checked-in demo pilgrim at this lot; fallback to any checked-in pilgrim
      const demoPilgrims = await User.find({
        isDemo: true,
        'activeCheckin.lotCode': cleanLotCode
      }).sort({ 'activeCheckin.enteredAt': 1, createdAt: 1 });

      let targetPilgrim = demoPilgrims && demoPilgrims.length > 0 ? demoPilgrims[0] : null;
      if (!targetPilgrim) {
        targetPilgrim = await User.findOne({
          'activeCheckin.lotCode': cleanLotCode
        }).sort({ 'activeCheckin.enteredAt': 1 });
      }

      if (!targetPilgrim) {
        return res.status(400).json({
          success: false,
          error: 'No vehicle is currently parked here to check out.'
        });
      }

      const result = await executeCheckin({
        user: targetPilgrim,
        lotCode: cleanLotCode,
        point: 'out',
        source: 'demo-staff-button'
      });

      return res.status(result.status).json(result.body);
    }
  } catch (err) {
    return res.status(500).json({ error: 'Staff scan simulation failed: ' + err.message });
  }
});

/**
 * POST /api/scan/checkin
 * Pilgrim checkin/checkout via poster scan (in-app or /checkin?q=...)
 */
router.post('/checkin', authenticate, async (req, res) => {
  try {
    const pilgrim = req.user;
    if (pilgrim.role !== 'user' && pilgrim.role !== 'admin') {
      return res.status(403).json({ error: 'Only pilgrims can check in via posters.' });
    }

    let payload = req.body.payload || req.body.qrPayload || req.body.q || req.body.token;
    if (typeof payload === 'string' && payload.startsWith('{')) {
      try {
        payload = JSON.parse(payload);
      } catch (e) {}
    }

    // Verify HMAC signature of the poster
    const verification = verifyPosterPayload(payload);
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: verification.reason || 'Invalid or tampered poster QR code.'
      });
    }

    const { lotCode, point } = verification;
    const result = await executeCheckin({
      user: pilgrim,
      lotCode,
      point,
      source: 'poster'
    });

    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ error: 'Checkin process failed: ' + err.message });
  }
});

/**
 * POST /api/scan
 * Volunteer / Staff scanning endpoint
 */
router.post('/', authenticate, authorizeActive, authorize('staff', 'admin'), async (req, res) => {
  try {
    const staff = req.user;
    const lotCode = (req.body.lotCode || staff.assignment?.lotCode || '').trim().toUpperCase();
    const point = (req.body.point || staff.assignment?.point || 'entry').trim().toLowerCase();

    const payload = req.body.qrPayload || req.body.qrData || req.body.payload;
    let posterData = payload;
    if (typeof payload === 'string' && payload.startsWith('{')) {
      try {
        posterData = JSON.parse(payload);
      } catch (e) {}
    }

    const verification = verifyPosterPayload(posterData);
    const targetLotCode = verification.valid ? verification.lotCode : lotCode;
    const targetPoint = verification.valid ? verification.point : (point === 'entry' || point === 'in' ? 'in' : 'out');

    const result = await executeCheckin({
      user: staff,
      lotCode: targetLotCode,
      point: targetPoint,
      source: 'volunteer-scan'
    });

    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ error: 'Scan process failed: ' + err.message });
  }
});

module.exports = router;
