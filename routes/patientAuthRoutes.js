const express = require('express');
const router = express.Router();
const PatientAuthController = require('../controllers/patientAuthController');
const { checkLoginRateLimit } = require('../middleware/patientAuthMiddleware');

router.get('/login', PatientAuthController.getLogin);
router.post('/login', checkLoginRateLimit, PatientAuthController.postLogin);
router.get('/register', PatientAuthController.getRegister);
router.post('/register', PatientAuthController.postRegister);
router.post('/quick-demo-login', PatientAuthController.quickDemoLogin);
router.get('/logout', PatientAuthController.logout);
router.post('/logout', PatientAuthController.logout);

module.exports = router;
