const mongoose = require('mongoose');
const { isLiveMongo, memoryDb } = require('../config/db');
const wardSchema = new mongoose.Schema({ name: { type: String, required: true, unique: true }, department: String, createdAt: { type: Date, default: Date.now } });
const MongooseWard = mongoose.model('Ward', wardSchema);
class WardAdapter { static async find(query = {}) { if (isLiveMongo()) return MongooseWard.find(query).sort({ name: 1 }); return memoryDb.getCollection('Ward').find(query); } static async findById(id) { if (isLiveMongo()) return MongooseWard.findById(id); return memoryDb.getCollection('Ward').findById(id); } static async create(data) { if (isLiveMongo()) return MongooseWard.create(data); return memoryDb.getCollection('Ward').create(data); } }
module.exports = WardAdapter;