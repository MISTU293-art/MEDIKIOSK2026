const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

router.post('/batch', syncController.syncQueue);
router.post('/heartbeat', syncController.heartbeat);

module.exports = router;
