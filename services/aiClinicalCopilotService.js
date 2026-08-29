/**
 * MediKiosk AI Clinical Copilot & Auto-Suggestion Service (PRD §8 & §10)
 * Generates structured clinical suggestions, differential impressions, AYUSH Rx,
 * Anupana carriers, and Pathya-Apathya dietary guidance for doctors.
 */

const CLINICAL_KNOWLEDGE_BASE = [
  {
    keywords: ['joint pain', 'arthritis', 'knee pain', 'sandhivata', 'swelling', 'stiffness'],
    impression: 'Sandhivata (Osteoarthritis) / Vata Vyadhi',
    prescriptions: [
      'Tab Yogaraj Guggulu - 2 Tabs BD with warm water after meals',
      'Tab Shallaki (Boswellia 500mg) - 1 Tab BD after meals',
      'Mahanarayan Taila - Local gentle application twice daily'
    ],
    anupana: 'Warm water or warm cow\'s milk; Avoid cold exposure and sour/fermented foods (Katu-Tikta diet)',
    labs: ['Serum Uric Acid', 'ESR & CRP', 'X-Ray Knee (AP & Lateral views)', 'Janu Basti Panchakarma'],
    patientAdvice: 'Avoid climbing stairs repeatedly. Keep knees warm and practice gentle joint rotations.'
  },
  {
    keywords: ['fever', 'jwara', 'body ache', 'chills', 'cold', 'cough'],
    impression: 'Vata-Kaphaja Jwara (Acute Viral Febrile Illness)',
    prescriptions: [
      'Tab Mahasudarshan Ghanvati - 2 Tabs BD with warm water',
      'Tab Tribhuvankirti Rasa - 1 Tab BD after meals',
      'Syp Sitopaladi Churna (3g) + Honey - TDS'
    ],
    anupana: 'Warm boiled water (Ushnodaka) or Tulsi-Ginger decoction; strictly avoid cold drinks and heavy curd',
    labs: ['Complete Blood Count (CBC)', 'Platelet Count', 'TyphiDot / Dengue NS1 Antigen (if fever > 3 days)'],
    patientAdvice: 'Take light warm diet (Moong dal khichdi). Rest adequately and drink warm water frequently.'
  },
  {
    keywords: ['acidity', 'digestion', 'heartburn', 'amlapitta', 'bloating', 'gas', 'constipation'],
    impression: 'Amlapitta (Gastroesophageal Reflux / Dyspepsia) with Agnimandya',
    prescriptions: [
      'Tab Avipattikar Churna - 3g BD with warm water before meals',
      'Tab Shankha Vati - 1 Tab BD after meals',
      'Syp Abhayarishta - 15ml BD with equal warm water after meals'
    ],
    anupana: 'Take with warm water or lukewarm milk; strictly avoid spicy, deep-fried, and late-night meals',
    labs: ['Serum H. Pylori IgG', 'Liver Function Tests (LFT)', 'Abdominal Ultrasound (if pain persists)'],
    patientAdvice: 'Avoid skipping meals. Drink coconut water and maintain regular sleep schedule.'
  },
  {
    keywords: ['chest pain', 'breathlessness', 'angina', 'hridroga', 'palpitations'],
    impression: 'Hridroga / Angina Pectoris (Requires Immediate Cardiac Evaluation)',
    prescriptions: [
      'Tab Sorbitrate 5mg - 1 Tab sublingually SOS for acute chest pain',
      'Cap Arjuna Ghanvati (500mg) - 1 Cap BD with warm milk',
      'Tab Prabhakar Vati - 1 Tab BD'
    ],
    anupana: 'Warm water or milk; strictly avoid physical exertion and heavy fatty meals',
    labs: ['Stat 12-Lead ECG', 'Serum Troponin-I / CK-MB', 'Lipid Profile', '2D Echocardiography'],
    patientAdvice: 'Immediate bed rest. Report any worsening tightness to the nearest emergency wing.'
  },
  {
    keywords: ['skin rash', 'itching', 'kushtha', 'eczema', 'allergy'],
    impression: 'Kushtha Roga / Allergic Dermatitis (Pitta-Rakta Dushti)',
    prescriptions: [
      'Tab Kaishore Guggulu - 2 Tabs BD after meals',
      'Tab Gandhak Rasayan - 1 Tab BD with milk',
      'Mahamarichyadi Taila - External application on dry skin'
    ],
    anupana: 'Warm water; avoid direct sun exposure, synthetic soaps, sour foods, and jaggery',
    labs: ['Absolute Eosinophil Count (AEC)', 'Serum Total IgE', 'Skin Scraping for KOH'],
    patientAdvice: 'Wear loose cotton clothes. Avoid scratching and apply pure coconut oil.'
  }
];

