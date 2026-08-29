const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(authenticate, requireRole('doctor', 'admin'));

router.get('/queue', doctorController.getQueue);
router.get('/patient/:patientId', doctorController.getPatientDetail);
router.post('/review-summary', doctorController.postReviewSummary);
router.post('/ai-suggest', doctorController.postAiAutoSuggest);
router.post('/save-consultation', doctorController.postSaveConsultation);

module.exports = router;
