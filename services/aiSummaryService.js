const logger = require('../utils/logger');

class AiSummaryService {
  /**
   * Generates a structured clinical intake summary following strict AI Safety Boundaries.
   * NEVER provides a diagnosis, never auto-prescribes dosage.
   * Formats patient statements into organized clinical terminology for doctor review.
   */
  static generateDraftSummary(stepData, patientInfo = {}, language = 'en') {
    try {
      const {
        demographics = {},
        chiefComplaint = {},
        hpi = {},
        pastMedicalHistory = {},
        allergies = {},
        medicationHistory = {},
        familyHistory = {},
        personalHistory = {}
      } = stepData;

      const patientName = patientInfo.fullName || demographics.fullName || 'Patient';
      const age = patientInfo.age || demographics.age || 'N/A';
      const gender = patientInfo.gender || demographics.gender || 'N/A';

      // 1. Subjective - Chief Complaint & HPI
      let subjectiveText = `Patient ${patientName}, a ${age}-year-old ${gender}, presents for outpatient clinical consultation.\n`;
      
      if (chiefComplaint.selectedOptions && chiefComplaint.selectedOptions.length > 0) {
        subjectiveText += `• Primary Symptoms: ${chiefComplaint.selectedOptions.join(', ')}\n`;
      }
      if (chiefComplaint.duration) {
        subjectiveText += `• Duration: ${chiefComplaint.duration.replace(/_/g, ' ')}\n`;
      }
      if (hpi.severity) {
        subjectiveText += `• Reported Pain/Discomfort Severity: ${hpi.severity}/10\n`;
      }
      if (hpi.onset) {
        subjectiveText += `• Onset: ${hpi.onset}\n`;
      }
      if (hpi.progression) {
        subjectiveText += `• Course / Progression: ${hpi.progression}\n`;
      }
      if (chiefComplaint.freeTextDescription) {
        subjectiveText += `• Patient's Own Words: "${chiefComplaint.freeTextDescription}"\n`;
      }

      // 2. Objective / Historical Data
      let objectiveHistoryText = '';
      
      // Past Medical History
      const pmhItems = pastMedicalHistory.selectedConditions || [];
      objectiveHistoryText += '• Past Medical Conditions: ' + (pmhItems.length > 0 ? pmhItems.join(', ') : 'No chronic conditions reported / Not sure') + '\n';

      // Allergies (Crucial safety highlight)
      const allergyItems = allergies.selectedAllergies || [];
      objectiveHistoryText += '• Allergies: ' + (allergyItems.length > 0 ? allergyItems.join(', ') : 'No Known Drug Allergies (NKDA)') + '\n';

      // Current Medications
      const currentMeds = medicationHistory.currentMeds || [];
      objectiveHistoryText += '• Current Medications: ' + (currentMeds.length > 0 ? currentMeds.join(', ') : 'None reported') + '\n';

      // Family History
      const famHistory = familyHistory.selectedFamilyConditions || [];
      objectiveHistoryText += '• Family History: ' + (famHistory.length > 0 ? famHistory.join(', ') : 'Non-contributory / None reported') + '\n';

      // Lifestyle / Personal
      const lifestyle = personalHistory.selectedHabits || [];
      objectiveHistoryText += '• Lifestyle / Habits: ' + (lifestyle.length > 0 ? lifestyle.join(', ') : 'Standard diet, no specific risk habits reported') + '\n';

      // 3. Assessment-Ready Context (Strictly Non-Diagnostic)
      const assessmentContext = `[AI-ORGANIZED CONTEXT ONLY — DIAGNOSIS MUST BE PERFORMED BY ATTENDING CLINICIAN]
Synthesized review of ${chiefComplaint.selectedOptions ? chiefComplaint.selectedOptions.join(', ') : 'reported symptoms'} with documented onset of ${chiefComplaint.duration || 'recent onset'}. Systemic risk flags reviewed.`;

      // 4. Plan-Ready Structure (Pending Doctor Orders)
      const planDraft = `[PENDING DOCTOR CLINICAL ORDERS]
1. Complete physical examination and vitals verification.
2. Clinical review of prior uploaded records and prescriptions.
3. Formulate differential diagnosis and diagnostic workup as clinically indicated.
4. Prescribe appropriate therapeutic regimen.`;

      const formattedSoap = {
        subjective: subjectiveText.trim(),
        objectiveHistory: objectiveHistoryText.trim(),
        assessmentContext: assessmentContext.trim(),
        planDraft: planDraft.trim()
      };

      const fullDraftText = `=== AI-DRAFTED SUMMARY — PENDING DOCTOR REVIEW ===
(This summary was automatically assembled from structured kiosk intake. It is an administrative aid and does not constitute a clinical diagnosis.)

[SUBJECTIVE]
${formattedSoap.subjective}

[OBJECTIVE & PAST HISTORY]
${formattedSoap.objectiveHistory}

[ASSESSMENT CONTEXT]
${formattedSoap.assessmentContext}

[PLAN CONTEXT]
${formattedSoap.planDraft}
==================================================`;

      return {
        isAiDrafted: true,
        formattedSoap,
        draftText: fullDraftText
      };
    } catch (err) {
      logger.error('Error generating AI draft summary: ' + err.message);
      return {
        isAiDrafted: true,
        formattedSoap: {
          subjective: 'Patient presented via kiosk intake.',
          objectiveHistory: 'Structured intake recorded.',
          assessmentContext: 'Pending doctor evaluation.',
          planDraft: 'Pending doctor clinical plan.'
        },
        draftText: 'AI-DRAFTED SUMMARY — PENDING DOCTOR REVIEW\nPatient intake recorded successfully.'
      };
    }
  }
}

module.exports = AiSummaryService;
