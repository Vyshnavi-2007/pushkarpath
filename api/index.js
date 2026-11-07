const { app } = require('../server/index');
const { seedData } = require('../server/seed/index');
const memoryDb = require('../server/lib/memoryDb');

let isInitialized = false;

module.exports = async (req, res) => {
  if (!isInitialized) {
    try {
      memoryDb.isMemoryMode = true;
      await seedData(false);
      isInitialized = true;
    } catch (err) {
      console.warn('Vercel in-memory init:', err.message);
    }
  }
  return app(req, res);
};

