const express = require('express');
const router = express.Router();
const ParkingLot = require('../models/ParkingLot');
const Ghat = require('../models/Ghat');
const User = require('../models/User');
const ScanLog = require('../models/ScanLog');
const { authenticate, authorize } = require('../middleware/auth');
const { getDistanceMeters, getParkingForGhat } = require('./ghats');
const { emitLotUpdate } = require('../lib/socketManager');
const { isDemoMode, setSampleOccupancy } = require('../lib/appConfig');

/**
 * GET /api/admin/overview
 * Admin only. Comprehensive system overview metrics.
 */
router.get('/overview', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [lots, ghats, activeStaff] = await Promise.all([
      ParkingLot.find({}),
      Ghat.find({}),
      User.countDocuments({ role: { $in: ['staff', 'admin'] }, active: true })
    ]);

    let totalCapacity = 0;
    let totalOccupied = 0;
    let lotsOpen = 0;
    let lotsClosed = 0;

    for (const lot of lots) {
      totalCapacity += lot.capacity || 0;
      totalOccupied += lot.occupied || 0;
      if (lot.status === 'open') {
        lotsOpen++;
      } else {
        lotsClosed++;
      }
    }
    const totalAvailable = Math.max(0, totalCapacity - totalOccupied);

    // Fullest lots (top 5 by occupancy %)
    const lotsWithPct = lots
      .filter((lot) => lot.capacity > 0)
      .map((lot) => ({
        code: lot.code,
        name: lot.name,
        sector: lot.sector,
        capacity: lot.capacity,
        occupied: lot.occupied,
        available: Math.max(0, lot.capacity - lot.occupied),
        status: lot.status,
        occupancyPct: Math.round(((lot.occupied || 0) / lot.capacity) * 100)
      }));

    lotsWithPct.sort((a, b) => b.occupancyPct - a.occupancyPct);
    const fullestLots = lotsWithPct.slice(0, 5);

    // Crowd pressure per ghat (uses same lot set as pilgrim app: open lots within 3km)
    const crowdPressure = ghats.map((ghat) => {
      const clusterLots = getParkingForGhat(ghat, lots, 3);
      const clusterCapacity = clusterLots.reduce((acc, curr) => acc + (curr.capacity || 0), 0);
      const clusterOccupied = clusterLots.reduce((acc, curr) => acc + (curr.occupied || 0), 0);
      const clusterPct =
        clusterCapacity > 0 ? Math.round((clusterOccupied / clusterCapacity) * 100) : 0;

      let indicator = 'Low';
      if (clusterPct >= 90) {
        indicator = 'Critical';
      } else if (clusterPct >= 75) {
        indicator = 'High';
      } else if (clusterPct >= 50) {
        indicator = 'Moderate';
      }

      return {
        ghatCode: ghat.code,
        ghatName: ghat.name,
        ghatNameTe: ghat.nameTe,
        occupancyPct: clusterPct,
        indicator,
        capacity: clusterCapacity,
        occupied: clusterOccupied,
        nearestLots: clusterLots.slice(0, 6).map((l) => ({
          code: l.code,
          name: l.name,
          distanceMeters: l.distanceMeters,
          occupied: l.occupied,
          capacity: l.capacity
        }))
      };
    });

    // Today's scan stats
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [entriesToday, exitsToday, refusalsToday] = await Promise.all([
      ScanLog.countDocuments({ type: 'ENTRY', createdAt: { $gte: startOfToday } }),
      ScanLog.countDocuments({ type: 'EXIT', createdAt: { $gte: startOfToday } }),
      ScanLog.countDocuments({ type: 'REJECTED', createdAt: { $gte: startOfToday } })
    ]);

    return res.status(200).json({
      totalCapacity,
      totalOccupied,
      totalAvailable,
      overallOccupancyPct:
        totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0,
      lotsOpen,
      lotsClosed,
      totalLots: lots.length,
      activeStaff,
      crowdPressure,
      fullestLots,
      todayStats: {
        entries: entriesToday,
        exits: exitsToday,
        refusals: refusalsToday,
        totalScans: entriesToday + exitsToday + refusalsToday
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate admin overview: ' + err.message });
  }
});

function hashLotCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Fixed percentage distribution:
// 4 lots: 90–100% full (red), including 2 lots exactly full (100%)
// 7 lots: 70–89% full (amber)
// 11 lots: 50–69% full
// 14 lots: 15–45% full
const SAMPLE_PERCENTAGES = [
  100, 100, 95, 91,
  88, 85, 82, 79, 76, 73, 71,
  68, 66, 64, 62, 60, 58, 56, 54, 52, 51, 50,
  45, 42, 40, 37, 35, 32, 30, 27, 25, 22, 20, 18, 16, 15
];

/**
 * POST /api/admin/demo/load-occupancy
 * Admin only. DEMO_MODE required. Set varied sample occupancy across lots.
 */
router.post('/demo/load-occupancy', authenticate, authorize('admin'), async (req, res) => {
  if (!isDemoMode()) {
    return res.status(404).json({ error: 'Demo mode disabled' });
  }

  try {
    const lots = await ParkingLot.find({});
    if (!lots || lots.length === 0) {
      return res.status(400).json({ error: 'No parking lots found to load sample occupancy.' });
    }

    // Sort lots deterministically by hash of lot code so results are identical every time
    const sortedLots = [...lots].sort((a, b) => hashLotCode(a.code) - hashLotCode(b.code));

    for (let i = 0; i < sortedLots.length; i++) {
      const lot = sortedLots[i];
      const pct = SAMPLE_PERCENTAGES[i % SAMPLE_PERCENTAGES.length];
      const cap = lot.capacity || 100;
      const occ = pct === 100 ? cap : Math.min(cap, Math.max(0, Math.round((pct / 100) * cap)));

      lot.occupied = occ;
      await lot.save();
      emitLotUpdate(lot);
    }

    setSampleOccupancy(true);

    return res.status(200).json({
      success: true,
      message: 'Sample occupancy pattern loaded successfully.',
      sampleOccupancy: true,
      totalLots: lots.length
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load sample occupancy: ' + err.message });
  }
});

/**
 * POST /api/admin/demo/reset
 * Admin only. DEMO_MODE required. Resets all lots to 0 occupied, deletes demo pilgrims, clears sampleOccupancy flag.
 */
router.post('/demo/reset', authenticate, authorize('admin'), async (req, res) => {
  if (!isDemoMode()) {
    return res.status(404).json({ error: 'Demo mode disabled' });
  }

  try {
    const lots = await ParkingLot.find({});
    for (const lot of lots) {
      lot.occupied = 0;
      await lot.save();
      emitLotUpdate(lot);
    }

    // Delete all temporary demo pilgrims
    await User.deleteMany({ isDemo: true });
    await User.deleteMany({ phone: { $regex: '^DEMO-' } });

    setSampleOccupancy(false);

    return res.status(200).json({
      success: true,
      message: 'Demo occupancy reset to zero and demo pilgrims cleared.',
      sampleOccupancy: false
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reset demo data: ' + err.message });
  }
});

module.exports = router;
