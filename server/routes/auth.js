const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch (e) {
  bcrypt = require('bcrypt');
}
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'pushkarpath-jwt-secret-2027';

// Rate limiter for OTP requests
const otpLimiter = rateLimit({
  windowMs: parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  max: parseInt(process.env.OTP_RATE_LIMIT_MAX || '5', 10),
  message: { error: 'Too many OTP requests from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for staff login
const staffLoginLimiter = rateLimit({
  windowMs: parseInt(process.env.STAFF_LOGIN_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  max: parseInt(process.env.STAFF_LOGIN_RATE_LIMIT_MAX || '10', 10),
  message: { error: 'Too many login attempts from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * POST /api/auth/otp/request
 * Accept 10-digit phone number, mock OTP sending
 */
router.post('/otp/request', otpLimiter, async (req, res) => {
  return handleOtpRequest(req, res);
});
router.post('/send-otp', otpLimiter, async (req, res) => {
  return handleOtpRequest(req, res);
});
router.post('/otp/send', otpLimiter, async (req, res) => {
  return handleOtpRequest(req, res);
});

async function handleOtpRequest(req, res) {
  try {
    const { phone } = req.body;

    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully (Mock OTP: 123456)',
      phone: cleanPhone
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error generating OTP: ' + err.message });
  }
}

router.post('/verify-otp', async (req, res) => {
  return handleOtpVerify(req, res);
});
router.post('/otp/verify', async (req, res) => {
  return handleOtpVerify(req, res);
});

async function handleOtpVerify(req, res) {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required.' });
    }

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Invalid phone number format.' });
    }

    if (String(otp).trim() !== '123456') {
      return res.status(400).json({ error: 'Invalid OTP. For demo/testing use 123456.' });
    }

    let user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      user = await User.create({
        phone: cleanPhone,
        role: 'user',
        active: true
      });
    }

    if (user.active === false) {
      return res.status(403).json({ error: 'User account has been deactivated.' });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        phone: user.phone
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        role: user.role,
        name: user.name,
        active: user.active
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error during OTP verification: ' + err.message });
  }
}

/**
 * POST /api/auth/staff/login
 * Staff/Admin passcode login
 */
router.post('/staff-login', staffLoginLimiter, async (req, res) => {
  return handleStaffLogin(req, res);
});
router.post('/staff/login', staffLoginLimiter, async (req, res) => {
  return handleStaffLogin(req, res);
});

async function handleStaffLogin(req, res) {
  try {
    const { staffId, passcode } = req.body;

    if (!staffId || !passcode) {
      return res.status(400).json({ error: 'Staff ID and passcode are required.' });
    }

    const cleanStaffId = String(staffId).trim().toUpperCase();
    const user = await User.findOne({ staffId: cleanStaffId });

    if (!user || !user.passcodeHash) {
      return res.status(401).json({ error: 'Invalid Staff ID or passcode.' });
    }

    if (user.active === false) {
      return res.status(403).json({ error: 'Staff account has been deactivated. Contact an administrator.' });
    }

    const isMatch = await bcrypt.compare(String(passcode), user.passcodeHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid Staff ID or passcode.' });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        staffId: user.staffId,
        kind: user.kind,
        name: user.name,
        assignment: user.assignment
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        staffId: user.staffId,
        name: user.name,
        role: user.role,
        kind: user.kind,
        assignment: user.assignment,
        active: user.active
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error during staff login: ' + err.message });
  }
}

/**
 * GET /api/auth/me
 * Returns current authenticated user
 */
router.get('/me', authenticate, async (req, res) => {
  return res.status(200).json({
    user: req.user
  });
});

module.exports = router;
