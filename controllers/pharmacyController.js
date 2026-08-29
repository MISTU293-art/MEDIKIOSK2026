const Patient = require('../models/Patient');
const IntakeSession = require('../models/IntakeSession');
const ConsultationNote = require('../models/ConsultationNote');
const DispensationRecord = require('../models/DispensationRecord');
const AiMedicalIntelligenceService = require('../services/aiMedicalIntelligenceService');
const logger = require('../utils/logger');

exports.getPharmacyPortal = async (req, res) => {
  try {
    const recentDispensations = await DispensationRecord.find({});
    const patients = await Patient.find({});

    res.render('pharmacy/index', {
      title: 'Medicine Shop & Pharmacy Dispensation Hub — MediKiosk',
      user: req.user,
      recentDispensations: recentDispensations.slice(0, 15),
      patients: patients.slice(0, 10),
      searchedPatient: null,
      consultation: null,
      aiSafety: null
    });
  } catch (err) {
    logger.error('Pharmacy dashboard error: ' + err.message);
    res.status(500).send('Error loading pharmacy portal');
  }
};

exports.lookupPatient = async (req, res) => {
  try {
    const query = (req.query.search || req.body.search || '').trim();
    if (!query) {
      return res.redirect('/pharmacy');
    }

    // Lookup patient by TokenNumber, UHID, or ID
    const allPatients = await Patient.find({});
    const patient = allPatients.find(p => 
      p.tokenNumber.toLowerCase() === query.toLowerCase() ||
      p.uhid.toLowerCase() === query.toLowerCase() ||
      String(p._id) === query ||
      p.phone === query ||
      p.fullName.toLowerCase().includes(query.toLowerCase())
    );

    if (!patient) {
      const recentDispensations = await DispensationRecord.find({});
      return res.render('pharmacy/index', {
        title: 'Medicine Shop & Pharmacy — MediKiosk',
        user: req.user,
        recentDispensations: recentDispensations.slice(0, 15),
        patients: allPatients.slice(0, 10),
        searchedPatient: null,
        consultation: null,
        aiSafety: null,
        error: `No patient found matching '${query}'. Please verify the Token Number or UHID.`
      });
    }

    // Lookup patient's doctor consultation notes
    const consultationNotes = await ConsultationNote.find({ patientId: String(patient._id) });
    const latestConsultation = consultationNotes.length > 0 ? consultationNotes[0] : null;

    // Lookup patient's recorded allergies and history from intake
    const intake = await IntakeSession.findOne({ patientId: String(patient._id) });
    const allergies = intake?.stepData?.allergies?.selectedAllergies || [];
    const history = intake?.stepData?.pastMedicalHistory?.selectedConditions || [];

    // Run AI Drug Safety & Interaction Check
    const prescribedMeds = latestConsultation?.prescribedMedications || [];
    const aiSafety = AiMedicalIntelligenceService.evaluatePharmacyDrugSafety(prescribedMeds, allergies, history);
    const aiExplanation = AiMedicalIntelligenceService.generatePatientFriendlyExplanation(prescribedMeds, patient.preferredLanguage || 'en');

    const recentDispensations = await DispensationRecord.find({});

    res.render('pharmacy/index', {
      title: `Pharmacy Dispensation: ${patient.fullName} (${patient.tokenNumber})`,
      user: req.user,
      recentDispensations: recentDispensations.slice(0, 15),
      patients: allPatients.slice(0, 10),
      searchedPatient: patient,
      consultation: latestConsultation,
      intake,
      allergies,
      aiSafety,
      aiExplanation,
      query
    });
  } catch (err) {
    logger.error('Pharmacy lookup error: ' + err.message);
    res.status(500).send('Error searching patient record');
  }
};

exports.postDispense = async (req, res) => {
  try {
    const { patientId, uhid, patientName, doctorName, items = [], totalAmount = 0 } = req.body;

    const record = await DispensationRecord.create({
      patientId,
      uhid,
      patientName,
      doctorName: doctorName || 'Attending Physician',
      dispensedItems: Array.isArray(items) ? items : [items],
      totalBillAmount: parseFloat(totalAmount) || 0,
      dispensationStatus: 'dispensed',
      pharmacistName: req.user ? req.user.name : 'Pharmacist'
    });

    logger.audit('PHARMACY_DISPENSED', req.user ? req.user.email : 'system', { uhid, bill: totalAmount });
    return res.json({ success: true, recordId: record._id });
  } catch (err) {
    logger.error('Dispensation error: ' + err.message);
    return res.status(500).json({ success: false, error: 'Failed to record dispensation.' });
  }
};
