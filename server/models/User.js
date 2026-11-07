const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'pilgrim', 'staff', 'admin'],
      required: true,
      default: 'user'
    },
    kind: {
      type: String,
      enum: ['volunteer', 'staff'],
      default: function () {
        return this.role === 'staff' ? 'volunteer' : undefined;
      }
    },
    phone: {
      type: String,
      trim: true,
      sparse: true
    },
    staffId: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true
    },
    name: {
      type: String,
      trim: true
    },
    passcodeHash: {
      type: String,
      default: null
    },
    active: {
      type: Boolean,
      default: true
    },
    isDemo: {
      type: Boolean,
      default: false
    },
    assignment: {
      lotCode: {
        type: String,
        trim: true,
        uppercase: true,
        default: null
      },
      point: {
        type: String,
        enum: ['entry', 'exit', null],
        default: null
      }
    },
    activeCheckin: {
      lotCode: { type: String, uppercase: true, default: null },
      enteredAt: { type: Date, default: null }
    }
  },
  {
    timestamps: true
  }
);

const MongooseUser = mongoose.model('User', userSchema);
const memoryDb = require('../lib/memoryDb');

module.exports = new Proxy(MongooseUser, {
  get(target, prop) {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      return target[prop];
    }
    const mem = memoryDb.User;
    if (typeof mem[prop] === 'function') {
      return mem[prop].bind(mem);
    }
    return mem[prop] !== undefined ? mem[prop] : target[prop];
  }
});
