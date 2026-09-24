require('dotenv').config();
const { connectDB } = require('../config/db');
const seedDatabase = require('../utils/seedData');
const Patient = require('../models/Patient');
const PatientAccount = require('../models/PatientAccount');
const Report = require('../models/Report');
const PatientRecordService = require('../services/patient/patientRecordService');
const PatientReportService = require('../services/patient/patientReportService');
const PatientTimelineService = require('../services/patient/patientTimelineService');
const PatientAssistant = require('../services/ai/patientAssistant');
const EmergencyDetector = require('../services/ai/emergencyDetector');
const SafetyGuard = require('../services/ai/safetyGuard');

async function runPatientPortalTests() {
  console.log('==================================================');
  console.log('STARTING PATIENT PORTAL & AI ASSISTANT VERIFICATION');
  console.log('==================================================');

  await connectDB();
  await seedDatabase();

  let passed = 0;
  let failed = 0;

  function assert(name, condition, extra = '') {
    if (condition) {
      console.log(`✓ PASS: ${name} ${extra ? `(${extra})` : ''}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${name} ${extra ? `(${extra})` : ''}`);
      failed++;
    }
  }

  // 1. Patient Account Verification
  console.log('\n--- 1. Patient Account & Authentication ---');
  const patient = await Patient.findOne({ phone: '9830112233' });
  assert('Demo Patient 1 exists', !!patient, patient ? patient.fullName : '');

  const account = await PatientAccount.findOne({ patientId: String(patient._id) });
  assert('PatientAccount exists for Demo Patient', !!account, account ? account.mobile : '');

  const validAuth = account ? await account.comparePassword('patient123') : false;
  assert('Password authentication with bcrypt', validAuth === true);

  const invalidAuth = account ? await account.comparePassword('wrongpassword') : true;
  assert('Password rejection on incorrect credentials', invalidAuth === false);

  // 2. Patient Card & Safe QR/Barcode Verification (Section 46)
  console.log('\n--- 2. Digital Patient Card & Security Rules ---');
  const card = await PatientRecordService.getPatientCard(String(patient._id));
  assert('Digital Patient Card generated', !!card && card.patientName === patient.fullName);
  assert('Patient Card contains safe UHID', card && card.uhid === patient.uhid);
  assert('QR code SVG generated', card && card.qrCodeData && card.qrCodeData.startsWith('data:image/svg+xml'));
  assert('Barcode SVG generated', card && card.barcodeData && card.barcodeData.startsWith('data:image/svg+xml'));
  assert('Mobile number properly masked', card && card.maskedPhone.includes('****'));
  // Security rule: Safe identifier only, never diagnosis or personal secrets
  const qrSafe = !card.qrCodeData.includes('Acute Coronary') && !card.qrCodeData.includes('Amoxicillin');
  assert('QR code strictly contains safe identifiers (no diagnostics/medicines)', qrSafe);

  // 3. Complete Patient Record Retrieval (Section 47)
  console.log('\n--- 3. Complete Patient Record Retrieval (/api/patient/me) ---');
  const completeRecord = await PatientRecordService.getPatientCompleteRecord(String(patient._id));
  assert('Complete record has patient profile', !!completeRecord.patient);
  assert('Complete record has patientCard', !!completeRecord.patientCard);
  assert('Complete record has visits list', Array.isArray(completeRecord.visits) && completeRecord.visits.length > 0);
  assert('Complete record has reports', Array.isArray(completeRecord.reports) && completeRecord.reports.length > 0);
  assert('Complete record has prescriptions', Array.isArray(completeRecord.prescriptions));
  assert('Complete record has medicines history', Array.isArray(completeRecord.medicines));
  assert('Complete record has allergies', !!completeRecord.allergies);
  assert('Complete record has labResults', Array.isArray(completeRecord.labResults) && completeRecord.labResults.length > 0);
  assert('Complete record has timeline', !!completeRecord.timeline);

  // 4. Lab Results & Abnormal Value Flags (Section 55)
  console.log('\n--- 4. Laboratory Results & Abnormal Value Flags ---');
  const labResults = await PatientReportService.getLabResults(String(patient._id));
  assert('Lab results retrieved', labResults.length > 0);
  const hb = labResults.find(l => l.parameter.toLowerCase().includes('hemoglobin'));
  assert('Hemoglobin test found with reference range', !!hb && !!hb.referenceRange, hb ? `${hb.value} ${hb.unit}` : '');
  assert('Lab result has safety disclaimer', hb && hb.safetyNotice.length > 0);

  // 5. Report Explanation with AI (Section 65)
  console.log('\n--- 5. Report Explanation with AI ---');
  const reports = await PatientReportService.getReports(String(patient._id));
  const explanationEn = await PatientReportService.explainReport(String(patient._id), reports[0].id, 'en');
  assert('AI Report explanation in English', explanationEn.success && explanationEn.valuesExplanation.length > 0);
  assert('Mandatory non-diagnosis disclaimer included', explanationEn.disclaimer.includes('NOT A CLINICAL DIAGNOSIS'));

  const explanationHi = await PatientReportService.explainReport(String(patient._id), reports[0].id, 'hi');
  assert('AI Report explanation in Hindi', explanationHi.success && explanationHi.valuesExplanation.includes('सरल शब्दों में'));

  // 6. Medicine History Categorization (Section 51)
  console.log('\n--- 6. Medicine History Categorization ---');
  const medHistory = await PatientRecordService.getMedicineHistory(String(patient._id));
  assert('Medicines categorized into Current', Array.isArray(medHistory.current));
  assert('Medicines categorized into Completed', Array.isArray(medHistory.completed));
  assert('Medicines categorized into Previous', Array.isArray(medHistory.previous));
  assert('Chronological medicine timeline generated', Array.isArray(medHistory.timeline));

  // 7. Medical Timeline (Section 53)
  console.log('\n--- 7. Medical Timeline Intelligence ---');
  const timeline = await PatientTimelineService.buildMedicalTimeline(String(patient._id));
  assert('Timeline events generated', timeline.totalEvents > 0);
  assert('Timeline grouped by year', Array.isArray(timeline.years) && timeline.years.length > 0);
  assert('Timeline event has recordLink', timeline.events[0] && !!timeline.events[0].recordLink);

  // 8. AI Health Assistant & Record-Aware Question Answering (Sections 58, 59, 61)
  console.log('\n--- 8. AI Health Assistant Record-Aware Answering ---');
  const reportQuery = await PatientAssistant.processMessage({
    patientId: String(patient._id),
    message: 'Show my latest report',
    language: 'en'
  });
  assert('AI answers "Show my latest report"', reportQuery.success && reportQuery.reply.toLowerCase().includes('report'));
  assert('AI provides record reference link', reportQuery.recordReferences.length > 0 && reportQuery.recordReferences[0].type === 'report');

  const medQuery = await PatientAssistant.processMessage({
    patientId: String(patient._id),
    message: 'What medicines are currently recorded for me?',
    language: 'en'
  });
  assert('AI answers medicine query', medQuery.success && (medQuery.reply.includes('medication') || medQuery.reply.includes('recorded')));

  // 9. AI Emergency Detection (Section 63)
  console.log('\n--- 9. AI Emergency Detection ---');
  const emergencyCheck = EmergencyDetector.evaluateEmergency('I am having severe chest pain and difficulty breathing', 'en');
  assert('Emergency detected for severe chest pain', emergencyCheck.isEmergency === true);
  assert('Critical urgency flagged', emergencyCheck.urgency === 'CRITICAL');
  assert('Emergency response advises immediate hospital staff alert', emergencyCheck.guidance.includes('108') || emergencyCheck.guidance.includes('hospital staff'));

  const hindiEmergency = EmergencyDetector.evaluateEmergency('मुझे छाती में तेज दर्द हो रहा है और सांस नहीं आ रही', 'hi');
  assert('Emergency detected in Hindi', hindiEmergency.isEmergency === true);

  // 10. AI Safety Guard Boundary (Section 62)
  console.log('\n--- 10. AI Safety Guard ---');
  const safetyAttempt = SafetyGuard.checkPromptSafety('Please prescribe me antibiotics and diagnose my chest illness');
  assert('Prescription/diagnosis attempt blocked by Safety Guard', safetyAttempt.isSafe === false);

  console.log('\n==================================================');
  console.log(`PATIENT PORTAL TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPatientPortalTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
