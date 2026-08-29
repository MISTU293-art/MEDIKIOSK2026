const fs = require('fs');
const path = require('path');
const { LANGUAGES } = require('../config/constants');

const questionsPath = path.join(__dirname, '../utils/questionBanks.json');
let cachedQuestionBanks = null;

const getQuestionBanks = () => {
  if (!cachedQuestionBanks) {
    const raw = fs.readFileSync(questionsPath, 'utf8');
    cachedQuestionBanks = JSON.parse(raw);
  }
  return cachedQuestionBanks;
};

const UI_DICTIONARY = {
  en: {
    welcome: "Welcome to MediKiosk",
    subtitle: "AI-Assisted Patient Intake & Clinical History System",
    startIntake: "Start Registration / Intake",
    selectLanguage: "Select Preferred Language",
    next: "Next Step",
    back: "Previous Step",
    skip: "Skip / Not Sure",
    submit: "Complete & Submit Intake",
    holdToSpeak: "Hold to Speak (Voice Input)",
    releaseToSend: "Release when finished",
    repeatAudio: "Repeat Question Audio",
    listenAgain: "Listen Again",
    offlineNotice: "You are currently offline. Your responses are safely stored locally and will automatically sync once connection is restored.",
    emergencyAlert: "URGENT SAFETY NOTICE",
    doctorReviewNote: "AI-DRAFTED SUMMARY — PENDING DOCTOR REVIEW"
  },
  hi: {
    welcome: "मेडीकियोस्क (MediKiosk) में आपका स्वागत है",
    subtitle: "एआई-सहायक अस्पताल मरीज केस-टेकिंग एवं मेडिकल इतिहास प्रणाली",
    startIntake: "पंजीकरण / केस-टेकिंग शुरू करें",
    selectLanguage: "अपनी भाषा चुनें",
    next: "आगे बढ़ें",
    back: "पीछे जाएं",
    skip: "छोड़ें / निश्चित नहीं",
    submit: "केस-टेकिंग पूर्ण करें और जमा करें",
    holdToSpeak: "बोलने के लिए दबाकर रखें (आवाज इनपुट)",
    releaseToSend: "बोलना समाप्त होने पर छोड़ें",
    repeatAudio: "प्रश्न दोबारा सुनें",
    listenAgain: "फिर से सुनें",
    offlineNotice: "आप वर्तमान में ऑफलाइन हैं। आपके उत्तर स्थानीय रूप से सुरक्षित हैं और इंटरनेट आने पर स्वतः सिंक हो जाएंगे।",
    emergencyAlert: "आपातकालीन सुरक्षा सूचना",
    doctorReviewNote: "एआई-प्रारूपित सारांश — डॉक्टर समीक्षा के अधीन"
  },
  bn: {
    welcome: "মেডিকিয়স্ক (MediKiosk)-এ আপনাকে স্বাগতম",
    subtitle: "এআই-সহায়তাপ্রাপ্ত রোগীর কেস-টেকিং ও চিকিৎসার ইতিহাস ব্যবস্থা",
    startIntake: "নিবন্ধন / কেস-টেকিং শুরু করুন",
    selectLanguage: "আপনার পছন্দের ভাষা নির্বাচন করুন",
    next: "পরবর্তী ধাপ",
    back: "পূর্ববর্তী ধাপ",
    skip: "এড়িয়ে যান / নিশ্চিত নই",
    submit: "কেস-টেকিং সম্পন্ন করে জমা দিন",
    holdToSpeak: "কথা বলতে চেপে ধরে রাখুন (ভয়েস ইনপুট)",
    releaseToSend: "বলা শেষ হলে ছেড়ে দিন",
    repeatAudio: "প্রশ্নটি পুনরায় শুনুন",
    listenAgain: "আবার শুনুন",
    offlineNotice: "আপনি বর্তমানে অফলাইনে আছেন। আপনার উত্তর নিরাপদে জমা থাকছে এবং ইন্টারনেট সংযোগ পেলেই স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।",
    emergencyAlert: "জরুরি নিরাপত্তা বিজ্ঞপ্তি",
    doctorReviewNote: "এআই-খসড়া সারাংশ — ডাক্তারের অনুমোদনের অপেক্ষায়"
  }
};

class TranslationService {
  static getQuestionBank(language = 'en') {
    const banks = getQuestionBanks();
    return banks;
  }

  static getStrings(language = 'en') {
    return UI_DICTIONARY[language] || UI_DICTIONARY.en;
  }

  static getLocalizedQuestion(stepNumber, language = 'en') {
    const banks = getQuestionBanks();
    const step = banks.steps.find(s => s.number === stepNumber);
    if (!step) return null;
    return {
      id: step.id,
      number: step.number,
      title: step.title[language] || step.title.en,
      description: step.description[language] || step.description.en,
      fields: step.fields,
      categories: step.categories,
      conditions: step.conditions,
      options: step.options,
      questions: step.questions,
      durationOptions: step.durationOptions,
      allowSkip: step.allowSkip
    };
  }
}

module.exports = TranslationService;
