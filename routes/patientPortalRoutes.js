const express = require('express');
const router = express.Router();
const PatientPortalController = require('../controllers/patientPortalController');
const { authenticatePatient } = require('../middleware/patientAuthMiddleware');

// All portal views require authenticated patient session
router.use(authenticatePatient);

router.get('/dashboard', PatientPortalController.getDashboard);
router.get('/card', PatientPortalController.getCard);
router.get('/visits', PatientPortalController.getVisits);
router.get('/visits/:id', PatientPortalController.getVisitDetail);
router.get('/reports', PatientPortalController.getReports);
router.get('/prescriptions', PatientPortalController.getPrescriptions);
router.get('/medicines', PatientPortalController.getMedicines);
router.get('/allergies', PatientPortalController.getAllergies);
router.get('/timeline', PatientPortalController.getTimeline);
router.get('/documents', PatientPortalController.getDocuments);
router.get('/labs', PatientPortalController.getLabs);
router.get('/chat', PatientPortalController.getChat);
router.get('/profile', PatientPortalController.getProfile);

module.exports = router;
