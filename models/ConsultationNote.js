const mongoose = require('mongoose');
const { isLiveMongo, memoryDb } = require('../config/db');

const consultationNoteSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  doctorId: { type: String, required: true },
  doctorName: { type: String, required: true },
  approvedIntakeSummary: { type: String },
  clinicalImpression: { type: String, required: true },
  prescribedMedications: [
    {
      medicineName: String,
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String
    }
  ],
  labOrders: [String],
  followUpDate: { type: String },
  doctorSignatureDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const MongooseNote = mongoose.model('ConsultationNote', consultationNoteSchema);

class ConsultationNoteAdapter {
  static async find(query = {}) {
    if (isLiveMongo()) return MongooseNote.find(query).sort({ createdAt: -1 });
    const list = await memoryDb.getCollection('ConsultationNote').find(query);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async findOne(query) {
    if (isLiveMongo()) return MongooseNote.findOne(query);
    return memoryDb.getCollection('ConsultationNote').findOne(query);
  }

  static async findById(id) {
    if (isLiveMongo()) return MongooseNote.findById(id);
    return memoryDb.getCollection('ConsultationNote').findById(id);
  }

  static async create(data) {
    const formatted = {
      ...data,
      doctorName: data.doctorName || data.attendingDoctor || 'Hospital Doctor',
      doctorId: data.doctorId || 'DOC-GEN'
    };
    if (isLiveMongo()) return MongooseNote.create(formatted);
    return memoryDb.getCollection('ConsultationNote').create(formatted);
  }
}

module.exports = ConsultationNoteAdapter;
