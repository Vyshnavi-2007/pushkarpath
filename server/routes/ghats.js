const express = require('express');
const router = express.Router();
const Ghat = require('../models/Ghat');
const ParkingLot = require('../models/ParkingLot');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middleware/auth');
const { emitGhatsChanged, emitLotsChanged, emitAuditNew } = require('../lib/socketManager');

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const toRad = (x) => (x * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

async function relinkAllLotsToGhats() {
  const ghats = await Ghat.find({});
  if (ghats.length === 0) return;

  const lots = await ParkingLot.find({});
  for (const lot of lots) {
    if (!lot.location || lot.location.lat === undefined) continue;

    let nearest = null;
    let minDistance = Infinity;

    for (const ghat of ghats) {
      const dist = getDistanceMeters(
        lot.location.lat,
        lot.location.lng,
        ghat.location.lat,
        ghat.location.lng
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearest = ghat;
      }
    }

    if (nearest) {
      lot.nearestGhat = nearest.code;
      lot.nearestGhatMeters = minDistance;
      await lot.save();
    }
  }
}

function getParkingForGhat(ghat, lots, radiusKm = 3) {
  if (!ghat || !ghat.location || ghat.location.lat === undefined) return [];
  const radiusMeters = radiusKm * 1000;

  const validLots = (lots || []).filter(
    (lot) => lot.location && lot.location.lat !== undefined && lot.location.lng !== undefined && lot.status !== 'closed'
  );

  const lotsWithDist = validLots.map((lot) => {
    const dist = getDistanceMeters(
      ghat.location.lat,
      ghat.location.lng,
      lot.location.lat,
      lot.location.lng
    );
    const cap = lot.capacity || 100;
    const occ = lot.occupied ?? 0;
    const free = Math.max(0, cap - occ);
    const base = typeof lot.toObject === 'function' ? lot.toObject() : lot;
    const cleanLot = { ...base };
    delete cleanLot.toJSON;
    delete cleanLot.toObject;

    return {
      ...cleanLot,
      distanceMeters: dist,
      distanceKm: (dist / 1000).toFixed(1),
      capacity: cap,
      occupied: occ,
      free,
      beyond: false
    };
  });

  lotsWithDist.sort((a, b) => a.distanceMeters - b.distanceMeters);

  let matching = lotsWithDist.filter((l) => l.distanceMeters <= radiusMeters);
  if (matching.length < 4) {
    matching = lotsWithDist.slice(0, 6).map((l) => ({
      ...l,
      beyond: l.distanceMeters > radiusMeters
    }));
  }

  return matching;
}

/**
 * GET /api/ghats
 * Public. Return all ghats
 */
router.get('/', async (req, res) => {
  try {
    const ghats = await Ghat.find({}).sort({ code: 1 });
    return res.status(200).json(ghats);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch ghats: ' + err.message });
  }
});

/**
 * GET /api/ghats/:code
 * Public. Single ghat
 */
router.get('/:code', async (req, res) => {
  try {
    const ghat = await Ghat.findOne({ code: req.params.code.toUpperCase() });
    if (!ghat) {
      return res.status(404).json({ error: `Ghat '${req.params.code}' not found.` });
    }
    return res.status(200).json(ghat);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch ghat details: ' + err.message });
  }
});

/**
 * GET /api/ghats/:code/parking?radiusKm=3
 * Public. Returns open lots within radiusKm (default 3km) of the ghat.
 * Sorted by distance.
 * If fewer than 4 lots are within radius, returns 6 nearest regardless of distance with beyond: true.
 */
router.get('/:code/parking', async (req, res) => {
  try {
    const cleanCode = req.params.code.toUpperCase();
    const ghat = await Ghat.findOne({ code: cleanCode });
    if (!ghat) {
      return res.status(404).json({ error: `Ghat '${cleanCode}' not found.` });
    }

    const radiusKm = parseFloat(req.query.radiusKm) || 3;
    const allLots = await ParkingLot.find({});
    const matchingLots = getParkingForGhat(ghat, allLots, radiusKm);

    return res.status(200).json(matchingLots);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch ghat parking: ' + err.message });
  }
});

/**
 * POST /api/ghats
 * Admin only. Create ghat.
 */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { code, name, nameTe, description, location, coordSource, photo, facilities } = req.body;

    if (!code || !name || !location || location.lat === undefined || location.lng === undefined) {
      return res.status(400).json({ error: 'Code, name, and valid location (lat, lng) are required.' });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const existing = await Ghat.findOne({ code: cleanCode });
    if (existing) {
      return res.status(409).json({ error: `Ghat with code '${cleanCode}' already exists.` });
    }

    const ghat = await Ghat.create({
      code: cleanCode,
      name: String(name).trim(),
      nameTe: nameTe ? String(nameTe).trim() : undefined,
      description: description ? String(description).trim() : undefined,
      location: {
        lat: Number(location.lat),
        lng: Number(location.lng)
      },
      coordSource: coordSource || 'approx',
      photo: photo || undefined,
      facilities: Array.isArray(facilities) ? facilities : []
    });

    const audit = await AuditLog.create({
      action: 'GHAT_CREATED',
      target: ghat.code,
      before: null,
      after: ghat.toObject(),
      reason: req.body.reason || 'Admin created new ghat',
      byStaffId: req.user.staffId || req.user.phone || 'ADMIN'
    });

    await relinkAllLotsToGhats();
    emitAuditNew(audit);
    emitGhatsChanged();
    emitLotsChanged();

    return res.status(201).json(ghat);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create ghat: ' + err.message });
  }
});

/**
 * PUT /api/ghats/:code
 * Admin only. Update ghat. Re-link lots if location changes.
 */
router.put('/:code', authenticate, authorize('admin'), async (req, res) => {
  try {
    const cleanCode = req.params.code.toUpperCase();
    const ghat = await Ghat.findOne({ code: cleanCode });
    if (!ghat) {
      return res.status(404).json({ error: `Ghat '${cleanCode}' not found.` });
    }

    const beforeState = ghat.toObject();
    const { name, nameTe, description, location, coordSource, photo, facilities, reason } = req.body;

    let locationChanged = false;
    if (name !== undefined) ghat.name = String(name).trim();
    if (nameTe !== undefined) ghat.nameTe = String(nameTe).trim();
    if (description !== undefined) ghat.description = String(description).trim();
    if (coordSource !== undefined) ghat.coordSource = coordSource;
    if (photo !== undefined) ghat.photo = photo;
    if (facilities !== undefined) ghat.facilities = Array.isArray(facilities) ? facilities : [];

    if (location && location.lat !== undefined && location.lng !== undefined) {
      if (location.lat !== ghat.location.lat || location.lng !== ghat.location.lng) {
        ghat.location = { lat: Number(location.lat), lng: Number(location.lng) };
        locationChanged = true;
      }
    }

    await ghat.save();

    const audit = await AuditLog.create({
      action: 'GHAT_UPDATED',
      target: ghat.code,
      before: beforeState,
      after: ghat.toObject(),
      reason: reason || 'Ghat updated by admin',
      byStaffId: req.user.staffId || req.user.phone || 'ADMIN'
    });

    if (locationChanged) {
      await relinkAllLotsToGhats();
      emitLotsChanged();
    }

    emitAuditNew(audit);
    emitGhatsChanged();

    return res.status(200).json(ghat);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update ghat: ' + err.message });
  }
});

module.exports = router;
module.exports.relinkAllLotsToGhats = relinkAllLotsToGhats;
module.exports.getDistanceMeters = getDistanceMeters;
module.exports.getParkingForGhat = getParkingForGhat;
