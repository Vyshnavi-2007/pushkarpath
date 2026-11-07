require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch (e) {
  bcrypt = require('bcrypt');
}
const Ghat = require('../models/Ghat');
const ParkingLot = require('../models/ParkingLot');
const User = require('../models/User');
const { ghats, lots } = require('./data');
const { relinkAllLotsToGhats } = require('../routes/ghats');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pushkarpath';
const SEED_STAFF_PASSCODE = process.env.SEED_STAFF_PASSCODE || 'pushkar2027';

async function seedData(isReset = false) {
  if (isReset) {
    console.log('Reset flag detected. Dropping collections...');
    try {
      await mongoose.connection.dropDatabase();
      console.log('Database dropped cleanly.');
    } catch (e) {
      console.warn('Could not drop database:', e.message);
    }
  }

  // 1. Seed Ghats
  console.log(`Seeding ${ghats.length} Ghats...`);
  for (const g of ghats) {
    await Ghat.findOneAndUpdate(
      { code: g.code },
      { $set: g },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`Successfully seeded ${ghats.length} ghats.`);

  // 2. Seed Parking Lots
  console.log(`Seeding ${lots.length} Parking Lots...`);
  for (const l of lots) {
    await ParkingLot.findOneAndUpdate(
      { code: l.code },
      { $set: l },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`Successfully seeded ${lots.length} parking lots.`);

  // Recompute nearestGhat and nearestGhatMeters for every lot
  console.log('Recomputing nearestGhat and distance for all parking lots...');
  await relinkAllLotsToGhats();
  console.log('Successfully recomputed nearest ghat for all parking lots.');

  // 3. Seed Demo Users
  console.log('Seeding demo users...');
  const passcodeHash = await bcrypt.hash(SEED_STAFF_PASSCODE, 10);

  const demoUsers = [
    {
      staffId: 'ADMIN-01',
      name: 'Central Control Admin',
      role: 'admin',
      kind: 'staff',
      active: true,
      passcodeHash
    },
    {
      staffId: 'VOL-01',
      name: 'Ramesh (PKG-01 Entry)',
      role: 'staff',
      kind: 'volunteer',
      active: true,
      passcodeHash,
      assignment: {
        lotCode: 'PKG-01',
        point: 'entry'
      }
    },
    {
      staffId: 'VOL-02',
      name: 'Suresh (PKG-01 Exit)',
      role: 'staff',
      kind: 'volunteer',
      active: true,
      passcodeHash,
      assignment: {
        lotCode: 'PKG-01',
        point: 'exit'
      }
    }
  ];

  for (const u of demoUsers) {
    await User.findOneAndUpdate(
      { staffId: u.staffId },
      { $set: u },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`Successfully seeded ${demoUsers.length} staff users.`);

  console.log('\n--- PushkarPath Seeding Summary ---');
  console.log(`Ghats: ${await Ghat.countDocuments()}`);
  console.log(`Parking Lots: ${await ParkingLot.countDocuments()}`);
  console.log(`Staff Users: ${await User.countDocuments({ role: { $in: ['staff', 'admin'] } })}`);
  console.log(`Default Passcode: ${SEED_STAFF_PASSCODE}`);
  console.log('------------------------------------\n');
}

async function runCli() {
  const isReset = process.argv.includes('--reset');
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
    console.log('MongoDB connected successfully.');
  } catch (err) {
    console.warn(`Could not connect to external MongoDB: ${err.message}`);
    console.log('Using built-in zero-dependency memory repository for seed verification...');
    const memoryDb = require('../lib/memoryDb');
    memoryDb.isMemoryMode = true;
  }

  await seedData(isReset);
  await mongoose.disconnect();
  console.log('MongoDB connection closed.');
}

if (require.main === module) {
  runCli()
    .then(() => {
      console.log('Seed completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed process failed:', err);
      process.exit(1);
    });
}

module.exports = {
  seedData,
  ghats,
  lots
};
