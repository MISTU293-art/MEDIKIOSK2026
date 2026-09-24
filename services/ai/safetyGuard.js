const logger = require('../../utils/logger');

// Patterns that attempt to seek unprescribed treatment or override doctors
const PRESCRIPTION_ATTEMPT_PATTERNS = [
  /\b(prescribe|give me a prescription|what dosage should i take instead|can i stop taking|can i double my dose|should i quit my medicine)\b/i,
  /\b(tell me what illness i have|diagnose me|do i have cancer|do i have covid)\b/i,
  /\b(override doctor|my doctor is wrong|ignore my doctor)\b/i
];

class SafetyGuard {
  /**
   * Evaluate if a user's prompt seeks direct prescription or unverified diagnosis
   */
  static checkPromptSafety(prompt) {
    if (!prompt) return { isSafe: true };

    for (const pattern of PRESCRIPTION_ATTEMPT_PATTERNS) {
      if (pattern.test(prompt)) {
        return {
          isSafe: false,
          reason: 'PRESCRIPTION_OR_DIAGNOSIS_ATTEMPT',
          warning: 'MediKiosk AI is an educational assistant and cannot prescribe medicines, change dosages, or offer medical diagnoses. Please consult your physician.'
        };
      }
    }

    return { isSafe: true };
  }

  /**
   * Sanitizes the response and appends mandatory safety disclosures
   */
  static applySafetyBoundaries(response, language = 'en') {
    if (!response || typeof response !== 'string') return response;

    let disclaimer = '';
    if (language === 'hi') {
      disclaimer = `\n\n---\nℹ️ *महत्वपूर्ण सूचना:* मेडीकियोस्क एआई केवल जानकारी और आपकी रिकॉर्ड्स को समझने में सहायता के लिए है। यह कोई चिकित्सा निदान या नुस्खा नहीं देता है। किसी भी दवा में बदलाव करने से पहले हमेशा अपने डॉक्टर से परामर्श लें।`;
    } else if (language === 'bn') {
      disclaimer = `\n\n---\nℹ️ *গুরুত্বপূর্ণ নোটিশ:* মেডিকিয়স্ক এআই সহকারী কেবল তথ্যমূলক সহায়তার জন্য তৈরি। এটি সরাসরি রোগ নির্ণয় বা কোনো প্রেসক্রিপশন প্রদান করে না। চিকিৎসকের পরামর্শ ব্যতীত ওষুধের পরিবর্তন করবেন না।`;
    } else {
      disclaimer = `\n\n---\nℹ️ *Important Notice:* MediKiosk AI Health Assistant provides informational insights based on your records. It does not provide medical diagnoses, alter dosages, or prescribe medications. Always consult your healthcare professional for clinical decisions.`;
    }

    // Ensure we don't duplicate disclaimer if already present
    if (response.includes('Important Notice') || response.includes('महत्वपूर्ण सूचना') || response.includes('গুরুত্বপূর্ণ নোটিশ')) {
      return response;
    }

    return response + disclaimer;
  }
}

module.exports = SafetyGuard;
