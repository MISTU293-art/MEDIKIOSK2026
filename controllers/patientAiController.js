const PatientAssistant = require('../services/ai/patientAssistant');
const ConversationEngine = require('../services/ai/conversationEngine');
const logger = require('../utils/logger');

class PatientAiController {
  /**
   * Section 58 & 71: Render or return chat status
   */
  static async getChatStatus(req, res) {
    try {
      const patientId = req.patient.id;
      const lang = req.query.lang || req.patient.preferredLanguage || 'en';
      const conversations = await ConversationEngine.getPatientConversations(patientId);
      const suggestedQuestions = PatientAssistant.getSuggestedQuestions(lang);

      if (req.accepts('html')) {
        return res.render('patient/chat', {
          title: 'AI Health Assistant — MediKiosk',
          patient: req.patient,
          suggestedQuestions,
          currentLanguage: lang,
          conversations,
          activeNav: 'chat'
        });
      }

      return res.json({
        success: true,
        patientId,
        language: lang,
        activeConversationsCount: conversations.length,
        suggestedQuestions
      });
    } catch (err) {
      logger.error('AI chat status error: ' + err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Section 71: POST /patient/ai/chat
   * Request: { "message": "Show my latest blood report", "conversationId": "optional-id", "language": "en" }
   */
  static async postChat(req, res) {
    try {
      const { message, conversationId, language, source } = req.body;
      const patientId = req.patient.id;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: 'A text message is required.' });
      }

      const activeLang = language || req.patient.preferredLanguage || 'en';

      logger.audit('AI_CHAT_QUERY', req.patient.uhid, {
        length: message.length,
        language: activeLang,
        source: source || 'text'
      });

      const response = await PatientAssistant.processMessage({
        patientId,
        message,
        conversationId,
        language: activeLang,
        source: source || 'text'
      });

      return res.json(response);
    } catch (err) {
      logger.error('AI postChat error: ' + err.message);
      return res.status(500).json({
        success: false,
        error: 'Unable to process AI assistant request: ' + err.message
      });
    }
  }

  /**
   * Section 68 & 71: List private conversations for authenticated patient
   */
  static async getConversations(req, res) {
    try {
      const conversations = await ConversationEngine.getPatientConversations(req.patient.id);
      return res.json({ success: true, conversations });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Section 68 & 71: Get messages for a specific conversation
   */
  static async getConversationById(req, res) {
    try {
      const messages = await ConversationEngine.getConversationMessages(req.patient.id, req.params.id);
      return res.json({ success: true, messages });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Section 68 & 71: Clear / Delete conversation
   */
  static async deleteConversation(req, res) {
    try {
      const deleted = await ConversationEngine.deleteConversation(req.patient.id, req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Conversation not found or not owned by patient.' });
      }
      return res.json({ success: true, message: 'Conversation deleted.' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Section 67 & 71: POST /patient/ai/voice
   * Process voice speech transcript or synthesized query
   */
  static async postVoice(req, res) {
    try {
      const { transcript, conversationId, language } = req.body;
      const patientId = req.patient.id;

      if (!transcript) {
        return res.status(400).json({ success: false, error: 'Voice transcript is required.' });
      }

      const activeLang = language || req.patient.preferredLanguage || 'en';

      const response = await PatientAssistant.processMessage({
        patientId,
        message: transcript,
        conversationId,
        language: activeLang,
        source: 'voice'
      });

      return res.json({
        ...response,
        voiceProcessed: true,
        speechSynthesisText: response.reply
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Section 64: Suggested Questions API
   */
  static async getSuggestedQuestions(req, res) {
    try {
      const lang = req.query.lang || req.patient.preferredLanguage || 'en';
      const questions = PatientAssistant.getSuggestedQuestions(lang);
      return res.json({ success: true, questions, language: lang });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = PatientAiController;
