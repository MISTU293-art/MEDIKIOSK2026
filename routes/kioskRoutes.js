const express = require('express');
const router = express.Router();
const kioskController = require('../controllers/kioskController');

router.get('/', kioskController.getWelcome);
router.get('/intake', kioskController.getIntakeWizard);
router.get('/upload', kioskController.getUpload);
router.get('/card/:patientId', kioskController.getPatientCard);
router.post('/ayushman-lookup', kioskController.postAyushmanLookup);
router.post('/submit', kioskController.postSubmitIntake);

module.exports = router;
