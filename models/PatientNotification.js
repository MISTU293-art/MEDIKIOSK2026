const mongoose = require('mongoose');
const { isLiveMongo, memoryDb } = require('../config/db');

if (mongoose.models.PatientNotification) {
  delete mongoose.models.PatientNotification;
}

const patientNotificationSchema = new mongoose.Schema({
  patientId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['report', 'prescription', 'consultation', 'appointment', 'document', 'system', 'emergency'],
    default: 'system'
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  link: { type: String, default: '/patient/dashboard' },
  createdAt: { type: Date, default: Date.now }
});

const MongoosePatientNotification = mongoose.model('PatientNotification', patientNotificationSchema);

class PatientNotificationAdapter {
  static async find(query = {}) {
    if (isLiveMongo()) return MongoosePatientNotification.find(query).sort({ createdAt: -1 });
    const list = await memoryDb.getCollection('PatientNotification').find(query);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async findOne(query) {
    if (isLiveMongo()) return MongoosePatientNotification.findOne(query);
    return memoryDb.getCollection('PatientNotification').findOne(query);
  }

  static async findById(id) {
    if (isLiveMongo()) return MongoosePatientNotification.findById(id);
    return memoryDb.getCollection('PatientNotification').findById(id);
  }

  static async create(data) {
    if (isLiveMongo()) return MongoosePatientNotification.create(data);
    return memoryDb.getCollection('PatientNotification').create(data);
  }

  static async findByIdAndUpdate(id, update, opts = { new: true }) {
    if (isLiveMongo()) return MongoosePatientNotification.findByIdAndUpdate(id, update, opts);
    return memoryDb.getCollection('PatientNotification').findByIdAndUpdate(id, update, opts);
  }

  static async updateMany(query, update) {
    if (isLiveMongo()) return MongoosePatientNotification.updateMany(query, update);
    const list = await memoryDb.getCollection('PatientNotification').find(query);
    for (const item of list) {
      await memoryDb.getCollection('PatientNotification').findByIdAndUpdate(item._id, update);
    }
    return { modifiedCount: list.length };
  }

  static async countDocuments(query = {}) {
    if (isLiveMongo()) return MongoosePatientNotification.countDocuments(query);
    return memoryDb.getCollection('PatientNotification').countDocuments(query);
  }
}

module.exports = PatientNotificationAdapter;
