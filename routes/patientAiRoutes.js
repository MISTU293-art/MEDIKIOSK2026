const express = require('express');
const router = express.Router();
const PatientAiController = require('../controllers/patientAiController');
const { authenticatePatient } = require('../middleware/patientAuthMiddleware');

// All AI assistant routes require authenticated patient session
router.use(authenticatePatient);

router.get('/chat', PatientAiController.getChatStatus);
router.post('/chat', PatientAiController.postChat);
router.get('/conversations', PatientAiController.getConversations);
router.get('/conversations/:id', PatientAiController.getConversationById);
router.delete('/conversations/:id', PatientAiController.deleteConversation);
router.post('/voice', PatientAiController.postVoice);
router.get('/suggested-questions', PatientAiController.getSuggestedQuestions);

module.exports = router;
