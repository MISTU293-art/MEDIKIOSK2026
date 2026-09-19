const express = require("express");
const router = express.Router();
const kioskController = require("../controllers/kioskController");

router.get("/", kioskController.getWelcome);
router.get("/intake", kioskController.getIntakeWizard);
router.get("/upload", kioskController.getUpload);
router.get("/card/:patientId", kioskController.getPatientCard);
router.post("/ayushman-lookup", kioskController.postAyushmanLookup);
router.post("/assistant", kioskController.postAssistant);
router.post("/submit", kioskController.postSubmitIntake);

// Show emergency registration page
router.get("/emergency", kioskController.getEmergency);

// Submit emergency patient
router.post("/emergency", kioskController.emergencyPatientData);

module.exports = router;
