const express = require('express');
const router = express.Router();
const ScanLog = require('../models/ScanLog');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * GET /api/logs/scans
 * Staff / Admin. Paginated scan logs with filtering.
 */
router.get('/scans', authenticate, authorize('staff', 'admin'), async (req, res) => {
  try {
    const { lotCode, vehicleNo, type, startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (lotCode) {
      filter.lotCode = String(lotCode).trim().toUpperCase();
    }
    if (vehicleNo) {
      filter.vehicleNo = { $regex: String(vehicleNo).trim(), $options: 'i' };
    }
    if (type && ['ENTRY', 'EXIT', 'REJECTED'].includes(type.toUpperCase())) {
      filter.type = type.toUpperCase();
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      ScanLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      ScanLog.countDocuments(filter)
    ]);

    return res.status(200).json({
      logs,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to query scan logs: ' + err.message });
  }
});

/**
 * GET /api/logs/audit
 * Admin only. Paginated audit logs with filtering.
 */
router.get('/audit', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { action, target, byStaffId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (action) {
      filter.action = String(action).trim().toUpperCase();
    }
    if (target) {
      filter.target = { $regex: String(target).trim(), $options: 'i' };
    }
    if (byStaffId) {
      filter.byStaffId = String(byStaffId).trim();
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      AuditLog.countDocuments(filter)
    ]);

    return res.status(200).json({
      logs,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to query audit logs: ' + err.message });
  }
});

module.exports = router;
