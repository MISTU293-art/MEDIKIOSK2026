const mongoose = require('mongoose');
const { isLiveMongo, memoryDb } = require('../config/db');

const staffCardSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  cardId: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['active', 'revoked'], default: 'active' },
  issuedBy: String,
  revokedAt: Date,
  revokedReason: String,
  createdAt: { type: Date, default: Date.now }
});
const MongooseStaffCard = mongoose.model('StaffCard', staffCardSchema);
class StaffCardAdapter {
  static async find(query = {}) { if (isLiveMongo()) return MongooseStaffCard.find(query).sort({ createdAt: -1 }); return memoryDb.getCollection('StaffCard').find(query); }
  static async findOne(query) { if (isLiveMongo()) return MongooseStaffCard.findOne(query); return memoryDb.getCollection('StaffCard').findOne(query); }
  static async create(data) { if (isLiveMongo()) return MongooseStaffCard.create(data); return memoryDb.getCollection('StaffCard').create(data); }
  static async updateMany(query, update) { if (isLiveMongo()) return MongooseStaffCard.updateMany(query, update); return memoryDb.getCollection('StaffCard').updateMany(query, update); }
  static async findByIdAndUpdate(id, update) { if (isLiveMongo()) return MongooseStaffCard.findByIdAndUpdate(id, update, { new: true }); return memoryDb.getCollection('StaffCard').findByIdAndUpdate(id, update, { new: true }); }
}
module.exports = StaffCardAdapter;