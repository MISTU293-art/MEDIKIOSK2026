const mongoose = require('mongoose');
const { isLiveMongo, memoryDb } = require('../config/db');

const visitSchema = new mongoose.Schema({
  patientId: { type: String, required: true, index: true },
  cardNumber: { type: String, required: true },
  tokenNumber: { type: String, required: true },
  department: String,
  assignedDoctorId: String,
  assignedDoctorName: String,
  chiefComplaint: String,
  symptoms: String,
  status: { type: String, enum: ['registered', 'queued', 'in_consultation', 'completed'], default: 'queued' },
  createdAt: { type: Date, default: Date.now }
});

const MongooseVisit = mongoose.model('Visit', visitSchema);

class VisitAdapter {
  static async find(query = {}) {
    if (isLiveMongo()) return MongooseVisit.find(query).sort({ createdAt: -1 });
    const list = await memoryDb.getCollection('Visit').find(query);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async create(data) {
    if (isLiveMongo()) return MongooseVisit.create(data);
    return memoryDb.getCollection('Visit').create(data);
  }
}

module.exports = VisitAdapter;