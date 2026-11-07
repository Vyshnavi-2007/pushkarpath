const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true
    },
    target: {
      type: String,
      required: true,
      trim: true
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    reason: {
      type: String,
      trim: true,
      default: null
    },
    byStaffId: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ target: 1 });
auditLogSchema.index({ byStaffId: 1 });

const MongooseAuditLog = mongoose.model('AuditLog', auditLogSchema);
const memoryDb = require('../lib/memoryDb');

module.exports = new Proxy(MongooseAuditLog, {
  get(target, prop) {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      return target[prop];
    }
    const mem = memoryDb.AuditLog;
    if (typeof mem[prop] === 'function') {
      return mem[prop].bind(mem);
    }
    return mem[prop] !== undefined ? mem[prop] : target[prop];
  }
});
