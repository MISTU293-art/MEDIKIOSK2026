const mongoose = require('mongoose');
const { isLiveMongo, memoryDb } = require('../config/db');

const intakeSessionSchema = new mongoose.Schema({
  sessionToken: { type: String, required: true, unique: true },
  kioskId: { type: String, default: 'KIOSK-01' },
  patientId: { type: String, required: true },
  language: { type: String, default: 'en' },
  consent: {
    medicalDataSharing: { type: Boolean, default: true },
    voiceRecording: { type: Boolean, default: false },
    consentTimestamp: { type: Date, default: Date.now },
    ipAddress: { type: String }
  },
  stepData: {
    demographics: { type: Object, default: {} },
    chiefComplaint: { type: Object, default: {} },
    hpi: { type: Object, default: {} },
    pastMedicalHistory: { type: Object, default: {} },
    allergies: { type: Object, default: {} },
    medicationHistory: { type: Object, default: {} },
    familyHistory: { type: Object, default: {} },
    personalHistory: { type: Object, default: {} }
  },
  voiceMetadata: [
    {
      stepId: String,
      audioUrl: String,
      transcribedText: String,
      language: String,
      confidence: Number,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  redFlagCheck: {
    hasRedFlag: { type: Boolean, default: false },
    ruleId: String,
    ruleName: String,
    matchedKeywords: [String],
    severity: String,
    patientAlertShown: { type: Boolean, default: false },
    acknowledgedByStaff: { type: Boolean, default: false },
    staffName: String,
    acknowledgedAt: Date
  },
  aiSummary: {
    status: { type: String, enum: ['pending', 'approved', 'edited', 'rejected'], default: 'pending' },
    isAiDrafted: { type: Boolean, default: true },
    draftText: String,
    soapStructure: {
      subjective: String,
      objectiveHistory: String,
      assessmentContext: String,
      planDraft: String
    },
    doctorEdits: String,
    rejectionReason: String,
    reviewedByDoctorId: String,
    reviewedByDoctorName: String,
    reviewedAt: Date
  },
  isOfflineSubmission: { type: Boolean, default: false },
  syncedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['in_progress', 'submitted', 'reviewed'], default: 'in_progress' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const MongooseIntake = mongoose.model('IntakeSession', intakeSessionSchema);

class IntakeSessionAdapter {
  static async findOne(query) {
    if (isLiveMongo()) return MongooseIntake.findOne(query);
    return memoryDb.getCollection('IntakeSession').findOne(query);
  }

  static async findById(id) {
    if (isLiveMongo()) return MongooseIntake.findById(id);
    return memoryDb.getCollection('IntakeSession').findById(id);
  }

  static async find(query = {}) {
    if (isLiveMongo()) return MongooseIntake.find(query).sort({ createdAt: -1 });
    const list = await memoryDb.getCollection('IntakeSession').find(query);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async create(data) {
    if (isLiveMongo()) return MongooseIntake.create(data);
    return memoryDb.getCollection('IntakeSession').create(data);
  }

  static async findByIdAndUpdate(id, update, opts = { new: true }) {
    if (isLiveMongo()) return MongooseIntake.findByIdAndUpdate(id, update, opts);
    return memoryDb.getCollection('IntakeSession').findByIdAndUpdate(id, update, opts);
  }

  static async updateOne(query, update) {
    if (isLiveMongo()) return MongooseIntake.updateOne(query, update);
    return memoryDb.getCollection('IntakeSession').updateOne(query, update);
  }

  static async countDocuments(query = {}) {
    if (isLiveMongo()) return MongooseIntake.countDocuments(query);
    return memoryDb.getCollection('IntakeSession').countDocuments(query);
  }
}

module.exports = IntakeSessionAdapter;
