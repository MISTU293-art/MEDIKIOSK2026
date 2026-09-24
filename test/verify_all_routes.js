const express = require('express');

// We will mount all routers as server.js does and inspect router stack
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

const app = express();
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

function getAppRoutes(app) {
  const routes = [];
  function print(path, layer) {
    if (layer.route) {
      routes.push({ path: path + (path.endsWith('/') ? '' : '') + layer.route.path, methods: Object.keys(layer.route.methods) });
    } else if (layer.name === 'router' && layer.handle.stack) {
      let routerPath = '';
      if (layer.regexp.source !== '^\\/?(?=\\/|$)') {
        const match = layer.regexp.source.match(/^\^\\\/([a-zA-Z0-9_\-\/]+)\\\//);
        if (match) routerPath = '/' + match[1];
      }
      layer.handle.stack.forEach(l => print(routerPath, l));
    }
  }
  app._router.stack.forEach(l => print('', l));
  return routes;
}

const registered = getAppRoutes(app);
console.log('Total registered routes:', registered.length);

const linksToCheck = [
  '/',
  '/admin/attendance',
  '/admin/audit-logs',
  '/admin/beds',
  '/admin/compliance',
  '/admin/dashboard',
  '/admin/export-intakes',
  '/admin/kiosks',
  '/admin/kiosks/create',
  '/admin/patients',
  '/admin/patients/export.xlsx',
  '/admin/reports',
  '/admin/settings',
  '/admin/staff-cards',
  '/admin/users',
  '/admin/users/create',
  '/admin/users/toggle-status',
  '/attendance',
  '/auth/login',
  '/auth/logout',
  '/beds',
  '/doctor/queue',
  '/doctor/reports',
  '/kiosk',
  '/kiosk/emergency',
  '/kiosk/intake',
  '/kiosk/summary',
  '/patient/allergies',
  '/patient/card',
  '/patient/chat',
  '/patient/dashboard',
  '/patient/documents',
  '/patient/labs',
  '/patient/login',
  '/patient/logout',
  '/patient/medicines',
  '/patient/prescriptions',
  '/patient/profile',
  '/patient/quick-demo-login',
  '/patient/register',
  '/patient/reports',
  '/patient/timeline',
  '/patient/visits',
  '/pharmacy',
  '/pharmacy/dispense',
  '/pharmacy/lookup',
  '/staff/assist',
  '/staff/dashboard',
  '/staff/id-card',
  '/staff/ocr-verify',
  '/staff/register-patient'
];

let missing = [];
for (const link of linksToCheck) {
  // Check if any registered route matches
  const match = registered.find(r => {
    const full = (r.path || '').replace('//', '/');
    if (full === link) return true;
    // regex pattern matching like /:id
    const pattern = '^' + full.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
    return new RegExp(pattern).test(link);
  });
  if (!match) {
    missing.push(link);
  }
}

console.log('Unmatched / potentially broken routes:', missing);
