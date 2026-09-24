const mongoose = require('mongoose');
const { isLiveMongo, memoryDb } = require('../config/db');

if (mongoose.models.Report) {
  delete mongoose.models.Report;
}

const reportSchema = new mongoose.Schema({
  patientId: { type: String, required: true, index: true },
  visitId: String,
  requestedBy: { type: String, required: true },
  reportType: { type: String, required: true },
  testName: { type: String, default: '' },
  priority: { type: String, enum: ['routine', 'urgent', 'stat'], default: 'routine' },
  instructions: String,
  status: { type: String, enum: ['requested', 'pending', 'uploaded', 'under_review', 'reviewed'], default: 'requested' },
  reviewNotes: String,
  labValues: { type: Object, default: {} }, // e.g. { hemoglobin: { value: 13.2, unit: 'g/dL', normalRange: '13.0 - 17.0', status: 'Normal' } }
  abnormalFlags: [String],
  fileUrl: String,
  downloadUrl: String,
  summary: String,
  reviewedBy: String,
  reviewedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const MongooseReport = mongoose.model('Report', reportSchema);

class ReportAdapter {
  static async find(query = {}) {
    if (isLiveMongo()) return MongooseReport.find(query).sort({ createdAt: -1 });
    const list = await memoryDb.getCollection('Report').find(query);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async findOne(query) {
    if (isLiveMongo()) return MongooseReport.findOne(query);
    return memoryDb.getCollection('Report').findOne(query);
  }

  static async findById(id) {
    if (isLiveMongo()) return MongooseReport.findById(id);
    return memoryDb.getCollection('Report').findById(id);
  }

  static async create(data) {
    if (isLiveMongo()) return MongooseReport.create(data);
    return memoryDb.getCollection('Report').create(data);
  }

  static async findByIdAndUpdate(id, update, opts = { new: true }) {
    if (isLiveMongo()) return MongooseReport.findByIdAndUpdate(id, update, opts);
    return memoryDb.getCollection('Report').findByIdAndUpdate(id, update, opts);
  }

  static async countDocuments(query = {}) {
    if (isLiveMongo()) return MongooseReport.countDocuments(query);
    return memoryDb.getCollection('Report').countDocuments(query);
  }
}

module.exports = ReportAdapter;