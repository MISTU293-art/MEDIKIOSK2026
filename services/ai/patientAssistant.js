const EmergencyDetector = require('./emergencyDetector');
const SafetyGuard = require('./safetyGuard');
const PatientContextBuilder = require('./patientContextBuilder');
const ResponseGenerator = require('./responseGenerator');
const ConversationEngine = require('./conversationEngine');
const Patient = require('../../models/Patient');
const logger = require('../../utils/logger');

class PatientAssistant {
  /**
   * Main entry point for patient AI interaction
   */
  static async processMessage({ patientId, message, conversationId = null, language = 'en', source = 'text' }) {
    if (!patientId || !message) {
      throw new Error('Missing patientId or message');
    }

    const patient = await Patient.findById(patientId);
    const patientName = patient ? patient.fullName : 'Patient';

    // 1. Get or create conversation
    const conversation = await ConversationEngine.getOrCreateConversation(patientId, conversationId, language);
    const activeConvId = conversation.conversationId;

    // 2. Save incoming user message
    await ConversationEngine.saveMessage({
      patientId,
      conversationId: activeConvId,
      sender: 'patient',
      message,
      source
    });

    // 3. Step 1: Emergency Detection (Section 63)
    const emergencyEval = EmergencyDetector.evaluateEmergency(message, language);
    if (emergencyEval.isEmergency) {
      await EmergencyDetector.logEmergencyEvent(patientId, message, patientName);

      // Save emergency assistant response
      await ConversationEngine.saveMessage({
        patientId,
        conversationId: activeConvId,
        sender: 'assistant',
        message: emergencyEval.guidance,
        source: 'system',
        recordReferences: [],
        safetyFlag: true,
        emergencyDetected: true
      });

      return {
        success: true,
        conversationId: activeConvId,
        reply: emergencyEval.guidance,
        recordReferences: [],
        isEmergency: true,
        suggestedQuestions: [
          'Contact Emergency Desk',
          'Call Helpline 108',
          'Locate Nearest Staff Member'
        ]
      };
    }

    // 4. Step 2: Safety Guard Boundary Check (Section 62)
    const safetyCheck = SafetyGuard.checkPromptSafety(message);
    if (!safetyCheck.isSafe) {
      const safeWarning = SafetyGuard.applySafetyBoundaries(safetyCheck.warning, language);
      await ConversationEngine.saveMessage({
        patientId,
        conversationId: activeConvId,
        sender: 'assistant',
        message: safeWarning,
        source: 'system',
        recordReferences: [],
        safetyFlag: true
      });

      return {
        success: true,
        conversationId: activeConvId,
        reply: safeWarning,
        recordReferences: [],
        isEmergency: false,
        suggestedQuestions: this.getSuggestedQuestions(language)
      };
    }

    // 5. Step 3: Controlled Patient Context Retrieval (Section 60)
    const scopedContext = await PatientContextBuilder.buildScopedContext(patientId, message);

    // 6. Step 4: Generate Response (Section 59, 61, 65, 66)
    const generated = await ResponseGenerator.generateAnswer(message, scopedContext, language);

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
    const suggestedQuestions = this.getSuggestedQuestions(language);

    return {
      success: true,
      conversationId: activeConvId,
      reply: generated.text,
      recordReferences: generated.recordReferences || [],
      isEmergency: false,
      suggestedQuestions
    };
  }

  /**
   * Section 64: Suggested Questions dynamically formatted in chosen language
   */
  static getSuggestedQuestions(language = 'en') {
    if (language === 'hi') {
      return [
        'मेरी नवीनतम रिपोर्ट दिखाएं',
        'मेरी दवाएं दिखाएं',
        'मेरी पिछली डॉक्टर विजिट दिखाएं',
        'मेरा पेशेंट कार्ड दिखाएं',
        'मेरी रिपोर्ट समझाइए',
        'मेरा मेडिकल टाइमलाइन दिखाएं',
        'विजिट की तैयारी में सहायता करें',
        'मेरा स्वास्थ्य से जुड़ा सवाल है'
      ];
    }
    if (language === 'bn') {
      return [
        'আমার সর্বশেষ রিপোর্ট দেখান',
        'আমার প্রেসক্রিপশনের ওষুধ দেখান',
        'আমার আগের ডাক্তারের পরিদর্শন দেখান',
        'আমার পেশেন্ট কার্ড দেখান',
        'আমার রিপোর্ট ব্যাখ্যা করুন',
        'আমার মেডিকেল টাইমলাইন দেখান',
        'পরিদর্শনের প্রস্তুতির পরামর্শ',
        'আমার একটি স্বাস্থ্য প্রশ্ন আছে'
      ];
    }
    return [
      'Show my latest report',
      'Show my medicines',
      'Show my previous visits',
      'Show my patient card',
      'Explain my report',
      'Show my medical timeline',
      'Help me prepare for my visit',
      'I have a health question'
    ];
  }
}

module.exports = PatientAssistant;
