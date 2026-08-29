const http = require('http');

let cookies = {};

function request(method, path, body = null, authRole = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {};
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (authRole && cookies[authRole]) {
      headers['Cookie'] = cookies[authRole];
    }

    const req = http.request(`http://localhost:3000${path}`, {
      method,
      headers
    }, (res) => {
      let data = '';
      if (res.headers['set-cookie']) {
        const cookieStr = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        if (authRole) cookies[authRole] = cookieStr;
      }
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runComprehensiveTests() {
  console.log('====================================================');
  console.log('STARTING FULL 33-POINT MEDIKIOSK & AI COPILOT TEST SUITE');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  async function assert(name, fn) {
    try {
      await fn();
      console.log(`✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ FAIL: ${name} -> ${err.message}`);
      failed++;
    }
  }

  // 1. Public Kiosk Routes
  await assert('1. GET /kiosk (Welcome)', async () => {
    const res = await request('GET', '/kiosk');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('2. GET /kiosk/intake?lang=en', async () => {
    const res = await request('GET', '/kiosk/intake?lang=en');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('3. GET /kiosk/intake?lang=hi', async () => {
    const res = await request('GET', '/kiosk/intake?lang=hi');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('4. GET /kiosk/intake?lang=bn', async () => {
    const res = await request('GET', '/kiosk/intake?lang=bn');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('5. GET /kiosk/upload (ImageKit Scanner)', async () => {
    const res = await request('GET', '/kiosk/upload?lang=en');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  let createdPatientId = null;
  const uniqueToken = 'KS-TEST-' + Date.now() + '-' + Math.floor(Math.random()*1000);
  await assert('6. POST /kiosk/submit (Intake submission & card generation)', async () => {
    const res = await request('POST', '/kiosk/submit', {
      sessionToken: uniqueToken,
      kioskId: 'KIOSK-01',
      language: 'en',
      consent: { medicalDataSharing: true, voiceRecording: false },
      stepData: {
        demographics: { fullName: 'AI Copilot Test Patient', age: 55, gender: 'female', phone: '9831998877', aadhaarNumber: 'XXXX-XXXX-9988', abhaId: '91-9988-7766-5544', preferredDepartment: 'Ayurveda (Kayachikitsa & Panchakarma)' },
        chiefComplaint: { selectedOptions: ['Joint Pain / Arthritis'], duration: '1_to_3_days' }
      }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (!json.success || !json.patientId) throw new Error('Missing patientId in response');
    createdPatientId = json.patientId;
  });

  await assert('7. GET /kiosk/card/:patientId', async () => {
    const res = await request('GET', `/kiosk/card/${createdPatientId}`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.body.includes('AI Copilot Test Patient')) throw new Error('Patient name not found in rendered card');
    if (!res.body.includes('AI Health Compass')) throw new Error('AI Health Compass missing in card');
  });

  await assert('8. POST /kiosk/ayushman-lookup (Recognized existing patient)', async () => {
    const res = await request('POST', '/kiosk/ayushman-lookup', { identifier: '9831998877' });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (!json.alreadyRegistered) throw new Error('Expected patient to be recognized as already registered');
    if (!json.tokenNumber) throw new Error('Expected today token number to be generated');
  });

  // 2. Authentication
  await assert('9. POST /auth/login (Staff)', async () => {
    const res = await request('POST', '/auth/login', { email: 'staff@hospital.org', password: 'staff123' }, 'staff');
    if (res.status !== 302 && res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('10. POST /auth/login (Doctor)', async () => {
    const res = await request('POST', '/auth/login', { email: 'doctor@hospital.org', password: 'doctor123' }, 'doctor');
    if (res.status !== 302 && res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('11. POST /auth/login (Superadmin)', async () => {
    const res = await request('POST', '/auth/login', { email: 'admin@hospital.org', password: 'admin123' }, 'admin');
    if (res.status !== 302 && res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('12. POST /auth/login (Pharmacist)', async () => {
    const res = await request('POST', '/auth/login', { email: 'pharmacy@hospital.org', password: 'pharmacy123' }, 'pharmacist');
    if (res.status !== 302 && res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  // 3. Staff Portal
  await assert('13. GET /staff/dashboard', async () => {
    const res = await request('GET', '/staff/dashboard', null, 'staff');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('14. POST /staff/register-patient (With Aadhaar & Ayushman)', async () => {
    const res = await request('POST', '/staff/register-patient', {
      fullName: 'Sunil Gavaskar',
      age: 62,
      gender: 'male',
      phone: '9876543210',
      aadhaarNumber: 'XXXX-XXXX-7788',
      abhaId: '91-7788-9900-1122',
      department: 'Ayurveda (Kayachikitsa & Panchakarma)',
      priority: 'Normal'
    }, 'staff');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (!json.success || !json.patient) throw new Error('Failed to register patient via staff');
  });

  await assert('15. GET /staff/ocr-verify', async () => {
    const res = await request('GET', '/staff/ocr-verify', null, 'staff');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  // 4. Doctor Clinical Copilot
  await assert('16. GET /doctor/queue', async () => {
    const res = await request('GET', '/doctor/queue', null, 'doctor');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('17. GET /doctor/patient/:id (With AI Copilot Auto-Suggestions)', async () => {
    const res = await request('GET', `/doctor/patient/${createdPatientId}`, null, 'doctor');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.body.includes('AI Clinical Auto-Suggestion')) throw new Error('AI Clinical Auto-Suggestion card missing in doctor patient 360');
  });

  await assert('18. POST /doctor/ai-suggest (Live AI Auto-Suggestion API)', async () => {
    const res = await request('POST', '/doctor/ai-suggest', {
      chiefComplaint: { selectedOptions: ['Joint Pain / Arthritis'], duration: '1_to_3_days' },
      prakriti: 'Vata-Pitta Prakriti',
      age: 55,
      gender: 'female'
    }, 'doctor');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (!json.suggestedImpression || !json.suggestedPrescriptionsText) throw new Error('Invalid AI suggestions returned');
  });

  await assert('19. POST /doctor/save-consultation', async () => {
    const res = await request('POST', '/doctor/save-consultation', {
      patientId: createdPatientId,
      approvedSummary: 'Approved clinical record for Sandhivata',
      clinicalImpression: 'Sandhivata (Osteoarthritis of Knees)',
      prescribedMedications: [{ medicineName: 'Tab Yogaraj Guggulu - 2 Tab BD' }],
      labOrders: ['Stat Serum Uric Acid'],
      followUpDate: 'After 7 days'
    }, 'doctor');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (!json.success) throw new Error('Failed to save consultation note');
  });

  // 5. Medicine Shop / Pharmacy
  await assert('20. GET /pharmacy', async () => {
    const res = await request('GET', '/pharmacy', null, 'pharmacist');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('21. GET /pharmacy/lookup (Patient search)', async () => {
    const res = await request('GET', `/pharmacy/lookup?search=AI%20Copilot`, null, 'pharmacist');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('22. POST /pharmacy/dispense', async () => {
    const res = await request('POST', '/pharmacy/dispense', {
      patientId: createdPatientId,
      notes: 'Dispensed Yogaraj Guggulu with warm water instructions.',
      totalAmount: 180,
      discountAmount: 20,
      netPayable: 160
    }, 'pharmacist');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (!json.success) throw new Error('Failed to dispense medication');
  });

  // 6. Superadmin Master Suite
  await assert('23. GET /admin/dashboard', async () => {
    const res = await request('GET', '/admin/dashboard', null, 'admin');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('24. GET /admin/reports', async () => {
    const res = await request('GET', '/admin/reports', null, 'admin');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('25. GET /admin/audit-logs', async () => {
    const res = await request('GET', '/admin/audit-logs', null, 'admin');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('26. GET /admin/settings', async () => {
    const res = await request('GET', '/admin/settings', null, 'admin');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('27. POST /admin/settings (Update AI/ImageKit params)', async () => {
    const res = await request('POST', '/admin/settings', {
      hospital_name: 'National AYUSH Institute Demo Hospital',
      ai_model_provider: 'gemini-1.5-flash',
      ai_temperature: '0.3',
      imagekit_url_endpoint: 'https://ik.imagekit.io/medikiosk_ayush_verified',
      speech_rate: '1.0'
    }, 'admin');
    if (res.status !== 302 && res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('28. GET /admin/users', async () => {
    const res = await request('GET', '/admin/users', null, 'admin');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('29. GET /admin/kiosks', async () => {
    const res = await request('GET', '/admin/kiosks', null, 'admin');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('30. GET /admin/compliance', async () => {
    const res = await request('GET', '/admin/compliance', null, 'admin');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await assert('31. POST /admin/patient/override-priority', async () => {
    const res = await request('POST', '/admin/patient/override-priority', {
      patientId: createdPatientId,
      newPriority: 'Urgent'
    }, 'admin');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (!json.success) throw new Error('Failed to override priority');
  });

  await assert('32. GET /admin/export-intakes (CSV Export)', async () => {
    const res = await request('GET', '/admin/export-intakes', null, 'admin');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.body.includes('Token') || !res.body.includes('UHID')) throw new Error('Invalid CSV header generated');
  });

  await assert('33. GET /api/health', async () => {
    const res = await request('GET', '/api/health');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (json.status !== 'healthy') throw new Error('Expected status healthy');
  });

  console.log('\n====================================================');
  console.log(`FULL SUITE EXECUTION FINISHED: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

runComprehensiveTests();
