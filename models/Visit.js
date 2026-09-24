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

  static async findById(id) {
    if (isLiveMongo()) return MongooseVisit.findById(id);
    return memoryDb.getCollection('Visit').findById(id);
  }

  static async findOne(query) {
    if (isLiveMongo()) return MongooseVisit.findOne(query);
    return memoryDb.getCollection('Visit').findOne(query);
  }

  static async findByIdAndUpdate(id, update, opts = { new: true }) {
    if (isLiveMongo()) return MongooseVisit.findByIdAndUpdate(id, update, opts);
    return memoryDb.getCollection('Visit').findByIdAndUpdate(id, update, opts);
  }

  static async create(data) {
    if (isLiveMongo()) return MongooseVisit.create(data);
    return memoryDb.getCollection('Visit').create(data);
  }
}

module.exports = VisitAdapter;