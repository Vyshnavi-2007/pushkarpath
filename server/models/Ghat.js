const mongoose = require('mongoose');

const ghatSchema = new mongoose.Schema(
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
    nameTe: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
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
    photo: {
      type: String,
      trim: true
    },
    facilities: [
      {
        type: String,
        trim: true
      }
    ]
  },
  {
    timestamps: true
  }
);

const MongooseGhat = mongoose.model('Ghat', ghatSchema);
const memoryDb = require('../lib/memoryDb');

module.exports = new Proxy(MongooseGhat, {
  get(target, prop) {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      return target[prop];
    }
    const mem = memoryDb.Ghat;
    if (typeof mem[prop] === 'function') {
      return mem[prop].bind(mem);
    }
    return mem[prop] !== undefined ? mem[prop] : target[prop];
  }
});
