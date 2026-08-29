const mongoose = require('mongoose');
const { isLiveMongo, memoryDb } = require('../config/db');

const dispensationSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  uhid: { type: String, required: true },
  tokenNumber: { type: String },
  patientName: { type: String, required: true },
  doctorName: { type: String },
  consultationDate: { type: Date, default: Date.now },
  prescribedMedsText: { type: String },
  dispensedItems: [
    {
      medicineName: String,
      dosage: String,
      quantity: Number,
      unitPrice: Number,
      totalPrice: Number
    }
  ],
  aiSafetyAudit: {
    safetyStatus: String,
    flagCount: Number,
    flags: Array
  },
  dispensationStatus: { type: String, enum: ['pending', 'dispensed', 'partial'], default: 'dispensed' },
  totalBillAmount: { type: Number, default: 0 },
  pharmacistName: { type: String, default: 'Pharmacy Dispenser' },
  dispensedAt: { type: Date, default: Date.now }
});

const MongooseDispensation = mongoose.model('DispensationRecord', dispensationSchema);

class DispensationAdapter {
  static async find(query = {}) {
    if (isLiveMongo()) return MongooseDispensation.find(query).sort({ dispensedAt: -1 });
    const list = await memoryDb.getCollection('DispensationRecord').find(query);
    return list.sort((a, b) => new Date(b.dispensedAt) - new Date(a.dispensedAt));
  }

  static async create(data) {
    if (isLiveMongo()) return MongooseDispensation.create(data);
    return memoryDb.getCollection('DispensationRecord').create(data);
  }
}

module.exports = DispensationAdapter;
