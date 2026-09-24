const logger = require('../../utils/logger');
const Emergency = require('../../models/Emergency');

// High-risk patterns in English, Hindi, Bengali
const EMERGENCY_PATTERNS = [
  // English
  /\b(chest pain|chest pressure|crushing pain in chest|pain radiating to arm|heart attack)\b/i,
  /\b(difficulty breathing|shortness of breath|cannot breathe|struggling to breathe|gasping for air)\b/i,
  /\b(coughing (up )?blood|vomiting blood|massive bleeding|severe hemorrhage)\b/i,
  /\b(loss of consciousness|fainted|unconscious|passed out|blacked out|unresponsive)\b/i,
  /\b(stroke|facial droop|slurred speech|sudden paralysis|sudden numbness in face|arm weakness)\b/i,
  /\b(severe allergic reaction|anaphylaxis|throat swelling|lips swelling)\b/i,
  /\b(suicide|suicidal|end my life|kill myself)\b/i,
  /\b(severe head injury|seizure|convulsions|convulsing)\b/i,

  // Hindi
  /(छाती में तेज दर्द|सीने में दर्द|दिल का दौरा|हार्ट अटैक)/,
  /(सांस लेने में तकलीफ|सांस नहीं आ रही|दम घुट रहा)/,
  /(खून की उल्टी|तेज खून बहना|रक्तस्राव)/,
  /(बेहोश|बेहोशी|अचेत|मूर्छित)/,
  /(लकवा|स्ट्रोक|अचानक कमजोरी)/,

  // Bengali
  /(বুকে তীব্র ব্যথা|বুকে চাপ|হার্ট অ্যাটাক)/,
  /(শ্বাস নিতে পারছি না|শ্বাসকষ্ট|দম বন্ধ)/,
  /(রক্ত বমি|প্রচুর রক্তপাত)/,
  /(অজ্ঞান হয়ে গেছি|অচেতন)/,
  /(প্যারালাইসিস|স্ট্রোক)/
];

class EmergencyDetector {
  /**
   * Check if user input contains red-flag emergency symptoms
   */
  static evaluateEmergency(text, language = 'en') {
    if (!text || typeof text !== 'string') {
      return { isEmergency: false };
    }

    const trimmed = text.trim();
    for (const pattern of EMERGENCY_PATTERNS) {
      if (pattern.test(trimmed)) {
        logger.warn(`[EMERGENCY_DETECTED_IN_PATIENT_CHAT] Matched pattern: ${pattern}`);

        let guidance = '';
        if (language === 'hi') {
          guidance = `🚨 **आपातकालीन चिकित्सा चेतावनी**\n\nयह स्थिति तत्काल चिकित्सा सहायता की मांग कर सकती है।\n\n• यदि आप अस्पताल के भीतर हैं, तो कृपया तुरंत नजदीकी स्वास्थ्य कर्मी या रिसेप्शन डेस्क को सूचित करें।\n• यदि आप घर पर हैं, तो तुरंत आपातकालीन एम्बुलेंस (108 / 112) को कॉल करें या निकटतम आपातकालीन कक्ष में जाएँ।\n• कृपया प्रतीक्षा न करें या अकेले रहने से बचें।`;
        } else if (language === 'bn') {
          guidance = `🚨 **জরুরি চিকিৎসা সতর্কতা**\n\nএই পরিস্থিতিটির জন্য তাৎক্ষণিক চিকিৎসার প্রয়োজন হতে পারে।\n\n• আপনি যদি হাসপাতালের ভেতরে থাকেন, অবিলম্বে নিকটস্থ হাসপাতাল কর্মী বা নার্সকে জানান।\n• অবিলম্বে জরুরি হেল্পলাইনে (108 / 112) কল করুন অথবা নিকটস্থ ইমার্জেন্সিতে যান।\n• অনুগ্রহ করে একা থাকবেন না এবং সাহায্য নিন।`;
        } else {
          guidance = `🚨 **URGENT MEDICAL ATTENTION REQUIRED**\n\nThis may require urgent medical attention.\n\n• **Please alert hospital staff immediately or seek emergency medical care.**\n• If you are currently inside the hospital, use the Emergency assistance desk or inform the nearest healthcare worker immediately.\n• If at home, immediately call **108 / 112** or proceed to the nearest emergency department.\n• Do not delay or wait for symptoms to resolve on their own.`;
        }

        return {
          isEmergency: true,
          urgency: 'CRITICAL',
          guidance,
          timestamp: new Date()
        };
      }
    }

    return { isEmergency: false };
  }

  /**
   * Log emergency trigger in Emergency / Audit system
   */
  static async logEmergencyEvent(patientId, query, patientName) {
    try {
      if (Emergency && Emergency.create) {
        await Emergency.create({
          kioskId: 'PATIENT-PORTAL-WEB',
          patientId: String(patientId),
          type: 'CHAT_EMERGENCY_ALERT',
          description: `Patient triggered emergency symptoms in AI Health Assistant: "${query.slice(0, 100)}"`,
          severity: 'critical',
          status: 'pending',
          patientName: patientName || 'Portal Patient'
        });
      }
    } catch (e) {
      logger.error('Failed to log emergency event: ' + e.message);
    }
  }
}

module.exports = EmergencyDetector;
