const mongoose = require('mongoose');
const { isLiveMongo, memoryDb } = require('../config/db');

if (mongoose.models.AIConversation) {
  delete mongoose.models.AIConversation;
}

const aiConversationSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, unique: true, index: true },
  patientId: { type: String, required: true, index: true },
  language: { type: String, default: 'en' },
  title: { type: String, default: 'General Health Conversation' },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const MongooseAIConversation = mongoose.model('AIConversation', aiConversationSchema);

class AIConversationAdapter {
  static async findOne(query) {
    if (isLiveMongo()) return MongooseAIConversation.findOne(query);
    return memoryDb.getCollection('AIConversation').findOne(query);
  }

  static async findById(id) {
    if (isLiveMongo()) return MongooseAIConversation.findById(id);
    return memoryDb.getCollection('AIConversation').findById(id);
  }

  static async find(query = {}) {
    if (isLiveMongo()) return MongooseAIConversation.find(query).sort({ updatedAt: -1, createdAt: -1 });
    const list = await memoryDb.getCollection('AIConversation').find(query);
    return list.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }

  static async create(data) {
    if (isLiveMongo()) return MongooseAIConversation.create(data);
    return memoryDb.getCollection('AIConversation').create(data);
  }

  static async findByIdAndUpdate(id, update, opts = { new: true }) {
    if (isLiveMongo()) return MongooseAIConversation.findByIdAndUpdate(id, update, opts);
    return memoryDb.getCollection('AIConversation').findByIdAndUpdate(id, update, opts);
  }

  static async updateOne(query, update) {
    if (isLiveMongo()) return MongooseAIConversation.updateOne(query, update);
    return memoryDb.getCollection('AIConversation').updateOne(query, update);
  }

  static async deleteOne(query) {
    if (isLiveMongo()) return MongooseAIConversation.deleteOne(query);
    return memoryDb.getCollection('AIConversation').deleteMany(query);
  }
}

module.exports = AIConversationAdapter;
