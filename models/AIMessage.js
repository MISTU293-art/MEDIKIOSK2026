const mongoose = require('mongoose');
const { isLiveMongo, memoryDb } = require('../config/db');

if (mongoose.models.AIMessage) {
  delete mongoose.models.AIMessage;
}

const aiMessageSchema = new mongoose.Schema({
  messageId: { type: String, required: true, index: true },
  conversationId: { type: String, required: true, index: true },
  patientId: { type: String, required: true, index: true },
  sender: { type: String, enum: ['patient', 'assistant', 'system'], required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  source: { type: String, enum: ['text', 'voice', 'quick_action', 'system', 'assistant', 'ai'], default: 'text' },
  recordReferences: { type: Array, default: [] }, // [{ type: 'report'|'prescription'|'visit'|'medicine'|'card'|'timeline', id: String, title: String, link: String, summary: String }]
  safetyFlag: { type: Boolean, default: false },
  emergencyDetected: { type: Boolean, default: false }
});

const MongooseAIMessage = mongoose.model('AIMessage', aiMessageSchema);

class AIMessageAdapter {
  static async find(query = {}) {
    if (isLiveMongo()) return MongooseAIMessage.find(query).sort({ timestamp: 1 });
    const list = await memoryDb.getCollection('AIMessage').find(query);
    return list.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  static async findOne(query) {
    if (isLiveMongo()) return MongooseAIMessage.findOne(query);
    return memoryDb.getCollection('AIMessage').findOne(query);
  }

  static async create(data) {
    if (isLiveMongo()) return MongooseAIMessage.create(data);
    return memoryDb.getCollection('AIMessage').create(data);
  }

  static async deleteMany(query = {}) {
    if (isLiveMongo()) return MongooseAIMessage.deleteMany(query);
    return memoryDb.getCollection('AIMessage').deleteMany(query);
  }
}

module.exports = AIMessageAdapter;
