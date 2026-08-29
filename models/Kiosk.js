const mongoose = require('mongoose');
const { isLiveMongo, memoryDb } = require('../config/db');

const kioskSchema = new mongoose.Schema({
  kioskId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  department: { type: String, default: 'General Medicine' },
  location: { type: String, required: true },
  status: { type: String, enum: ['online', 'offline', 'maintenance'], default: 'online' },
  ipAddress: { type: String },
  lastPingAt: { type: Date, default: Date.now },
  lastSyncAt: { type: Date, default: Date.now },
  pendingOfflineSubmissions: { type: Number, default: 0 },
  upsConnected: { type: Boolean, default: true },
  appVersion: { type: String, default: '2.0.0' },
  activeLanguage: { type: String, default: 'en' }
});

const MongooseKiosk = mongoose.model('Kiosk', kioskSchema);

class KioskAdapter {
  static async findOne(query) {
    if (isLiveMongo()) return MongooseKiosk.findOne(query);
    return memoryDb.getCollection('Kiosk').findOne(query);
  }

  static async find(query = {}) {
    if (isLiveMongo()) return MongooseKiosk.find(query).sort({ kioskId: 1 });
    return memoryDb.getCollection('Kiosk').find(query);
  }

  static async findById(id) {
    if (isLiveMongo()) return MongooseKiosk.findById(id);
    return memoryDb.getCollection('Kiosk').findById(id);
  }

  static async create(data) {
    if (isLiveMongo()) return MongooseKiosk.create(data);
    return memoryDb.getCollection('Kiosk').create(data);
  }

  static async findByIdAndUpdate(id, update, opts = { new: true }) {
    if (isLiveMongo()) return MongooseKiosk.findByIdAndUpdate(id, update, opts);
    return memoryDb.getCollection('Kiosk').findByIdAndUpdate(id, update, opts);
  }

  static async updateOne(query, update) {
    if (isLiveMongo()) return MongooseKiosk.updateOne(query, update);
    return memoryDb.getCollection('Kiosk').updateOne(query, update);
  }

  static async countDocuments(query = {}) {
    if (isLiveMongo()) return MongooseKiosk.countDocuments(query);
    return memoryDb.getCollection('Kiosk').countDocuments(query);
  }
}

module.exports = KioskAdapter;
