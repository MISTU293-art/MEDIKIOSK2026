const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Patient = require('../models/Patient');
const IntakeSession = require('../models/IntakeSession');
const Document = require('../models/Document');
const RedFlagAudit = require('../models/RedFlagAudit');
const Kiosk = require('../models/Kiosk');
const ConsultationNote = require('../models/ConsultationNote');
const DispensationRecord = require('../models/DispensationRecord');
const logger = require('./logger');

const seedDatabase = async () => {
  try {
    await User.deleteMany({});
    logger.info('Resetting users with clean single-hashed passwords...');

    await User.create({
      name: 'Dr. Anand Verma (Medical Superintendent)',
      email: 'admin@hospital.org',
      password: 'admin123',
      role: 'admin',
      department: 'Hospital Administration'
    });

    await User.create({
      name: 'Dr. Arindam Banerjee (MD, Internal Medicine)',
      email: 'doctor@hospital.org',
      password: 'doctor123',
      role: 'doctor',
      department: 'General Medicine'
    });

    await User.create({
      name: 'Dr. Meera Sharma (MD, DM Cardiology)',
      email: 'cardio@hospital.org',
      password: 'doctor123',
      role: 'doctor',
      department: 'Cardiology'
    });

    await User.create({
      name: 'Priya Sen (OPD Reception Desk)',
      email: 'staff@hospital.org',
      password: 'staff123',
      role: 'staff',
      department: 'OPD Registration & Triage'
    });

    await User.create({
      name: 'Vikram Joshi (Registered Pharmacist)',
      email: 'pharmacy@hospital.org',
      password: 'pharmacy123',
      role: 'staff',
      department: 'Hospital Pharmacy'
    });

    logger.info('Created 5 verified user accounts (Admin, Doctors, Staff, Pharmacist).');

    // Ensure sample patients and consultations exist
    const patientCount = await Patient.countDocuments();
    if (patientCount === 0) {
      const patient1 = await Patient.create({
        uhid: 'UHID-880124-12',
        tokenNumber: 'T-101',
        fullName: 'Rajesh Kumar Chatterjee',
        age: 58,
        gender: 'male',
        phone: '9830112233',
        emergencyContact: '9830112244 (Son)',
        preferredLanguage: 'bn',
        department: 'General Medicine',
        priority: 'Emergency Red-Flag',
        prioritySource: 'red_flag_system',
        status: 'queued'
      });

      await ConsultationNote.create({
        patientId: String(patient1._id),
        attendingDoctor: 'Dr. Arindam Banerjee (MD)',
        approvedClinicalSummary: '58yo male presents with acute crushing chest pain (8/10) and shortness of breath starting today.',
        clinicalImpression: 'Acute Coronary Syndrome, Essential Hypertension Stage 2',
        prescribedMedications: [
          { medicineName: 'Tab Sorbitrate 5mg', dosage: '1 tablet sublingually SOS for chest pain' },
          { medicineName: 'Tab Clopidogrel 75mg', dosage: '1 tablet once daily after breakfast' },
          { medicineName: 'Tab Atorvastatin 40mg', dosage: '1 tablet at bedtime' },
          { medicineName: 'Cap Amoxicillin 500mg', dosage: '1 capsule thrice daily x 5 days (Allergy Test)' }
        ],
        diagnosticOrders: ['12-Lead ECG Stat', 'Serum Troponin-I', 'Lipid Profile', 'Echocardiogram 2D'],
        signedAt: new Date()
      });

      await IntakeSession.create({
        sessionToken: 'KS-EMERG-001',
        kioskId: 'KIOSK-01',
        patientId: String(patient1._id),
        language: 'bn',
        consent: { medicalDataSharing: true, voiceRecording: true, consentTimestamp: new Date() },
        stepData: {
          demographics: { fullName: patient1.fullName, age: 58, gender: 'male', phone: '9830112233' },
          chiefComplaint: {
            selectedOptions: ['Chest Pain / Pressure', 'Shortness of Breath'],
            duration: 'less_than_1_day',
            freeTextDescription: 'Heavy crushing feeling in chest since this morning'
          },
          hpi: { onset: 'sudden', progression: 'worsening', severity: 8 },
          pastMedicalHistory: { selectedConditions: ['High Blood Pressure (Hypertension)', 'Diabetes (Sugar)'] },
          allergies: { selectedAllergies: ['Penicillin / Beta-Lactams Allergy (Severe Anaphylaxis Risk)'] },
          medicationHistory: { currentMeds: ['Daily BP / Diabetes Medications'] },
          familyHistory: { selectedFamilyConditions: ['Early Heart Disease / Stroke'] },
          personalHistory: { selectedHabits: ['Tobacco / Bidi / Cigarette Smoker'] }
        },
        redFlagCheck: {
          hasRedFlag: true,
          ruleId: 'RF-001',
          ruleName: 'Possible Acute Coronary Syndrome',
          severity: 'CRITICAL',
          patientAlertShown: true
        },
        aiSummary: {
          status: 'approved',
          isAiDrafted: true,
          draftText: '=== AI-DRAFTED SUMMARY — PENDING DOCTOR REVIEW ===\nPatient Rajesh Kumar Chatterjee (58M) presents with acute sudden chest pain (8/10) and shortness of breath starting today.\nRisk Factors: Hypertension, Diabetes, Smoker, Family history of early CAD.\nCRITICAL SAFETY NOTICE: Possible Acute Coronary Syndrome flag triggered.'
        },
        status: 'submitted'
      });

      // Sample second patient: Normal OPD
      const patient2 = await Patient.create({
        uhid: 'UHID-880124-15',
        tokenNumber: 'T-102',
        fullName: 'Sunita Devi Sharma',
        age: 42,
        gender: 'female',
        phone: '9876543210',
        emergencyContact: '9876543211 (Husband)',
        preferredLanguage: 'hi',
        department: 'General Medicine',
        priority: 'Normal',
        prioritySource: 'system',
        status: 'queued'
      });

      await ConsultationNote.create({
        patientId: String(patient2._id),
        attendingDoctor: 'Dr. Arindam Banerjee (MD)',
        approvedClinicalSummary: '42yo female presents with seasonal dry cough, low-grade fever and fatigue for 3 days.',
        clinicalImpression: 'Acute Upper Respiratory Tract Infection (URTI)',
        prescribedMedications: [
          { medicineName: 'Tab Paracetamol 650mg', dosage: '1 tablet TDS after meals x 3 days' },
          { medicineName: 'Tab Montelukast + Levocetirizine', dosage: '1 tablet once daily at bedtime x 5 days' },
          { medicineName: 'Syrup Ascoril-D', dosage: '10ml thrice daily with warm water' }
        ],
        diagnosticOrders: ['Complete Blood Count (CBC)'],
        signedAt: new Date()
      });

      await IntakeSession.create({
        sessionToken: 'KS-NORM-002',
        kioskId: 'KIOSK-01',
        patientId: String(patient2._id),
        language: 'hi',
        consent: { medicalDataSharing: true, voiceRecording: false, consentTimestamp: new Date() },
        stepData: {
          demographics: { fullName: patient2.fullName, age: 42, gender: 'female', phone: '9876543210' },
          chiefComplaint: {
            selectedOptions: ['Cough / Cold', 'Mild Fever'],
            duration: '1_to_3_days',
            freeTextDescription: 'Khasi aur bukhar 3 din se'
          },
          hpi: { onset: 'gradual', progression: 'improving', severity: 4 },
          pastMedicalHistory: { selectedConditions: ['No Prior Chronic Illnesses'] },
          allergies: { selectedAllergies: ['No Known Drug Allergies (NKDA)'] },
          medicationHistory: { currentMeds: ['None'] }
        },
        redFlagCheck: { hasRedFlag: false },
        aiSummary: {
          status: 'approved',
          isAiDrafted: true,
          draftText: '=== AI-DRAFTED SUMMARY — PENDING DOCTOR REVIEW ===\nPatient Sunita Devi Sharma (42F) presents with 3-day history of URI symptoms, dry cough and low-grade fever.'
        },
        status: 'submitted'
      });

      // Sample Initial Dispensation Record
      await DispensationRecord.create({
        patientId: String(patient2._id),
        uhid: patient2.uhid,
        tokenNumber: patient2.tokenNumber,
        patientName: patient2.fullName,
        doctorName: 'Dr. Arindam Banerjee (MD)',
        dispensedItems: [
          { medicineName: 'Tab Paracetamol 650mg (10 Tabs)', quantity: 10, unitPrice: 3.5, totalPrice: 35 },
          { medicineName: 'Tab Montelukast + Levocet (5 Tabs)', quantity: 5, unitPrice: 12, totalPrice: 60 },
          { medicineName: 'Syrup Ascoril-D 100ml', quantity: 1, unitPrice: 95, totalPrice: 95 }
        ],
        totalBillAmount: 190,
        dispensationStatus: 'dispensed',
        pharmacistName: 'Vikram Joshi (R.Ph)',
        dispensedAt: new Date(Date.now() - 30 * 60 * 1000)
      });
    }

    logger.info('Database seeding & sample consultation/pharmacy records verified.');
  } catch (err) {
    logger.error('Error during database seeding: ' + err.message);
  }
};

module.exports = seedDatabase;
