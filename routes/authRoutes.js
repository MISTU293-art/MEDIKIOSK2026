const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/securityMiddleware');
const authenticate = require('../middleware/authMiddleware');

router.get('/login', authController.getLogin);
router.post('/login', authLimiter, authController.postLogin);
router.post('/refresh-token', authController.refreshToken);
router.get('/logout', authController.logout);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
