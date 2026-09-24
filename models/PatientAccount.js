const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { isLiveMongo, memoryDb } = require('../config/db');

if (mongoose.models.PatientAccount) {
  delete mongoose.models.PatientAccount;
}

const patientAccountSchema = new mongoose.Schema({
  patientId: { type: String, required: true, index: true },
  uhid: { type: String, required: true, index: true },
  cardNumber: { type: String, index: true },
  email: { type: String, lowercase: true, trim: true, sparse: true },
  mobile: { type: String, required: true, index: true },
  passwordHash: { type: String, required: true },
  fullName: { type: String, default: '' },
  lastLogin: { type: Date },
  status: { type: String, enum: ['active', 'locked', 'suspended'], default: 'active' },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  preferredLanguage: { type: String, default: 'en' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

patientAccountSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash || !candidatePassword) return false;
  if (this.passwordHash === candidatePassword) return true;
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (e) {
    return false;
  }
};

const MongoosePatientAccount = mongoose.model('PatientAccount', patientAccountSchema);

class PatientAccountAdapter {
  static async findOne(query) {
    const cleanQuery = {};
    for (let k in query) {
      if (typeof query[k] === 'string' && k === 'email') {
        cleanQuery[k] = query[k].toLowerCase().trim();
      } else {
        cleanQuery[k] = query[k];
      }
    }

    if (isLiveMongo()) {
      return MongoosePatientAccount.findOne(cleanQuery);
    }

    const account = await memoryDb.getCollection('PatientAccount').findOne(cleanQuery);
    if (!account) return null;
    return {
      ...account,
      comparePassword: async (candidate) => {
        if (!account.passwordHash || !candidate) return false;
        if (account.passwordHash === candidate) return true;
        try {
          return await bcrypt.compare(candidate, account.passwordHash);
        } catch (e) {
          return false;
        }
      }
    };
  }

  static async findById(id) {
    if (isLiveMongo()) return MongoosePatientAccount.findById(id);
    const account = await memoryDb.getCollection('PatientAccount').findById(id);
    if (!account) return null;
    return {
      ...account,
      comparePassword: async (candidate) => {
        if (!account.passwordHash || !candidate) return false;
        if (account.passwordHash === candidate) return true;
        try {
          return await bcrypt.compare(candidate, account.passwordHash);
        } catch (e) {
          return false;
        }
      }
    };
  }

  static async find(query = {}) {
    if (isLiveMongo()) return MongoosePatientAccount.find(query).sort({ createdAt: -1 });
    return memoryDb.getCollection('PatientAccount').find(query);
  }

  static async create(data) {
    let passwordHash = data.passwordHash || data.password || '';
    if (passwordHash && !passwordHash.startsWith('$2a$') && !passwordHash.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(passwordHash, salt);
    }

    const docData = {
      ...data,
      passwordHash,
      email: data.email ? data.email.toLowerCase().trim() : undefined,
      createdAt: data.createdAt || new Date(),
      updatedAt: new Date()
    };
    delete docData.password;

    if (isLiveMongo()) {
      return MongoosePatientAccount.create(docData);
    }
    return memoryDb.getCollection('PatientAccount').create(docData);
  }

  static async findByIdAndUpdate(id, update, opts = { new: true }) {
    if (isLiveMongo()) return MongoosePatientAccount.findByIdAndUpdate(id, update, opts);
    return memoryDb.getCollection('PatientAccount').findByIdAndUpdate(id, update, opts);
  }

  static async updateOne(query, update) {
    if (isLiveMongo()) return MongoosePatientAccount.updateOne(query, update);
    return memoryDb.getCollection('PatientAccount').updateOne(query, update);
  }

  static async countDocuments(query = {}) {
    if (isLiveMongo()) return MongoosePatientAccount.countDocuments(query);
    return memoryDb.getCollection('PatientAccount').countDocuments(query);
  }
}

module.exports = PatientAccountAdapter;
