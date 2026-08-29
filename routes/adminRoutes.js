const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(authenticate, requireRole('admin'));

router.get('/dashboard', adminController.getDashboard);
router.get('/reports', adminController.getReports);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/settings', adminController.getSettings);
router.post('/settings', adminController.postUpdateSettings);
router.get('/users', adminController.getUsers);
router.post('/users/create', adminController.postCreateUser);
router.post('/users/toggle-status', adminController.postToggleUserStatus);
router.get('/kiosks', adminController.getKiosks);
router.post('/kiosks/create', adminController.postCreateKiosk);
router.post('/patient/override-priority', adminController.postOverridePriority);
router.get('/compliance', adminController.getCompliance);
router.get('/export-intakes', adminController.getExportIntakes);

module.exports = router;
