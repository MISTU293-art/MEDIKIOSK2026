const express = require('express');
const router = express.Router();
const PatientApiController = require('../controllers/patientApiController');
const { authenticatePatient } = require('../middleware/patientAuthMiddleware');

// All /api/patient/me endpoints require patient authentication
router.use(authenticatePatient);

router.get('/me', PatientApiController.getMe);
router.get('/me/card', PatientApiController.getCard);
router.get('/me/visits', PatientApiController.getVisits);
router.get('/me/visits/:id', PatientApiController.getVisitById);
router.get('/me/reports', PatientApiController.getReports);
router.get('/me/reports/:id/explain', PatientApiController.explainReport);
router.get('/me/reports/:id/download', PatientApiController.downloadReport);
router.get('/me/prescriptions', PatientApiController.getPrescriptions);
router.get('/me/medicines', PatientApiController.getMedicines);
router.get('/me/allergies', PatientApiController.getAllergies);
router.get('/me/documents', PatientApiController.getDocuments);
router.get('/me/documents/:id/download', PatientApiController.downloadDocument);
router.post('/me/documents/upload', PatientApiController.uploadDocument);
router.get('/me/timeline', PatientApiController.getTimeline);
router.get('/me/labs', PatientApiController.getLabs);
router.get('/me/consents', PatientApiController.getConsents);
router.get('/me/notifications', PatientApiController.getNotifications);
router.post('/me/notifications/:id/read', PatientApiController.markNotificationRead);
router.post('/me/language', PatientApiController.updateLanguage);

module.exports = router;
