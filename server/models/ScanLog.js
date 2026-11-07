const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['ENTRY', 'EXIT', 'REJECTED'],
      required: true
    },
    point: {
      type: String,
      enum: ['entry', 'exit'],
      required: true
    },
    vehicleNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    lotCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    staffId: {
      type: String,
      required: true,
      trim: true
    },
    reason: {
      type: String,
      trim: true,
      default: null
    },
    durationMin: {
      type: Number,
      default: null
    },
    source: {
      type: String,
      trim: true,
      default: 'poster'
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

scanLogSchema.index({ createdAt: -1 });
scanLogSchema.index({ vehicleNo: 1, createdAt: -1 });
scanLogSchema.index({ lotCode: 1, createdAt: -1 });
scanLogSchema.index({ type: 1, createdAt: -1 });

const MongooseScanLog = mongoose.model('ScanLog', scanLogSchema);
const memoryDb = require('../lib/memoryDb');

module.exports = new Proxy(MongooseScanLog, {
  get(target, prop) {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      return target[prop];
    }
    const mem = memoryDb.ScanLog;
    if (typeof mem[prop] === 'function') {
      return mem[prop].bind(mem);
    }
    return mem[prop] !== undefined ? mem[prop] : target[prop];
  }
});
