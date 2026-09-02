const express = require('express');
const router = express.Router();
const controller = require('../controllers/operationsController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(authenticate);
router.get('/admin/attendance', requireRole('admin'), controller.getAttendance);
router.get('/attendance', requireRole('staff', 'doctor', 'pharmacist', 'admin'), controller.getAttendanceTerminal);
router.get('/staff/id-card', requireRole('staff', 'doctor', 'pharmacist', 'admin'), controller.getMyStaffCard);
router.post('/attendance/scan', requireRole('staff', 'doctor', 'pharmacist', 'admin'), controller.scanAttendance);
router.get('/beds', requireRole('staff', 'doctor', 'admin'), controller.getBeds);
router.get('/admin/beds', requireRole('admin'), controller.getBeds);
router.post('/beds/allocate', requireRole('staff', 'doctor', 'admin'), controller.allocateBed);
router.post('/beds/release', requireRole('staff', 'doctor', 'admin'), controller.releaseBed);
router.post('/beds/available', requireRole('staff', 'admin'), controller.markBedAvailable);
router.post('/admin/wards', requireRole('admin'), controller.createWard);
router.post('/admin/beds', requireRole('admin'), controller.createBed);
router.get('/admin/staff-cards', requireRole('admin'), controller.getStaffCards);
router.post('/admin/staff-cards/issue', requireRole('admin'), controller.issueStaffCard);
router.post('/admin/staff-cards/revoke', requireRole('admin'), controller.revokeStaffCard);
router.get('/admin/staff-cards/:cardId/print', requireRole('admin'), controller.getStaffCardPrint);

module.exports = router;