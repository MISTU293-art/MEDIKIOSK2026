const EmergencyDetector = require('./emergencyDetector');
const SafetyGuard = require('./safetyGuard');
const PatientContextBuilder = require('./patientContextBuilder');
const ResponseGenerator = require('./responseGenerator');
const ConversationEngine = require('./conversationEngine');
const Patient = require('../../models/Patient');
const logger = require('../../utils/logger');

const SUPPORTED_LANGUAGES = ['en', 'hi', 'bn'];
const MAX_MESSAGE_LENGTH = 4000;

// Localized fallback reply used only when response generation itself fails
// (e.g. the AI call times out or errors) so the patient still gets a
// reply instead of a hard failure.
const FALLBACK_REPLY = {
  en: "I'm sorry, I couldn't process that right now. Please try again in a moment, or speak with hospital staff if this is urgent.",
  hi: 'क्षमा करें, मैं अभी इसे संसाधित नहीं कर सका। कृपया थोड़ी देर बाद पुनः प्रयास करें, या यदि यह जरूरी है तो अस्पताल के स्टाफ से बात करें।',
  bn: 'দুঃখিত, আমি এখন এটি প্রক্রিয়া করতে পারিনি। অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন, অথবা জরুরি হলে হাসপাতালের কর্মীদের সাথে কথা বলুন।'
};

const SUGGESTED_QUESTIONS = {
  hi: [
    'मेरी नवीनतम रिपोर्ट दिखाएं',
    'मेरी दवाएं दिखाएं',
    'मेरी पिछली डॉक्टर विजिट दिखाएं',
    'मेरा पेशेंट कार्ड दिखाएं',
    'मेरी रिपोर्ट समझाइए',
    'मेरा मेडिकल टाइमलाइन दिखाएं',
    'विजिट की तैयारी में सहायता करें',
    'मेरा स्वास्थ्य से जुड़ा सवाल है'
  ],
  bn: [
    'আমার সর্বশেষ রিপোর্ট দেখান',
    'আমার প্রেসক্রিপশনের ওষুধ দেখান',
    'আমার আগের ডাক্তারের পরিদর্শন দেখান',
    'আমার পেশেন্ট কার্ড দেখান',
    'আমার রিপোর্ট ব্যাখ্যা করুন',
    'আমার মেডিকেল টাইমলাইন দেখান',
    'পরিদর্শনের প্রস্তুতির পরামর্শ',
    'আমার একটি স্বাস্থ্য প্রশ্ন আছে'
  ],
  en: [
    'Show my latest report',
    'Show my medicines',
    'Show my previous visits',
    'Show my patient card',
    'Explain my report',
    'Show my medical timeline',
    'Help me prepare for my visit',
    'I have a health question'
  ]
};

