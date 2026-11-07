const express = require('express');
const router = express.Router();
const simEngine = require('../sim/engine');
const { buildNetwork } = require('../sim/network');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * POST /api/sim/start
 * Admin only. Start simulation
 */
router.post('/start', authenticate, authorize('admin'), async (req, res) => {
  try {
    await simEngine.initialize();
    const state = simEngine.start();
    return res.status(200).json({ success: true, message: 'Simulation started.', state });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to start simulation: ' + err.message });
  }
});

/**
 * POST /api/sim/pause
 * Admin only. Pause simulation
 */
router.post('/pause', authenticate, authorize('admin'), (req, res) => {
  try {
    const state = simEngine.pause();
    return res.status(200).json({ success: true, message: 'Simulation paused.', state });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to pause simulation: ' + err.message });
  }
});

/**
 * POST /api/sim/resume
 * Admin only. Resume simulation
 */
router.post('/resume', authenticate, authorize('admin'), (req, res) => {
  try {
    const state = simEngine.resume();
    return res.status(200).json({ success: true, message: 'Simulation resumed.', state });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to resume simulation: ' + err.message });
  }
});

/**
 * POST /api/sim/reset
 * Admin only. Reset simulation
 */
router.post('/reset', authenticate, authorize('admin'), (req, res) => {
  try {
    const state = simEngine.reset();
    return res.status(200).json({ success: true, message: 'Simulation reset.', state });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reset simulation: ' + err.message });
  }
});

/**
 * PUT /api/sim/config
 * Admin only. Update arrivals per minute
 */
router.put('/config', authenticate, authorize('admin'), (req, res) => {
  try {
    const { arrivalsPerMinute } = req.body;
    if (arrivalsPerMinute === undefined) {
      return res.status(400).json({ error: 'arrivalsPerMinute is required.' });
    }
    const state = simEngine.setConfig({ arrivalsPerMinute });
    return res.status(200).json({ success: true, message: 'Simulation config updated.', state });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update simulation config: ' + err.message });
  }
});

/**
 * GET /api/sim/state
 * Admin only. Current simulation state
 */
router.get('/state', authenticate, authorize('admin'), (req, res) => {
  try {
    const state = simEngine.getState();
    return res.status(200).json(state);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get simulation state: ' + err.message });
  }
});

/**
 * GET /api/sim/network
 * Admin only. Return cached road network
 */
router.get('/network', authenticate, authorize('admin'), async (req, res) => {
  try {
    const network = await buildNetwork();
    return res.status(200).json(network);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve simulation network: ' + err.message });
  }
});

module.exports = router;
