const mongoose = require('mongoose');
const { DOCUMENT_TYPES, OCR_STATUS } = require('../config/constants');
const { isLiveMongo, memoryDb } = require('../config/db');

const documentSchema = new mongoose.Schema({
  patientId: { type: String, default: null, index: true },
  sessionToken: { type: String },
  originalName: { type: String, required: true },
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  mimeType: { type: String, required: true },
  fileSize: { type: Number },
  docType: { type: String, enum: Object.values(DOCUMENT_TYPES), default: DOCUMENT_TYPES.PRESCRIPTION },
  documentDate: { type: Date, default: Date.now },
  ocrStatus: { type: String, enum: Object.values(OCR_STATUS), default: OCR_STATUS.DRAFT },
  rawOcrText: { type: String, default: '' },
  verifiedData: {
    doctorName: String,
    clinicHospitalName: String,
    dateOnRecord: String,
    extractedDiagnosis: String,
    medicationsList: [String],
    labValues: Object,
    clinicalNotes: String
  },
  verifiedBy: { type: String },
  verifiedByRole: { type: String },
  verifiedAt: { type: Date },
  staffNotes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const MongooseDoc = mongoose.model('Document', documentSchema);

class DocumentAdapter {
  static async findOne(query) {
    if (isLiveMongo()) return MongooseDoc.findOne(query);
    return memoryDb.getCollection('Document').findOne(query);
  }

  static async findById(id) {
    if (isLiveMongo()) return MongooseDoc.findById(id);
    return memoryDb.getCollection('Document').findById(id);
  }

  static async find(query = {}) {
    if (isLiveMongo()) return MongooseDoc.find(query).sort({ documentDate: -1, createdAt: -1 });
    const list = await memoryDb.getCollection('Document').find(query);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async create(data) {
    if (isLiveMongo()) return MongooseDoc.create(data);
    return memoryDb.getCollection('Document').create(data);
  }

  static async findByIdAndUpdate(id, update, opts = { new: true }) {
    if (isLiveMongo()) return MongooseDoc.findByIdAndUpdate(id, update, opts);
    return memoryDb.getCollection('Document').findByIdAndUpdate(id, update, opts);
  }

  static async countDocuments(query = {}) {
    if (isLiveMongo()) return MongooseDoc.countDocuments(query);
    return memoryDb.getCollection('Document').countDocuments(query);
  }
}

module.exports = DocumentAdapter;
