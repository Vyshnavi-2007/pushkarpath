const express = require('express');
const router = express.Router();
let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch (e) {
  bcrypt = require('bcrypt');
}
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middleware/auth');
const { emitAuditNew } = require('../lib/socketManager');

const SALT_ROUNDS = 10;

/**
 * GET /api/staff
 * Admin only. List all staff and volunteers.
 */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const staffMembers = await User.find({ role: { $in: ['staff', 'admin'] } })
      .select('-passcodeHash')
      .sort({ staffId: 1, createdAt: -1 });

    return res.status(200).json(staffMembers);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list staff: ' + err.message });
  }
});

/**
 * POST /api/staff
 * Admin only. Create staff or volunteer.
 */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { staffId, name, passcode, role, kind, assignment } = req.body;

    if (!staffId || !name || !passcode) {
      return res.status(400).json({ error: 'staffId, name, and passcode are required.' });
    }

    const cleanStaffId = String(staffId).trim().toUpperCase();
    const existing = await User.findOne({ staffId: cleanStaffId });
    if (existing) {
      return res.status(409).json({ error: `Staff member with ID '${cleanStaffId}' already exists.` });
    }

    const passcodeHash = await bcrypt.hash(String(passcode), SALT_ROUNDS);

    const user = await User.create({
      staffId: cleanStaffId,
      name: String(name).trim(),
      role: role === 'admin' ? 'admin' : 'staff',
      kind: kind === 'staff' ? 'staff' : 'volunteer',
      passcodeHash,
      active: true,
      assignment: assignment
        ? {
            lotCode: assignment.lotCode ? String(assignment.lotCode).trim().toUpperCase() : null,
            point: assignment.point ? String(assignment.point).trim().toLowerCase() : null
          }
        : undefined
    });

    const userResponse = user.toObject();
    delete userResponse.passcodeHash;

    const audit = await AuditLog.create({
      action: 'STAFF_CREATED',
      target: user.staffId,
      before: null,
      after: userResponse,
      reason: req.body.reason || 'Admin created new staff member',
      byStaffId: req.user.staffId || req.user.phone || 'ADMIN'
    });
    emitAuditNew(audit);

    return res.status(201).json(userResponse);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create staff member: ' + err.message });
  }
});

/**
 * PUT /api/staff/:staffId
 * Admin only. Update assignment, name, or kind.
 */
router.put('/:staffId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const cleanStaffId = req.params.staffId.trim().toUpperCase();
    const staff = await User.findOne({ staffId: cleanStaffId });
    if (!staff) {
      return res.status(404).json({ error: `Staff member '${cleanStaffId}' not found.` });
    }

    const beforeState = staff.toObject();
    delete beforeState.passcodeHash;

    const { name, kind, assignment, role } = req.body;

    if (name !== undefined) staff.name = String(name).trim();
    if (kind !== undefined) staff.kind = kind;
    if (role !== undefined && ['staff', 'admin'].includes(role)) staff.role = role;
    if (assignment !== undefined) {
      staff.assignment = {
        lotCode: assignment.lotCode ? String(assignment.lotCode).trim().toUpperCase() : null,
        point: assignment.point ? String(assignment.point).trim().toLowerCase() : null
      };
    }

    await staff.save();

    const afterState = staff.toObject();
    delete afterState.passcodeHash;

    const audit = await AuditLog.create({
      action: 'STAFF_UPDATED',
      target: staff.staffId,
      before: beforeState,
      after: afterState,
      reason: req.body.reason || 'Admin updated staff info/assignment',
      byStaffId: req.user.staffId || req.user.phone || 'ADMIN'
    });
    emitAuditNew(audit);

    return res.status(200).json(afterState);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update staff member: ' + err.message });
  }
});

/**
 * PUT /api/staff/:staffId/deactivate
 * Admin only. Deactivate staff member.
 */
router.put('/:staffId/deactivate', authenticate, authorize('admin'), async (req, res) => {
  try {
    const cleanStaffId = req.params.staffId.trim().toUpperCase();
    const staff = await User.findOne({ staffId: cleanStaffId });
    if (!staff) {
      return res.status(404).json({ error: `Staff member '${cleanStaffId}' not found.` });
    }

    staff.active = false;
    await staff.save();

    const audit = await AuditLog.create({
      action: 'STAFF_DEACTIVATED',
      target: staff.staffId,
      before: { active: true },
      after: { active: false },
      reason: req.body.reason || 'Admin deactivated staff account',
      byStaffId: req.user.staffId || req.user.phone || 'ADMIN'
    });
    emitAuditNew(audit);

    return res.status(200).json({
      success: true,
      message: `Staff member ${staff.staffId} has been deactivated.`,
      staffId: staff.staffId,
      active: false
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to deactivate staff member: ' + err.message });
  }
});

/**
 * PUT /api/staff/:staffId/activate
 * Admin only. Activate staff member.
 */
router.put('/:staffId/activate', authenticate, authorize('admin'), async (req, res) => {
  try {
    const cleanStaffId = req.params.staffId.trim().toUpperCase();
    const staff = await User.findOne({ staffId: cleanStaffId });
    if (!staff) {
      return res.status(404).json({ error: `Staff member '${cleanStaffId}' not found.` });
    }

    staff.active = true;
    await staff.save();

    const audit = await AuditLog.create({
      action: 'STAFF_ACTIVATED',
      target: staff.staffId,
      before: { active: false },
      after: { active: true },
      reason: req.body.reason || 'Admin re-activated staff account',
      byStaffId: req.user.staffId || req.user.phone || 'ADMIN'
    });
    emitAuditNew(audit);

    return res.status(200).json({
      success: true,
      message: `Staff member ${staff.staffId} has been activated.`,
      staffId: staff.staffId,
      active: true
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to activate staff member: ' + err.message });
  }
});

/**
 * PUT /api/staff/:staffId/reset-passcode
 * Admin only. Reset staff passcode.
 */
router.put('/:staffId/reset-passcode', authenticate, authorize('admin'), async (req, res) => {
  try {
    const cleanStaffId = req.params.staffId.trim().toUpperCase();
    const { newPasscode } = req.body;

    if (!newPasscode || String(newPasscode).length < 4) {
      return res.status(400).json({ error: 'newPasscode is required (minimum 4 characters).' });
    }

    const staff = await User.findOne({ staffId: cleanStaffId });
    if (!staff) {
      return res.status(404).json({ error: `Staff member '${cleanStaffId}' not found.` });
    }

    staff.passcodeHash = await bcrypt.hash(String(newPasscode), SALT_ROUNDS);
    await staff.save();

    const audit = await AuditLog.create({
      action: 'STAFF_PASSCODE_RESET',
      target: staff.staffId,
      before: null,
      after: null,
      reason: req.body.reason || 'Admin reset staff passcode',
      byStaffId: req.user.staffId || req.user.phone || 'ADMIN'
    });
    emitAuditNew(audit);

    return res.status(200).json({
      success: true,
      message: `Passcode for ${staff.staffId} successfully reset.`
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reset passcode: ' + err.message });
  }
});

module.exports = router;
