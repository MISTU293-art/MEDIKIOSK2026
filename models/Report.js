const mongoose = require('mongoose');
const { isLiveMongo, memoryDb } = require('../config/db');

const reportSchema = new mongoose.Schema({
  patientId: { type: String, required: true, index: true },
  visitId: String,
  requestedBy: { type: String, required: true },
  reportType: { type: String, required: true },
  priority: { type: String, enum: ['routine', 'urgent', 'stat'], default: 'routine' },
  instructions: String,
  status: { type: String, enum: ['requested', 'pending', 'uploaded', 'under_review', 'reviewed'], default: 'requested' },
  reviewNotes: String,
  createdAt: { type: Date, default: Date.now }
});

const MongooseReport = mongoose.model('Report', reportSchema);
class ReportAdapter {
  static async find(query = {}) { if (isLiveMongo()) return MongooseReport.find(query).sort({ createdAt: -1 }); const list = await memoryDb.getCollection('Report').find(query); return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); }
  static async create(data) { if (isLiveMongo()) return MongooseReport.create(data); return memoryDb.getCollection('Report').create(data); }
}
module.exports = ReportAdapter;