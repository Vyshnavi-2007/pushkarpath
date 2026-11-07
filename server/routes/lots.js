const express = require('express');
const router = express.Router();
const ParkingLot = require('../models/ParkingLot');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middleware/auth');
const { emitLotUpdate, emitLotsChanged, emitAuditNew } = require('../lib/socketManager');
const { relinkAllLotsToGhats } = require('./ghats');

/**
 * GET /api/lots
 * Public. Return all parking lots
 */
router.get('/', async (req, res) => {
  try {
    const { sector, status, category } = req.query;
    const filter = {};

    if (sector) filter.sector = sector;
    if (status) filter.status = status;
    if (category) filter.category = category;

    const lots = await ParkingLot.find(filter).sort({ code: 1 });
    return res.status(200).json(lots);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch parking lots: ' + err.message });
  }
});

/**
 * GET /api/lots/:code
 * Public. Return single parking lot detail
 */
router.get('/:code', async (req, res) => {
  try {
    const lot = await ParkingLot.findOne({ code: req.params.code.toUpperCase() });
    if (!lot) {
      return res.status(404).json({ error: `Parking lot '${req.params.code}' not found.` });
    }
    return res.status(200).json(lot);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch lot details: ' + err.message });
  }
});

/**
 * POST /api/lots
 * Admin only. Create new parking lot.
 */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const {
      code,
      name,
      sector,
      category,
      fee,
      capacity,
      location,
      coordSource,
      nearestGhat,
      nearestGhatMeters,
      status
    } = req.body;

    if (!code || !name || capacity === undefined || !location || location.lat === undefined || location.lng === undefined) {
      return res.status(400).json({ error: 'Code, name, capacity, and valid location (lat, lng) are required.' });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const existing = await ParkingLot.findOne({ code: cleanCode });
    if (existing) {
      return res.status(409).json({ error: `Lot with code '${cleanCode}' already exists.` });
    }

    const lot = await ParkingLot.create({
      code: cleanCode,
      name: String(name).trim(),
      sector: sector || 'General',
      category: category || 'ground',
      fee: fee || 'Free',
      capacity: Number(capacity),
      occupied: 0,
      status: status || 'open',
      location: {
        lat: Number(location.lat),
        lng: Number(location.lng)
      },
      coordSource: coordSource || 'approx',
      nearestGhat: nearestGhat ? String(nearestGhat).trim().toUpperCase() : undefined,
      nearestGhatMeters: nearestGhatMeters !== undefined ? Number(nearestGhatMeters) : undefined
    });

    await relinkAllLotsToGhats();
    const updatedLot = await ParkingLot.findOne({ code: lot.code });

    const audit = await AuditLog.create({
      action: 'LOT_CREATED',
      target: lot.code,
      before: null,
      after: (updatedLot || lot).toObject(),
      reason: req.body.reason || 'Admin created new lot',
      byStaffId: req.user.staffId || req.user.phone || 'ADMIN'
    });
    emitAuditNew(audit);
    emitLotsChanged();

    return res.status(201).json(updatedLot || lot);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create parking lot: ' + err.message });
  }
});

/**
 * PUT /api/lots/:code
 * Admin only. Update lot properties.
 * If capacity changes, require `reason` in body.
 */
