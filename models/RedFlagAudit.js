const mongoose = require('mongoose');
const { isLiveMongo, memoryDb } = require('../config/db');

const redFlagAuditSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  patientName: { type: String },
  uhid: { type: String },
  sessionToken: { type: String },
  kioskId: { type: String, default: 'KIOSK-01' },
  ruleId: { type: String, required: true },
  ruleName: { type: String, required: true },
  severity: { type: String, required: true },
  triggeredKeywords: [String],
  triggeredAt: { type: Date, default: Date.now },
  acknowledgedBy: { type: String },
  acknowledgedRole: { type: String },
  acknowledgedAt: { type: Date },
  actionTaken: { type: String },
  escalationSlaMet: { type: Boolean, default: true }
});

const MongooseAudit = mongoose.model('RedFlagAudit', redFlagAuditSchema);

class RedFlagAuditAdapter {
  static async find(query = {}) {
    if (isLiveMongo()) return MongooseAudit.find(query).sort({ triggeredAt: -1 });
    const list = await memoryDb.getCollection('RedFlagAudit').find(query);
    return list.sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt));
  }

  static async findById(id) {
    if (isLiveMongo()) return MongooseAudit.findById(id);
    return memoryDb.getCollection('RedFlagAudit').findById(id);
  }

  static async create(data) {
    if (isLiveMongo()) return MongooseAudit.create(data);
    return memoryDb.getCollection('RedFlagAudit').create(data);
  }

  static async findByIdAndUpdate(id, update, opts = { new: true }) {
    if (isLiveMongo()) return MongooseAudit.findByIdAndUpdate(id, update, opts);
    return memoryDb.getCollection('RedFlagAudit').findByIdAndUpdate(id, update, opts);
  }

  static async countDocuments(query = {}) {
    if (isLiveMongo()) return MongooseAudit.countDocuments(query);
    return memoryDb.getCollection('RedFlagAudit').countDocuments(query);
  }
}

module.exports = RedFlagAuditAdapter;
