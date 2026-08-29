const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(authenticate, requireRole('staff', 'admin'));

router.get('/dashboard', staffController.getDashboard);
router.get('/ocr-verify', staffController.getOcrVerification);
router.get('/ocr-verify/:docId', staffController.getOcrVerification);
router.get('/assist', staffController.getAssistKiosk);
router.post('/register-patient', staffController.postRegisterPatient);
router.post('/acknowledge-red-flag', staffController.postAcknowledgeRedFlag);

module.exports = router;
