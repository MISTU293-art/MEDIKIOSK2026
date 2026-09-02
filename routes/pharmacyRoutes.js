const express = require('express');
const router = express.Router();
const pharmacyController = require('../controllers/pharmacyController');
const authenticate = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', pharmacyController.getPharmacyPortal);
router.get('/lookup', pharmacyController.lookupPatient);
router.post('/lookup', pharmacyController.lookupPatient);
router.post('/dispense', pharmacyController.postDispense);
router.post('/inventory', pharmacyController.postCreateInventoryItem);
router.post('/inventory/adjust', pharmacyController.postAdjustInventory);
router.post('/inventory/receive', pharmacyController.postReceiveStock);

module.exports = router;