router.put('/:code', authenticate, authorize('admin'), async (req, res) => {
  try {
    const cleanCode = req.params.code.toUpperCase();
    const lot = await ParkingLot.findOne({ code: cleanCode });
    if (!lot) {
      return res.status(404).json({ error: `Lot '${cleanCode}' not found.` });
    }

    const {
      name,
      sector,
      category,
      fee,
      capacity,
      status,
      location,
      coordSource,
      nearestGhat,
      nearestGhatMeters,
      reason
    } = req.body;

    const beforeState = lot.toObject();
    const changes = [];

    if (capacity !== undefined && Number(capacity) !== lot.capacity) {
      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({ error: 'A reason of at least 5 characters is required when altering capacity.' });
      }
      const newCapacity = Number(capacity);
      if (newCapacity < 0) {
        return res.status(400).json({ error: 'Capacity cannot be negative.' });
      }
      lot.capacity = newCapacity;
      changes.push({ action: 'CAPACITY_CHANGE', before: beforeState.capacity, after: newCapacity });
    }

    if (status && status !== lot.status) {
      if (!['open', 'closed'].includes(status)) {
        return res.status(400).json({ error: 'Status must be open or closed.' });
      }
      const oldStatus = lot.status;
      lot.status = status;
      changes.push({ action: 'LOT_STATUS_CHANGE', before: oldStatus, after: status });
    }

    if (name !== undefined) lot.name = String(name).trim();
    if (sector !== undefined) lot.sector = String(sector).trim();
    if (category !== undefined) lot.category = category;
    if (fee !== undefined) lot.fee = fee;
    if (location && location.lat !== undefined && location.lng !== undefined) {
      lot.location = { lat: Number(location.lat), lng: Number(location.lng) };
    }
    if (coordSource !== undefined) lot.coordSource = coordSource;
    if (nearestGhat !== undefined) lot.nearestGhat = String(nearestGhat).trim().toUpperCase();
    if (nearestGhatMeters !== undefined) lot.nearestGhatMeters = Number(nearestGhatMeters);

    await lot.save();
    if (location && location.lat !== undefined && location.lng !== undefined) {
      await relinkAllLotsToGhats();
    }

    const staffId = req.user.staffId || req.user.phone || 'ADMIN';
    for (const change of changes) {
      const audit = await AuditLog.create({
        action: change.action,
        target: lot.code,
        before: change.before,
        after: change.after,
        reason: reason || 'Lot property updated',
        byStaffId: staffId
      });
      emitAuditNew(audit);
    }

    if (changes.length === 0) {
      const audit = await AuditLog.create({
        action: 'LOT_UPDATED',
        target: lot.code,
        before: beforeState,
        after: lot.toObject(),
        reason: reason || 'Lot details updated',
        byStaffId: staffId
      });
      emitAuditNew(audit);
    }

    emitLotUpdate(lot);
    emitLotsChanged();

    return res.status(200).json(lot);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update parking lot: ' + err.message });
  }
});

/**
 * PUT /api/lots/:code/correct
 * Admin only. Occupancy correction.
 * Require actualCount (0 to capacity) and reason (min 5 chars).
 */
router.put('/:code/correct', authenticate, authorize('admin'), async (req, res) => {
  try {
    const cleanCode = req.params.code.toUpperCase();
    const lot = await ParkingLot.findOne({ code: cleanCode });
    if (!lot) {
      return res.status(404).json({ error: `Lot '${cleanCode}' not found.` });
    }

    const { actualCount, reason } = req.body;

    if (actualCount === undefined || typeof actualCount !== 'number') {
      return res.status(400).json({ error: 'actualCount (Number) is required.' });
    }

    if (actualCount < 0 || actualCount > lot.capacity) {
      return res.status(400).json({
        error: `actualCount must be between 0 and lot capacity (${lot.capacity}).`
      });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return res.status(400).json({ error: 'A justification reason of at least 5 characters is required.' });
    }

    const beforeOccupied = lot.occupied;
    const qrTrackedCount = await User.countDocuments({ 'activeCheckin.lotCode': lot.code });

    lot.occupied = actualCount;
    await lot.save();

    const audit = await AuditLog.create({
      action: 'OCCUPANCY_CORRECTION',
      target: lot.code,
      before: {
        occupied: beforeOccupied,
        qrTrackedCount: qrTrackedCount
      },
      after: {
        occupied: actualCount
      },
      reason: reason.trim(),
      byStaffId: req.user.staffId || req.user.phone || 'ADMIN'
    });

    emitAuditNew(audit);
    emitLotUpdate(lot);

    return res.status(200).json({
      success: true,
      message: 'Occupancy corrected successfully.',
      lot,
      qrTrackedVehicles: qrTrackedCount
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to correct occupancy: ' + err.message });
  }
});

/**
 * GET /api/lots/:code/pilgrims
 * Staff / Admin. List pilgrims currently checked in to this lot
 */
router.get('/:code/pilgrims', authenticate, authorize('staff', 'admin'), async (req, res) => {
  try {
    const cleanCode = req.params.code.toUpperCase();
    const pilgrims = await User.find({ 'activeCheckin.lotCode': cleanCode })
      .select('phone name activeCheckin createdAt')
      .sort({ 'activeCheckin.enteredAt': -1 });

    return res.status(200).json(pilgrims || []);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch pilgrims in lot: ' + err.message });
  }
});

// Backward compatibility alias for vehicles endpoint
router.get('/:code/vehicles', authenticate, authorize('staff', 'admin'), async (req, res) => {
  return res.status(200).json({ lotCode: req.params.code, count: 0, vehicles: [] });
});

module.exports = router;
