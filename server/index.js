const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '.env') });
const http = require('http');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const { initSocket } = require('./lib/socketManager');
const { getSampleOccupancy } = require('./lib/appConfig');

// Import routes
const authRoutes = require('./routes/auth');
const lotsRoutes = require('./routes/lots');
const ghatsRoutes = require('./routes/ghats');
const scanRoutes = require('./routes/scan');
const staffRoutes = require('./routes/staff');
const adminRoutes = require('./routes/admin');
const logsRoutes = require('./routes/logs');
const mapRoutes = require('./routes/map');
const simRoutes = require('./routes/sim');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Security & performance middlewares
app.use(
  helmet({
    contentSecurityPolicy: false // Allow Leaflet / OpenStreetMap tiles and client scripts
  })
);
app.use(cors({ origin: '*', credentials: false }));
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// App configuration (demoMode flag, shuttle interval, and sampleOccupancy)
app.get('/api/config', (req, res) => {
  res.status(200).json({
    demoMode: process.env.DEMO_MODE === 'true',
    shuttleIntervalMin: parseInt(process.env.SHUTTLE_INTERVAL_MIN, 10) || 5,
    sampleOccupancy: getSampleOccupancy()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/lots', lotsRoutes);
app.use('/api/ghats', ghatsRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/sim', simRoutes);

// Static frontend serving and image assets
const clientPublicImagesPath = path.join(__dirname, '../client/public/images');
if (fs.existsSync(clientPublicImagesPath)) {
  app.use('/images', express.static(clientPublicImagesPath));
}

const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 handler for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint '${req.originalUrl}' not found.` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

// Database Connection & Server Startup
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pushkarpath';
const { seedData } = require('./seed/index');

let memoryMongoServer = null;

async function startServer() {
  try {
    console.log(`Attempting connection to MongoDB: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
    console.log('MongoDB connection established successfully.');

    // Seed if empty or staff missing
    const Ghat = require('./models/Ghat');
    const User = require('./models/User');
    const ghatCount = await Ghat.countDocuments();
    const adminUser = await User.findOne({ staffId: 'ADMIN-01' });
    if (ghatCount === 0 || !adminUser) {
      console.log('Database empty or demo staff missing. Performing seed...');
      await seedData(false);
    }
  } catch (err) {
    console.warn(`[PushkarPath] External MongoDB not reachable (${err.message}).`);
    console.log('[PushkarPath] Initializing zero-dependency high-performance in-memory repository...');
    const memoryDb = require('./lib/memoryDb');
    memoryDb.isMemoryMode = true;
    await seedData(false);
    console.log('[PushkarPath] In-memory database initialized and seeded successfully.');
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`  PushkarPath Backend Server running on port ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Local URL:   http://localhost:${PORT}`);
    console.log(`======================================================\n`);
  });
}

// Graceful shutdown handling
function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await mongoose.disconnect();
      console.log('MongoDB connection closed.');
    } catch (e) {
      console.error('Error during MongoDB disconnection:', e.message);
    }
    process.exit(0);
  });

  // Force exit after 10s timeout
  setTimeout(() => {
    console.error('Forcefully terminating process due to shutdown timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

if (!process.env.VERCEL) {
  startServer();
}

module.exports = { app, server };
