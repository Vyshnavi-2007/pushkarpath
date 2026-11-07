const mongoose = require('mongoose');

const parkingLotSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    sector: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      enum: ['ground', 'multi-level', 'open', 'temporary'],
      default: 'ground'
    },
    fee: {
      type: String,
      default: 'Free',
      trim: true
    },
    capacity: {
      type: Number,
      required: true,
      min: 0
    },
    occupied: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open'
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    coordSource: {
      type: String,
      enum: ['official', 'photon', 'manual', 'approx'],
      default: 'approx'
    },
    nearestGhat: {
      type: String,
      trim: true,
      uppercase: true
    },
    nearestGhatMeters: {
      type: Number,
      min: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

parkingLotSchema.virtual('available').get(function () {
  const cap = typeof this.capacity === 'number' ? this.capacity : 0;
  const occ = typeof this.occupied === 'number' ? this.occupied : 0;
  return Math.max(0, cap - occ);
});

parkingLotSchema.index({ status: 1 });
parkingLotSchema.index({ sector: 1 });

const MongooseParkingLot = mongoose.model('ParkingLot', parkingLotSchema);
const memoryDb = require('../lib/memoryDb');

module.exports = new Proxy(MongooseParkingLot, {
  get(target, prop) {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      return target[prop];
    }
    const mem = memoryDb.ParkingLot;
    if (typeof mem[prop] === 'function') {
      return mem[prop].bind(mem);
    }
    return mem[prop] !== undefined ? mem[prop] : target[prop];
  }
});