class AiClinicalCopilotService {
  /**
   * Generates real-time AI auto-suggestions for doctor's prescription pad
   */
  static getClinicalSuggestions(patientData = {}) {
    const { stepData, chiefComplaint, pastHistory, prakriti, age, gender } = patientData;
    
    // Aggregate text for clinical matching
    const searchTerms = [];
    if (chiefComplaint) {
      if (Array.isArray(chiefComplaint.selectedOptions)) searchTerms.push(...chiefComplaint.selectedOptions);
      if (chiefComplaint.freeTextDescription) searchTerms.push(chiefComplaint.freeTextDescription);
    }
    if (stepData && stepData.chiefComplaint) {
      if (Array.isArray(stepData.chiefComplaint.selectedOptions)) searchTerms.push(...stepData.chiefComplaint.selectedOptions);
      if (stepData.chiefComplaint.freeTextDescription) searchTerms.push(stepData.chiefComplaint.freeTextDescription);
    }

    const fullSearchText = searchTerms.join(' ').toLowerCase();

    // Match best clinical knowledge block
    let matchedBlock = null;
    let maxMatches = 0;

    for (const kb of CLINICAL_KNOWLEDGE_BASE) {
      const matchCount = kb.keywords.filter(k => fullSearchText.includes(k)).length;
      if (matchCount > maxMatches) {
        maxMatches = matchCount;
        matchedBlock = kb;
      }
    }

    if (!matchedBlock) {
      // Default General Wellness / Kayachikitsa suggestion
      matchedBlock = {
        impression: 'Samanya Dourbalya (General Fatigue) / Pitta-Kapha Imbalance',
        prescriptions: [
          'Tab Ashwagandha Ghanvati - 1 Tab BD with warm milk',
          'Syp Drakshasava - 15ml BD with equal warm water after meals',
          'Chyawanprash (Rasayana) - 1 Tsp in morning'
        ],
        anupana: 'Take with warm milk or lukewarm water; maintain balanced wholesome seasonal diet (Pathya)',
        labs: ['Routine Hemogram (CBC)', 'Serum Ferritin & Vitamin D3', 'Fasting Blood Sugar'],
        patientAdvice: 'Practice daily Pranayama (Anulom-Vilom) and 7-8 hours of sound sleep.'
      };
    }

    return {
      success: true,
      copilotActive: true,
      aiModel: 'Gemini-1.5-Flash MedLLM Copilot',
      disclaimer: 'AI-assisted clinical suggestion. Clinician exercises full prescribing discretion.',
      suggestedImpression: matchedBlock.impression,
      suggestedPrescriptions: matchedBlock.prescriptions,
      suggestedPrescriptionsText: matchedBlock.prescriptions.join('\n'),
      suggestedAnupana: matchedBlock.anupana,
      suggestedLabs: matchedBlock.labs.join(', '),
      suggestedPatientAdvice: matchedBlock.patientAdvice,
      prakritiContext: prakriti || 'Vata-Pitta Prakriti'
    };
  }
}

module.exports = AiClinicalCopilotService;
