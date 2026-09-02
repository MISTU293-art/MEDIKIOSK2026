const mongoose = require('mongoose');
const { isLiveMongo, memoryDb } = require('../config/db');

if (mongoose.models.Patient) {
  delete mongoose.models.Patient;
}

const patientSchema = new mongoose.Schema({
  uhid: { type: String, required: true, unique: true },
  cardNumber: { type: String, unique: true, sparse: true, index: true },
  tokenNumber: { type: String, required: true },
  fullName: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  phone: { type: String, required: true },
  emergencyContact: { type: String },
  address: { type: String, default: '' },
  medicalHistory: { type: String, default: '' },
  allergies: { type: String, default: '' },
  currentMedications: { type: String, default: '' },
  registrationSource: { type: String, enum: ['kiosk', 'doctor', 'staff'], default: 'kiosk' },
  guardianName: { type: String },
  aadhaarNumber: { type: String, default: '' },
  abhaId: { type: String, default: '' },
  abhaAddress: { type: String, default: '' },
  ayushmanSchemeType: { type: String, default: 'PM-JAY Golden Card (₹5 Lakh Cover)' },
  preferredLanguage: { type: String, default: 'en' },
  department: { type: String, default: 'Ayurveda (Kayachikitsa & Panchakarma)' },
  assignedDoctorName: { type: String, default: 'Dr. Rajesh Kumar Sharma, BAMS, MD' },
  assignedDoctorQualification: { type: String, default: 'Senior Consultant Kayachikitsa' },
  assignedDoctorId: { type: String, default: 'DOC-AYU-01' },
  roomNumber: { type: String, default: 'Room 104, AYUSH Wing A' },
  hospitalState: { type: String, default: 'National / All-India AYUSH Network' },
  hospitalDistrict: { type: String, default: 'Central Health Hub' },
  priority: { type: String, default: 'Normal' },
  prioritySource: { type: String, enum: ['staff_assigned', 'red_flag_system', 'doctor_assigned', 'system', 'kiosk'], default: 'system' },
  status: { type: String, enum: ['registered', 'intake_in_progress', 'queued', 'in_consultation', 'completed'], default: 'queued' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const MongoosePatient = mongoose.model('Patient', patientSchema);

class PatientAdapter {
  static async findOne(query) {
    if (isLiveMongo()) return MongoosePatient.findOne(query);
    return memoryDb.getCollection('Patient').findOne(query);
  }

  static async findById(id) {
    if (isLiveMongo()) return MongoosePatient.findById(id);
    return memoryDb.getCollection('Patient').findById(id);
  }

  static async find(query = {}) {
    if (isLiveMongo()) return MongoosePatient.find(query).sort({ createdAt: -1 });
    const list = await memoryDb.getCollection('Patient').find(query);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async create(data) {
    if (isLiveMongo()) return MongoosePatient.create(data);
    return memoryDb.getCollection('Patient').create(data);
  }

  static async findByIdAndUpdate(id, update, opts = { new: true }) {
    if (isLiveMongo()) return MongoosePatient.findByIdAndUpdate(id, update, opts);
    return memoryDb.getCollection('Patient').findByIdAndUpdate(id, update, opts);
  }

  static async countDocuments(query = {}) {
    if (isLiveMongo()) return MongoosePatient.countDocuments(query);
    return memoryDb.getCollection('Patient').countDocuments(query);
  }
}

module.exports = PatientAdapter;
