const { v4: uuidv4 } = require('uuid');
const AIConversation = require('../../models/AIConversation');
const AIMessage = require('../../models/AIMessage');
const logger = require('../../utils/logger');

class ConversationEngine {
  /**
   * Get an existing active conversation or create a new one
   */
  static async getOrCreateConversation(patientId, conversationId, language = 'en') {
    if (conversationId) {
      const existing = await AIConversation.findOne({ conversationId, patientId });
      if (existing) return existing;
    }

    const newId = `CONV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newConv = await AIConversation.create({
      conversationId: newId,
      patientId: String(patientId),
      language: language || 'en',
      title: 'Health Assistant Conversation',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return newConv;
  }

  /**
   * Get all conversations for a patient
   */
  static async getPatientConversations(patientId) {
    return AIConversation.find({ patientId, status: 'active' });
  }

  /**
   * Get messages for a specific conversation, verifying patient ownership
   */
  static async getConversationMessages(patientId, conversationId) {
    const conv = await AIConversation.findOne({ conversationId, patientId });
    if (!conv) return [];
    return AIMessage.find({ conversationId, patientId });
  }

  /**
   * Save a single message in the conversation history
   */
  static async saveMessage({ patientId, conversationId, sender, message, source = 'text', recordReferences = [], safetyFlag = false, emergencyDetected = false }) {
    const msgId = `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const saved = await AIMessage.create({
      messageId: msgId,
      conversationId,
      patientId: String(patientId),
      sender,
      message,
      source,
      recordReferences: recordReferences || [],
      safetyFlag: Boolean(safetyFlag),
      emergencyDetected: Boolean(emergencyDetected),
      timestamp: new Date()
    });

    // Update conversation updatedAt & title if needed
    if (sender === 'patient') {
      const summaryTitle = message.length > 35 ? message.slice(0, 32) + '...' : message;
      await AIConversation.updateOne({ conversationId }, {
        $set: { updatedAt: new Date(), title: summaryTitle }
      });
    }

    return saved;
  }

  /**
   * Delete or archive conversation
   */
  static async deleteConversation(patientId, conversationId) {
    const conv = await AIConversation.findOne({ conversationId, patientId });
    if (!conv) return false;
    await AIConversation.deleteOne({ conversationId, patientId });
    await AIMessage.deleteMany({ conversationId, patientId });
    return true;
  }
}

module.exports = ConversationEngine;
