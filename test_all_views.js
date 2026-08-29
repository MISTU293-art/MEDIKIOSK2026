const express = require('express');
const path = require('path');
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const questionBank = require('./utils/questionBanks.json');
const mockUser = { id: '1', name: 'Superadmin', email: 'admin@hospital.org', role: 'admin', department: 'Ayurveda' };
const mockPatient = { _id: '101', tokenNumber: 'AYUSH-101', uhid: 'UHID-101', fullName: 'Ramesh Sen', age: 45, gender: 'male', phone: '9988776655', department: 'Ayurveda (Kayachikitsa & Panchakarma)', priority: 'Normal', preferredLanguage: 'en', roomNumber: '104' };

const tests = [
  { name: 'kiosk/welcome', data: { title: 'Welcome', language: 'en', kiosk: { kioskId: 'KIOSK-01', name: 'Main Kiosk', location: 'Ground Floor' } } },
  { name: 'kiosk/index', data: { title: 'Index', language: 'en', kiosk: { kioskId: 'KIOSK-01', name: 'Main Kiosk', location: 'Ground Floor' } } },
  { name: 'kiosk/intake', data: { title: 'Intake', language: 'en', lang: 'en', sessionToken: 'KS-1234', kiosk: { kioskId: 'KIOSK-01', name: 'Main Kiosk', location: 'Ground Floor' }, kioskId: 'KIOSK-01', questionBank, strings: { repeatAudio: 'Audio Prompt', holdToSpeak: 'Hold to Speak', start: 'Start' }, voiceConsent: true } },
  { name: 'kiosk/upload', data: { title: 'Upload', lang: 'en', sessionToken: 'KS-1234', kiosk: { kioskId: 'KIOSK-01', name: 'Main Kiosk', location: 'Ground Floor' } } },
  { name: 'kiosk/patientCard', data: { title: 'Patient Card', patient: mockPatient, intake: { stepData: { chiefComplaint: { selectedOptions: ['Chest Pain'] } } } } },
  { name: 'auth/login', data: { title: 'Login', error: null, expired: false, redirect: '' } },
  { name: 'staff/dashboard', data: { title: 'Reception Desk', user: mockUser, patients: [mockPatient], activeAudits: [], unverifiedDocsCount: 0 } },
  { name: 'staff/ocrVerification', data: { title: 'OCR Tool', user: mockUser, pendingDocs: [], document: null } },
  { name: 'doctor/queue', data: { title: 'Doctor Queue', user: mockUser, patients: [mockPatient] } },
  { name: 'doctor/patientDetail', data: { title: 'Patient Detail', user: mockUser, patient: mockPatient, intake: null, documents: [] } },
  { name: 'pharmacy/index', data: { title: 'Pharmacy Desk', user: mockUser, recentDispensations: [], patients: [mockPatient], searchedPatient: mockPatient, consultation: null, aiSafety: null, aiExplanation: 'Dosage instructions', query: 'AYUSH-101' } },
  { name: 'admin/dashboard', data: { title: 'Admin Dashboard', user: mockUser, stats: { totalPatients: 1, totalRedFlags: 0, totalDocs: 0, verifiedDocs: 0, ocrAcceptanceRate: 0, avgIntakeTimeMinutes: '3.8', langCounts: { en: 1, hi: 0, bn: 0 } }, kiosks: [], recentPatients: [mockPatient] } },
  { name: 'admin/users', data: { title: 'Users', user: mockUser, users: [mockUser], departments: ['Ayurveda'], roles: { ADMIN: 'admin' } } },
  { name: 'admin/kiosks', data: { title: 'Kiosks', user: mockUser, kiosks: [] } },
  { name: 'admin/compliance', data: { title: 'Compliance', user: mockUser, audits: [] } },
  { name: 'admin/reports', data: { title: 'Reports', user: mockUser } },
  { name: 'admin/auditLogs', data: { title: 'Audit Logs', user: mockUser, logs: [] } },
  { name: 'admin/settings', data: { title: 'Settings', user: mockUser, settings: {}, success: false } }
];

let failed = 0;
let passed = 0;

tests.forEach(t => {
  app.render(t.name, t.data, (err, html) => {
    if (err) {
      console.error(`✗ FAILED: ${t.name} -> ${err.message}`);
      failed++;
    } else {
      console.log(`✓ PASSED: ${t.name} (${html.length} bytes)`);
      passed++;
    }
  });
});

setTimeout(() => {
  console.log(`\n================================`);
  console.log(`EJS VIEW COMPILE RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log(`================================`);
  process.exit(failed > 0 ? 1 : 0);
}, 500);
