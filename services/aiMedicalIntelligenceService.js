const logger = require('../utils/logger');

class AiMedicalIntelligenceService {
  /**
   * Pharmacist AI Safety Checker:
   * Cross-references doctor's prescribed medications against patient's allergies,
   * chronic conditions, and current medications to flag dangerous interactions.
   */
  static evaluatePharmacyDrugSafety(prescribedMeds = [], patientAllergies = [], patientHistory = []) {
    const flags = [];
    const allergiesStr = (Array.isArray(patientAllergies) ? patientAllergies.join(' ') : String(patientAllergies)).toLowerCase();
    const historyStr = (Array.isArray(patientHistory) ? patientHistory.join(' ') : String(patientHistory)).toLowerCase();

    const medsList = Array.isArray(prescribedMeds) ? prescribedMeds : [prescribedMeds];

    medsList.forEach(item => {
      const medName = (typeof item === 'string' ? item : (item.medicineName || '')).toLowerCase();

      // 1. Beta-Lactam / Penicillin Allergy Check
      if ((allergiesStr.includes('penicillin') || allergiesStr.includes('amoxicillin') || allergiesStr.includes('antibiotic')) &&
          (medName.includes('amox') || medName.includes('clav') || medName.includes('ampicillin') || medName.includes('augmentin') || medName.includes('penicillin'))) {
        flags.push({
          severity: 'CRITICAL',
          type: 'DRUG_ALLERGY_CONTRAINDICATION',
          title: 'Critical Penicillin / Beta-Lactam Allergy Alert',
          description: `Patient has a documented Penicillin allergy. Prescribed drug contains '${medName}', which poses a high risk of acute anaphylaxis.`,
          recommendation: 'DO NOT DISPENSE without consulting attending physician. Consider Macrolides or Fluoroquinolones.'
        });
      }

      // 2. NSAID / Aspirin Allergy & Ulcer Check
      if ((allergiesStr.includes('nsaid') || allergiesStr.includes('aspirin') || allergiesStr.includes('painkiller')) &&
          (medName.includes('aspirin') || medName.includes('ibuprofen') || medName.includes('diclofenac') || medName.includes('naproxen'))) {
        flags.push({
          severity: 'CRITICAL',
          type: 'DRUG_ALLERGY_CONTRAINDICATION',
          title: 'NSAID / Aspirin Hypersensitivity Alert',
          description: `Patient has documented allergy to NSAID painkillers. Prescribed medication contains '${medName}'.`,
          recommendation: 'Substitute with Paracetamol / Acetaminophen with physician confirmation.'
        });
      }

      // 3. Hypertension & Decongestant Interaction
      if (historyStr.includes('hypertension') && (medName.includes('pseudoephedrine') || medName.includes('phenylephrine'))) {
        flags.push({
          severity: 'WARNING',
          type: 'CONDITION_CONTRAINDICATION',
          title: 'Hypertension Caution with Decongestants',
          description: `Patient has Hypertension. Sympathomimetic decongestant '${medName}' may cause acute blood pressure spikes.`,
          recommendation: 'Monitor blood pressure or switch to saline nasal spray.'
        });
      }
    });

    return {
      safetyStatus: flags.some(f => f.severity === 'CRITICAL') ? 'UNSAFE_CRITICAL_ALERT' : (flags.length > 0 ? 'CAUTION_WARNING' : 'SAFE_TO_DISPENSE'),
      flagCount: flags.length,
      flags,
      checkedAt: new Date().toISOString()
    };
  }

  /**
   * Generates patient-friendly prescription instructions in English, Hindi, or Bengali
   */
  static generatePatientFriendlyExplanation(prescribedMeds, language = 'en') {
    const medsList = Array.isArray(prescribedMeds) ? prescribedMeds.map(m => typeof m === 'string' ? m : m.medicineName).join(', ') : String(prescribedMeds);

    const translations = {
      en: `Patient Dosage Instructions:
• Take prescribed medicines on time as advised by your doctor.
• Drink plenty of clean water and complete the full prescribed course.
• If you experience any rash or dizziness, stop medication and contact the hospital immediately.`,
      hi: `मरीज के लिए दवा लेने के निर्देश:
• डॉक्टर द्वारा बताई गई दवाइयां समय पर लें (खाना खाने के बाद/पहले)।
• पूरे दिन पर्याप्त पानी पिएं और दवा का पूरा कोर्स समाप्त करें।
• यदि शरीर पर चकत्ते (एलर्जी) या चक्कर आए तो तुरंत अस्पताल संपर्क करें।`,
      bn: `রোগীর জন্য ওষুধ সেবনের নির্দেশিকা:
• ডাক্তারের পরামর্শ অনুযায়ী সময়মতো ওষুধ সেবন করুন।
• পর্যাপ্ত পরিমাণে জল পান করুন এবং ওষুধের পুরো কোর্সটি সম্পন্ন করুন।
• শরীরে কোনো অ্যালার্জি বা মাথা ঘোরার অনুভূতি হলে তৎক্ষণাৎ হাসপাতালে যোগাযোগ করুন।`
    };

    return translations[language] || translations.en;
  }
}

module.exports = AiMedicalIntelligenceService;
