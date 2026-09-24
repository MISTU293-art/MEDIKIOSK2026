require('dotenv').config();
const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const jwt = require('jsonwebtoken');

const { connectDB } = require('../config/db');
const seedDatabase = require('../utils/seedData');
const Patient = require('../models/Patient');
const PatientAccount = require('../models/PatientAccount');

// Import routes
const authRoutes = require('../routes/authRoutes');
const kioskRoutes = require('../routes/kioskRoutes');
const staffRoutes = require('../routes/staffRoutes');
const doctorRoutes = require('../routes/doctorRoutes');
const adminRoutes = require('../routes/adminRoutes');
const pharmacyRoutes = require('../routes/pharmacyRoutes');
const documentRoutes = require('../routes/documentRoutes');
const syncRoutes = require('../routes/syncRoutes');
const patientAuthRoutes = require('../routes/patientAuthRoutes');
const patientPortalRoutes = require('../routes/patientPortalRoutes');
const patientAiRoutes = require('../routes/patientAiRoutes');
const patientApiRoutes = require('../routes/patientApiRoutes');
const operationsRoutes = require('../routes/operationsRoutes');

async function testAllLinks() {
  console.log('==================================================');
  console.log('STARTING COMPLETE HTTP LINK & ROUTE VERIFICATION');
  console.log('==================================================');

  await connectDB();
  await seedDatabase();

  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));

  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/', (req, res) => res.redirect('/kiosk'));
  app.use('/auth', authRoutes);
  app.use('/kiosk', kioskRoutes);
  app.use('/staff', staffRoutes);
  app.use('/doctor', doctorRoutes);
  app.use('/admin', adminRoutes);
  app.use('/pharmacy', pharmacyRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/sync', syncRoutes);
  app.use('/patient', patientAuthRoutes);
  app.use('/patient', patientPortalRoutes);
  app.use('/patient/ai', patientAiRoutes);
  app.use('/api/patient', patientApiRoutes);
  app.use('/', operationsRoutes);

  // Error handling
  app.use((err, req, res, next) => {
    console.error('App error on route ' + req.url + ':', err);
    res.status(500).send('Error: ' + err.message);
  });

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Test server active on ephemeral port: ${port}`);

  // Obtain patient auth cookie
  const patient = await Patient.findOne({ phone: '9830112233' });
  const account = await PatientAccount.findOne({ patientId: String(patient._id) });

  const { JWT_ACCESS_SECRET } = require('../config/auth');

  const patientToken = jwt.sign(
    {
      patientId: String(patient._id),
      accountId: String(account._id),
      uhid: patient.uhid,
      cardNumber: patient.cardNumber,
      mobile: patient.phone,
      fullName: patient.fullName,
      preferredLanguage: 'en',
      role: 'patient'
    },
    JWT_ACCESS_SECRET,
    { expiresIn: '7d' }
  );

  const patientCookie = `medikiosk_patient_token=${patientToken}`;

  const routesToTest = [
    { url: '/', expectStatus: 302 },
    { url: '/kiosk', expectStatus: 200 },
    { url: '/kiosk/intake?lang=en', expectStatus: 200 },
    { url: '/kiosk/summary', expectStatus: 200 },
    { url: `/kiosk/card/${patient._id}`, expectStatus: 200 },
    { url: '/kiosk/emergency', expectStatus: 200 },
    { url: '/auth/login', expectStatus: 200 },
    { url: '/patient/login', expectStatus: 200 },
    { url: '/patient/register', expectStatus: 200 },
    { url: '/patient/dashboard', cookie: patientCookie, expectStatus: 200 },
    { url: '/patient/card', cookie: patientCookie, expectStatus: 200 },
    { url: '/patient/visits', cookie: patientCookie, expectStatus: 200 },
    { url: '/patient/reports', cookie: patientCookie, expectStatus: 200 },
    { url: '/patient/prescriptions', cookie: patientCookie, expectStatus: 200 },
    { url: '/patient/medicines', cookie: patientCookie, expectStatus: 200 },
    { url: '/patient/labs', cookie: patientCookie, expectStatus: 200 },
    { url: '/patient/documents', cookie: patientCookie, expectStatus: 200 },
    { url: '/patient/timeline', cookie: patientCookie, expectStatus: 200 },
    { url: '/patient/allergies', cookie: patientCookie, expectStatus: 200 },
    { url: '/patient/chat', cookie: patientCookie, expectStatus: 200 },
    { url: '/patient/profile', cookie: patientCookie, expectStatus: 200 },
    { url: '/manifest.json', expectStatus: 200 },
    { url: '/sw.js', expectStatus: 200 },
    { url: '/js/seniorMode.js', expectStatus: 200 }
  ];

  let passed = 0;
  let failed = 0;

  for (const item of routesToTest) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}${item.url}`, {
        headers: item.cookie ? { Cookie: item.cookie } : {},
        redirect: 'manual'
      });

      if (res.status === item.expectStatus) {
        console.log(`✓ PASS: ${item.url} -> Status ${res.status}`);
        passed++;
      } else {
        console.error(`✗ FAIL: ${item.url} -> Expected ${item.expectStatus}, got ${res.status}`);
        failed++;
      }
    } catch (fetchErr) {
      console.error(`✗ ERROR: ${item.url} -> ${fetchErr.message}`);
      failed++;
    }
  }

  server.close();
  console.log('\n==================================================');
  console.log(`TOTAL HTTP ROUTE TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

testAllLinks().catch(err => {
  console.error('Fatal link test failure:', err);
  process.exit(1);
});