class PatientAssistant {
  /**
   * Main entry point for patient AI interaction.
   *
   * @param {Object} params
   * @param {string} params.patientId
   * @param {string} params.message
   * @param {string|null} [params.conversationId]
   * @param {string} [params.language='en']
   * @param {string} [params.source='text']
   * @returns {Promise<{
   *   success: boolean,
   *   conversationId: string,
   *   reply: string,
   *   recordReferences: Array,
   *   isEmergency: boolean,
   *   suggestedQuestions: string[]
   * }>}
   */
  static async processMessage({ patientId, message, conversationId = null, language = 'en', source = 'text' }) {
    // --- Input validation ---
    if (!patientId || typeof patientId !== 'string') {
      throw new Error('Missing or invalid patientId');
    }
    if (typeof message !== 'string' || !message.trim()) {
      throw new Error('Missing or invalid message');
    }

    const normalizedLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
    const trimmedMessage = message.trim().slice(0, MAX_MESSAGE_LENGTH);

    try {
      const patient = await Patient.findById(patientId);
      if (!patient) {
        logger.warn(`PatientAssistant: processMessage called for unknown patientId ${patientId}`);
        throw new Error('Patient not found');
      }
      const patientName = patient.fullName || 'Patient';

      // 1. Get or create conversation
      const conversation = await ConversationEngine.getOrCreateConversation(patientId, conversationId, normalizedLanguage);
      const activeConvId = conversation.conversationId;

      // Defensive check: never let a caller-supplied conversationId pull up
      // a conversation that belongs to a different patient.
      if (conversation.patientId && String(conversation.patientId) !== String(patientId)) {
        logger.error(`PatientAssistant: conversation ${activeConvId} does not belong to patient ${patientId}`);
        throw new Error('Conversation does not belong to this patient');
      }

      // 2. Save incoming user message
      await ConversationEngine.saveMessage({
        patientId,
        conversationId: activeConvId,
        sender: 'patient',
        message: trimmedMessage,
        source
      });

      // 3. Step 1: Emergency Detection (Section 63)
      const emergencyEval = EmergencyDetector.evaluateEmergency(trimmedMessage, normalizedLanguage);
      if (emergencyEval.isEmergency) {
        logger.warn(`PatientAssistant: emergency detected for patient ${patientId} in conversation ${activeConvId}`);
        await EmergencyDetector.logEmergencyEvent(patientId, trimmedMessage, patientName);

        return this._finalizeShortCircuitReply({
          patientId,
          activeConvId,
          reply: emergencyEval.guidance,
          isEmergency: true,
          suggestedQuestions: [
            'Contact Emergency Desk',
            'Call Helpline 108',
            'Locate Nearest Staff Member'
          ]
        });
      }

      // 4. Step 2: Safety Guard Boundary Check (Section 62)
      const safetyCheck = SafetyGuard.checkPromptSafety(trimmedMessage);
      if (!safetyCheck.isSafe) {
        const safeWarning = SafetyGuard.applySafetyBoundaries(safetyCheck.warning, normalizedLanguage);
        logger.info(`PatientAssistant: safety boundary triggered for patient ${patientId}`);

        return this._finalizeShortCircuitReply({
          patientId,
          activeConvId,
          reply: safeWarning,
          isEmergency: false,
          suggestedQuestions: this.getSuggestedQuestions(normalizedLanguage)
        });
      }

      // 5. Step 3: Controlled Patient Context Retrieval (Section 60)
      const scopedContext = await PatientContextBuilder.buildScopedContext(patientId, trimmedMessage);

      // 6. Step 4: Generate Response (Section 59, 61, 65, 66)
      let generated;
      try {
        generated = await ResponseGenerator.generateAnswer(trimmedMessage, scopedContext, normalizedLanguage);
      } catch (genErr) {
        logger.error(`PatientAssistant: ResponseGenerator failed for patient ${patientId}: ${genErr.message}`, genErr);
        generated = {
          text: FALLBACK_REPLY[normalizedLanguage] || FALLBACK_REPLY.en,
          recordReferences: []
        };
      }

      // 7. Step 5: Save Assistant Reply
      await ConversationEngine.saveMessage({
        patientId,
        conversationId: activeConvId,
        sender: 'assistant',
        message: generated.text,
        source: 'assistant',
        recordReferences: generated.recordReferences || [],
        safetyFlag: false,
        emergencyDetected: false
      });

      // 8. Dynamic Suggested Questions (Section 64)
      const suggestedQuestions = this.getSuggestedQuestions(normalizedLanguage);

      return {
        success: true,
        conversationId: activeConvId,
        reply: generated.text,
        recordReferences: generated.recordReferences || [],
        isEmergency: false,
        suggestedQuestions
      };
    } catch (err) {
      logger.error(`PatientAssistant.processMessage failed for patient ${patientId}: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Shared save-and-return logic for the emergency and safety
   * short-circuit paths, which previously duplicated this block.
   * @private
   */
  static async _finalizeShortCircuitReply({ patientId, activeConvId, reply, isEmergency, suggestedQuestions }) {
    await ConversationEngine.saveMessage({
      patientId,
      conversationId: activeConvId,
      sender: 'assistant',
      message: reply,
      source: 'system',
      recordReferences: [],
      safetyFlag: true,
      emergencyDetected: isEmergency
    });

    return {
      success: true,
      conversationId: activeConvId,
      reply,
      recordReferences: [],
      isEmergency,
      suggestedQuestions
    };
  }

  /**
   * Section 64: Suggested Questions dynamically formatted in chosen language
   */
  static getSuggestedQuestions(language = 'en') {
    return SUGGESTED_QUESTIONS[language] || SUGGESTED_QUESTIONS.en;
  }
}

module.exports = PatientAssistant;