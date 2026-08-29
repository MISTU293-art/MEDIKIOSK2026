const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const upload = require('../middleware/uploadMiddleware');
const authenticate = require('../middleware/authMiddleware');

router.post('/upload', upload.single('document'), documentController.uploadDocument);
router.post('/verify', authenticate, documentController.verifyDocument);
router.post('/verify/:documentId', authenticate, documentController.verifyDocument);

module.exports = router;
