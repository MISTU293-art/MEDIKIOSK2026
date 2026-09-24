const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Patient = require('../models/Patient');
const PatientAccount = require('../models/PatientAccount');
const Report = require('../models/Report');
const Visit = require('../models/Visit');
const Document = require('../models/Document');
const PatientNotification = require('../models/PatientNotification');
const IntakeSession = require('../models/IntakeSession');
const RedFlagAudit = require('../models/RedFlagAudit');
const Kiosk = require('../models/Kiosk');
const ConsultationNote = require('../models/ConsultationNote');
const DispensationRecord = require('../models/DispensationRecord');
const logger = require('./logger');

const seedDatabase = async () => {
  try {
    // 1. Ensure Verified Institutional Users (Admin, Doctors, Staff, Pharmacist)
    if (!(await User.findOne({ email: 'admin@hospital.org' }))) {
      await User.create({
        name: 'Dr. Anand Verma (Medical Superintendent)',
        email: 'admin@hospital.org',
        password: 'admin123',
        role: 'admin',
        department: 'Hospital Administration'
      });
    }

    if (!(await User.findOne({ email: 'doctor@hospital.org' }))) {
      await User.create({
        name: 'Dr. Arindam Banerjee (MD, Internal Medicine)',
        email: 'doctor@hospital.org',
        password: 'doctor123',
        role: 'doctor',
        department: 'General Medicine'
      });
    }

    if (!(await User.findOne({ email: 'cardio@hospital.org' }))) {
      await User.create({
        name: 'Dr. Meera Sharma (MD, DM Cardiology)',
        email: 'cardio@hospital.org',
        password: 'doctor123',
        role: 'doctor',
        department: 'Cardiology'
      });
    }

    if (!(await User.findOne({ email: 'staff@hospital.org' }))) {
      await User.create({
        name: 'Priya Sen (OPD Reception Desk)',
        email: 'staff@hospital.org',
        password: 'staff123',
        role: 'staff',
        department: 'OPD Registration & Triage'
      });
    }

    if (!(await User.findOne({ email: 'pharmacy@hospital.org' }))) {
      await User.create({
        name: 'Vikram Joshi (Registered Pharmacist)',
        email: 'pharmacy@hospital.org',
        password: 'pharmacy123',
        role: 'staff',
        department: 'Hospital Pharmacy'
      });
    }

    // 2. Ensure Sample Demo Patients exist
    let patient1 = await Patient.findOne({ phone: '9830112233' });
    if (!patient1) {
      patient1 = await Patient.create({
        uhid: 'UHID-880124-12',
        cardNumber: 'MKC-880124',
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
    }

    // Patient 1 PatientAccount
    if (!(await PatientAccount.findOne({ patientId: String(patient1._id) }))) {
      await PatientAccount.create({
        patientId: String(patient1._id),
        uhid: patient1.uhid,
        cardNumber: patient1.cardNumber,
        mobile: patient1.phone,
        password: 'patient123',
        fullName: patient1.fullName,
        preferredLanguage: 'bn'
      });
    }

    // Patient 1 Consultation Note
    if (!(await ConsultationNote.findOne({ patientId: String(patient1._id) }))) {
      await ConsultationNote.create({
        patientId: String(patient1._id),
        attendingDoctor: 'Dr. Arindam Banerjee (MD)',
        doctorName: 'Dr. Arindam Banerjee (MD)',
        approvedClinicalSummary: '58yo male presents with acute crushing chest pain (8/10) and shortness of breath starting today.',
        clinicalImpression: 'Acute Coronary Syndrome, Essential Hypertension Stage 2',
        prescribedMedications: [
          { medicineName: 'Tab Sorbitrate 5mg', dosage: '1 tablet sublingually SOS for chest pain', frequency: 'SOS', duration: '5 days' },
          { medicineName: 'Tab Clopidogrel 75mg', dosage: '1 tablet once daily after breakfast', frequency: 'OD', duration: '30 days' },
          { medicineName: 'Tab Atorvastatin 40mg', dosage: '1 tablet at bedtime', frequency: 'HS', duration: '30 days' },
          { medicineName: 'Cap Amoxicillin 500mg', dosage: '1 capsule thrice daily x 5 days', frequency: 'TDS', duration: '5 days' }
        ],
        labOrders: ['12-Lead ECG Stat', 'Complete Blood Count (CBC)', 'Serum Troponin-I', 'Lipid Profile'],
        followUpDate: 'After 3 days',
        signedAt: new Date()
      });
    }

    // Patient 1 Visit
    if (!(await Visit.findOne({ patientId: String(patient1._id) }))) {
      await Visit.create({
        patientId: String(patient1._id),
        cardNumber: patient1.cardNumber || 'MKC-880124',
        tokenNumber: patient1.tokenNumber || 'T-101',
        department: 'General Medicine',
        assignedDoctorId: 'DOC-BAN-01',
        assignedDoctorName: 'Dr. Arindam Banerjee (MD)',
        chiefComplaint: 'Chest Pain / Pressure and Shortness of Breath',
        symptoms: 'Heavy crushing feeling in chest since this morning',
        status: 'completed',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      });
    }

    // Patient 1 Reports (CBC, Fasting Blood Sugar, Creatinine)
    if (!(await Report.findOne({ patientId: String(patient1._id) }))) {
      await Report.create({
        patientId: String(patient1._id),
        reportType: 'Complete Blood Count (CBC)',
        testName: 'Complete Blood Count (CBC)',
        requestedBy: 'Dr. Arindam Banerjee (MD)',
        priority: 'routine',
        status: 'reviewed',
        reviewNotes: 'Normal hematology profile. Hemoglobin at 13.2 g/dL, platelets within safe limits.',
        labValues: {
          'Hemoglobin': { value: 13.2, unit: 'g/dL', normalRange: '13.0 - 17.0 g/dL', status: 'Normal' },
          'WBC Count': { value: 7200, unit: '/µL', normalRange: '4,500 - 11,000 /µL', status: 'Normal' },
          'Platelets': { value: 250000, unit: '/µL', normalRange: '150,000 - 450,000 /µL', status: 'Normal' }
        },
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      });

      await Report.create({
        patientId: String(patient1._id),
        reportType: 'Blood Glucose Test',
        testName: 'Fasting Blood Sugar (FBS)',
        requestedBy: 'Dr. Arindam Banerjee (MD)',
        priority: 'routine',
        status: 'reviewed',
        reviewNotes: 'Fasting blood sugar 98 mg/dL. Normoglycemic control.',
        labValues: {
          'Fasting Blood Sugar': { value: 98, unit: 'mg/dL', normalRange: '70 - 100 mg/dL', status: 'Normal' }
        },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      });

      await Report.create({
        patientId: String(patient1._id),
        reportType: 'Renal Function Test',
        testName: 'Serum Creatinine',
        requestedBy: 'Dr. Arindam Banerjee (MD)',
        priority: 'routine',
        status: 'reviewed',
        reviewNotes: 'Normal renal function profile.',
        labValues: {
          'Serum Creatinine': { value: 0.9, unit: 'mg/dL', normalRange: '0.7 - 1.3 mg/dL', status: 'Normal' }
        },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      });
    }

    // Patient 1 Notifications
    if (!(await PatientNotification.findOne({ patientId: String(patient1._id) }))) {
      await PatientNotification.create({
        patientId: String(patient1._id),
        type: 'system',
        title: 'Welcome to MediKiosk Patient Portal',
        message: 'Your digital healthcare portal and AI Health Assistant are now active.',
        link: '/patient/dashboard'
      });
      await PatientNotification.create({
        patientId: String(patient1._id),
        type: 'report',
        title: 'New Medical Report Available',
        message: 'A new medical report is available in your MediKiosk account.',
        link: '/patient/reports'
      });
      await PatientNotification.create({
        patientId: String(patient1._id),
        type: 'consultation',
        title: 'Consultation Summary Recorded',
        message: 'Your doctor consultation summary from General Medicine has been documented.',
        link: '/patient/visits'
      });
    }

    // 3. Sample Second Patient: Sunita Devi Sharma
    let patient2 = await Patient.findOne({ phone: '9876543210' });
    if (!patient2) {
      patient2 = await Patient.create({
        uhid: 'UHID-880124-15',
        cardNumber: 'MKC-880125',
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
    }

    // Patient 2 PatientAccount
    if (!(await PatientAccount.findOne({ patientId: String(patient2._id) }))) {
      await PatientAccount.create({
        patientId: String(patient2._id),
        uhid: patient2.uhid,
        cardNumber: patient2.cardNumber,
        mobile: patient2.phone,
        password: 'patient123',
        fullName: patient2.fullName,
        preferredLanguage: 'hi'
      });
    }

    // Patient 2 Consultation Note
    if (!(await ConsultationNote.findOne({ patientId: String(patient2._id) }))) {
      await ConsultationNote.create({
        patientId: String(patient2._id),
        attendingDoctor: 'Dr. Arindam Banerjee (MD)',
        doctorName: 'Dr. Arindam Banerjee (MD)',
        approvedClinicalSummary: '42yo female presents with seasonal dry cough, low-grade fever and fatigue for 3 days.',
        clinicalImpression: 'Acute Upper Respiratory Tract Infection (URTI)',
        prescribedMedications: [
          { medicineName: 'Tab Paracetamol 650mg', dosage: '1 tablet TDS after meals x 3 days', frequency: 'TDS', duration: '3 days' },
          { medicineName: 'Tab Montelukast + Levocetirizine', dosage: '1 tablet once daily at bedtime x 5 days', frequency: 'OD', duration: '5 days' },
          { medicineName: 'Syrup Ascoril-D', dosage: '10ml thrice daily with warm water', frequency: 'TDS', duration: '5 days' }
        ],
        labOrders: ['Complete Blood Count (CBC)'],
        followUpDate: 'Review after 5 days',
        signedAt: new Date()
      });
    }

    // Patient 2 Visit
    if (!(await Visit.findOne({ patientId: String(patient2._id) }))) {
      await Visit.create({
        patientId: String(patient2._id),
        cardNumber: patient2.cardNumber || 'MKC-880125',
        tokenNumber: patient2.tokenNumber || 'T-102',
        department: 'General Medicine',
        assignedDoctorId: 'DOC-BAN-01',
        assignedDoctorName: 'Dr. Arindam Banerjee (MD)',
        chiefComplaint: 'Cough / Cold and Mild Fever',
        symptoms: 'Seasonal dry cough and fever for 3 days',
        status: 'completed',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      });
    }

    // Patient 2 Reports
    if (!(await Report.findOne({ patientId: String(patient2._id) }))) {
      await Report.create({
        patientId: String(patient2._id),
        reportType: 'Complete Blood Count (CBC)',
        testName: 'Complete Blood Count (CBC)',
        requestedBy: 'Dr. Arindam Banerjee (MD)',
        priority: 'routine',
        status: 'reviewed',
        reviewNotes: 'Normal white blood cell count and platelet profile.',
        labValues: {
          'Hemoglobin': { value: 12.8, unit: 'g/dL', normalRange: '12.0 - 15.5 g/dL', status: 'Normal' },
          'WBC Count': { value: 6800, unit: '/µL', normalRange: '4,500 - 11,000 /µL', status: 'Normal' },
          'Platelets': { value: 240000, unit: '/µL', normalRange: '150,000 - 450,000 /µL', status: 'Normal' }
        },
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      });
    }

    // Patient 2 Notifications
    if (!(await PatientNotification.findOne({ patientId: String(patient2._id) }))) {
      await PatientNotification.create({
        patientId: String(patient2._id),
        type: 'prescription',
        title: 'New Prescription Issued',
        message: 'A new prescription has been recorded in your MediKiosk account.',
        link: '/patient/prescriptions'
      });
    }

    logger.info('Database seeding: Verified users, demo patients, accounts, and clinical reports.');
  } catch (err) {
    logger.error('Error during database seeding: ' + err.message);
  }
};

module.exports = seedDatabase;
