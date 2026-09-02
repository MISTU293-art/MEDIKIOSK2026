const Patient = require('../models/Patient');
const IntakeSession = require('../models/IntakeSession');
const ConsultationNote = require('../models/ConsultationNote');
const DispensationRecord = require('../models/DispensationRecord');
const AiMedicalIntelligenceService = require('../services/aiMedicalIntelligenceService');
const logger = require('../utils/logger');
const InventoryItem = require('../models/InventoryItem');
const InventoryReceipt = require('../models/InventoryReceipt');
const { normalizePhone, normalizeIdentifier } = require('../utils/patientRegistry');

exports.getPharmacyPortal = async (req, res) => {
  try {
    const recentDispensations = await DispensationRecord.find({});
    const patients = await Patient.find({});
    const inventory = await InventoryItem.find({});
    const receipts = await InventoryReceipt.find({});

    res.render('pharmacy/index', {
      title: 'Medicine Shop & Pharmacy Dispensation Hub — MediKiosk',
      user: req.user,
      recentDispensations: recentDispensations.slice(0, 15),
      patients: patients.slice(0, 10),
      searchedPatient: null,
      consultation: null,
      aiSafety: null
      , inventory, receipts
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
      normalizeIdentifier(p.tokenNumber) === normalizeIdentifier(query) ||
      normalizeIdentifier(p.cardNumber) === normalizeIdentifier(query) ||
      normalizeIdentifier(p.uhid) === normalizeIdentifier(query) ||
      String(p._id) === query ||
      normalizePhone(p.phone) === normalizePhone(query) ||
      String(p.fullName || '').toLowerCase().includes(query.toLowerCase())
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
    const allergies = [...(intake?.stepData?.allergies?.selectedAllergies || []), ...(patient.allergies ? [patient.allergies] : [])];
    const history = [...(intake?.stepData?.pastMedicalHistory?.selectedConditions || []), ...(patient.medicalHistory ? [patient.medicalHistory] : [])];

    // Run AI Drug Safety & Interaction Check
    const prescribedMeds = latestConsultation?.prescribedMedications || [];
    const safety = AiMedicalIntelligenceService.evaluatePharmacyDrugSafety(prescribedMeds, allergies, history);
    const aiSafety = { ...safety, status: safety.safetyStatus === 'SAFE_TO_DISPENSE' ? 'SAFE' : 'UNSAFE', contraindications: (safety.flags || []).map(flag => ({ ...flag, warning: `${flag.title}: ${flag.description}` })) };
    const aiExplanation = AiMedicalIntelligenceService.generatePatientFriendlyExplanation(prescribedMeds, patient.preferredLanguage || 'en');

    const recentDispensations = await DispensationRecord.find({});
    const inventory = await InventoryItem.find({});
    const receipts = await InventoryReceipt.find({});

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
      , inventory, receipts
    });
  } catch (err) {
    logger.error('Pharmacy lookup error: ' + err.message);
    res.status(500).send('Error searching patient record');
  }
};

exports.postReceiveStock = async (req, res) => {
  const { name, batchNumber, quantity, supplier, invoiceNumber, vehicleNumber, deliveryPerson, expiryDate, unitPrice, notes } = req.body;
  const receivedQuantity = Number(quantity);
  if (!String(name || '').trim() || !String(batchNumber || '').trim() || !Number.isInteger(receivedQuantity) || receivedQuantity < 1) return res.status(400).json({ success: false, error: 'Medicine name, batch number, and a positive quantity are required.' });
  let item = (await InventoryItem.find({})).find(candidate => candidate.name.toLowerCase() === String(name).trim().toLowerCase() && candidate.batchNumber.toLowerCase() === String(batchNumber).trim().toLowerCase());
  if (item) item = await InventoryItem.findByIdAndUpdate(item._id, { $inc: { quantity: receivedQuantity }, updatedAt: new Date(), expiryDate: expiryDate || item.expiryDate, supplier: supplier || item.supplier });
  else item = await InventoryItem.create({ name: String(name).trim(), batchNumber: String(batchNumber).trim(), quantity: receivedQuantity, expiryDate: expiryDate || undefined, supplier: String(supplier || '').trim(), unitPrice: Math.max(0, Number(unitPrice) || 0) });
  const receipt = await InventoryReceipt.create({ inventoryItemId: String(item._id), medicineName: item.name, batchNumber: item.batchNumber, quantity: receivedQuantity, supplier: String(supplier || '').trim(), invoiceNumber: String(invoiceNumber || '').trim(), vehicleNumber: String(vehicleNumber || '').trim(), deliveryPerson: String(deliveryPerson || '').trim(), receivedBy: String(req.user.id), notes: String(notes || '').trim() });
  logger.audit('PHARMACY_STOCK_RECEIVED', req.user.email, { receiptId: receipt._id, inventoryItemId: item._id, quantity: receivedQuantity, vehicleNumber });
  return res.json({ success: true, receipt });
};

exports.postCreateInventoryItem = async (req, res) => {
  const { name, batchNumber, category, quantity, reorderLevel, unitPrice, expiryDate, supplier } = req.body;
  if (!String(name || '').trim() || !String(batchNumber || '').trim()) return res.status(400).json({ success: false, error: 'Medicine name and batch number are required.' });
  const item = await InventoryItem.create({ name: String(name).trim(), batchNumber: String(batchNumber).trim(), category: category || 'Medicine', quantity: Math.max(0, Number(quantity) || 0), reorderLevel: Math.max(0, Number(reorderLevel) || 10), unitPrice: Math.max(0, Number(unitPrice) || 0), expiryDate: expiryDate || undefined, supplier: String(supplier || '').trim() });
  logger.audit('PHARMACY_INVENTORY_CREATED', req.user.email, { inventoryId: item._id, name: item.name });
  return res.json({ success: true, item });
};

exports.postAdjustInventory = async (req, res) => {
  const current = await InventoryItem.findById(req.body.itemId);
  if (!current) return res.status(404).json({ success: false, error: 'Inventory item not found.' });
  const amount = Number(req.body.amount) || 0;
  const item = await InventoryItem.findByIdAndUpdate(req.body.itemId, { $inc: { quantity: Math.max(-current.quantity, amount) }, updatedAt: new Date() });
  if (!item) return res.status(404).json({ success: false, error: 'Inventory item not found.' });
  return res.json({ success: true, item });
};

exports.postDispense = async (req, res) => {
  try {
    const { patientId, items = [], totalAmount = 0 } = req.body;
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found.' });
    const submittedItems = Array.isArray(items) ? items : [items];
    const namedItems = submittedItems.filter(item => String(item || '').trim());
    if (!namedItems.length) return res.status(400).json({ success: false, error: 'At least one medicine is required.' });

    const record = await DispensationRecord.create({
      patientId: String(patient._id),
      uhid: patient.uhid,
      patientName: patient.fullName,
      doctorName: patient.assignedDoctorName || 'Attending Physician',
      dispensedItems: namedItems,
      totalBillAmount: parseFloat(totalAmount) || 0,
      dispensationStatus: 'dispensed',
      pharmacistName: req.user ? req.user.name : 'Pharmacist'
    });

    logger.audit('PHARMACY_DISPENSED', req.user ? req.user.email : 'system', { uhid: patient.uhid, bill: totalAmount });
    return res.json({ success: true, recordId: record._id });
  } catch (err) {
    logger.error('Dispensation error: ' + err.message);
    return res.status(500).json({ success: false, error: 'Failed to record dispensation.' });
  }
};
