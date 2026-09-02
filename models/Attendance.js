const mongoose = require('mongoose');
const { isLiveMongo, memoryDb } = require('../config/db');
const attendanceSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true }, cardId: { type: String, required: true },
  action: { type: String, enum: ['in', 'out'], required: true }, terminalId: String, ipAddress: String,
  timestamp: { type: Date, default: Date.now }, createdAt: { type: Date, default: Date.now }
});
const MongooseAttendance = mongoose.model('Attendance', attendanceSchema);
class AttendanceAdapter {
  static async find(query = {}) { if (isLiveMongo()) return MongooseAttendance.find(query).sort({ timestamp: -1 }); const list = await memoryDb.getCollection('Attendance').find(query); return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); }
  static async findOne(query) { if (isLiveMongo()) return MongooseAttendance.findOne(query).sort({ timestamp: -1 }); return memoryDb.getCollection('Attendance').findOne(query); }
  static async create(data) { if (isLiveMongo()) return MongooseAttendance.create(data); return memoryDb.getCollection('Attendance').create(data); }
}
module.exports = AttendanceAdapter;