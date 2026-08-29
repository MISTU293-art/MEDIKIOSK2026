const Patient = require('../models/Patient');
const IntakeSession = require('../models/IntakeSession');
const Document = require('../models/Document');
const ConsultationNote = require('../models/ConsultationNote');
const DispensationRecord = require('../models/DispensationRecord');
const AiClinicalCopilotService = require('../services/aiClinicalCopilotService');
const logger = require('../utils/logger');

exports.getQueue = async (req, res) => {
  try {
    const patients = await Patient.find({ status: { $in: ['queued', 'in_consultation'] } });
    
    // Sort Emergency Red-Flag first, then Urgent, then Normal
    const priorityWeight = { 'Emergency Red-Flag': 3, 'Urgent': 2, 'Normal': 1 };
    patients.sort((a, b) => {
      const wA = priorityWeight[a.priority] || 1;
      const wB = priorityWeight[b.priority] || 1;
      return wB - wA;
    });

    res.render('doctor/queue', {
      title: 'Doctor Consultation Queue — MediKiosk',
      user: req.user,
      patients
    });
  } catch (err) {
    logger.error('Doctor queue error: ' + err.message);
    res.status(500).send('Error loading doctor queue');
  }
};

exports.getPatientDetail = async (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).send('Patient not found');

    const intake = await IntakeSession.findOne({ patientId: String(patient._id) });
    const documents = await Document.find({ patientId: String(patient._id) });
    const pastNotes = await ConsultationNote.find({ patientId: String(patient._id) });
    const pastDispensations = await DispensationRecord.find({ patientId: String(patient._id) });

    // Generate AI Clinical Auto-Suggestions based on intake data
    const aiCopilotSuggestions = AiClinicalCopilotService.getClinicalSuggestions({
      stepData: intake ? intake.stepData : null,
      chiefComplaint: intake?.stepData?.chiefComplaint,
      prakriti: intake?.stepData?.prakritiAssessment || 'Vata-Pitta Prakriti',
      age: patient.age,
      gender: patient.gender
    });

    res.render('doctor/patientDetail', {
      title: `Patient 360 & AI Clinical Workspace: ${patient.fullName}`,
      user: req.user,
      patient,
      intake,
      documents,
      pastNotes,
      pastDispensations,
      aiSuggestions: aiCopilotSuggestions
    });
  } catch (err) {
    logger.error('Patient detail error: ' + err.message);
    res.status(500).send('Error loading patient detail');
  }
};

exports.postReviewSummary = async (req, res) => {
  try {
    const { sessionToken, action, editedText } = req.body;
    const intake = await IntakeSession.findOne({ sessionToken });
    if (!intake) return res.status(404).json({ success: false, error: 'Session not found' });

    intake.aiSummary.status = action === 'approve' ? 'approved' : (action === 'edit' ? 'edited' : 'rejected');
    if (action === 'edit' && editedText) {
      intake.aiSummary.editedText = editedText;
    }
    intake.aiSummary.reviewedBy = req.user.name;
    intake.aiSummary.reviewedAt = new Date();

    await IntakeSession.findByIdAndUpdate(intake._id, { aiSummary: intake.aiSummary });

    logger.audit('DOCTOR_SUMMARY_REVIEW', req.user.email, {
      sessionToken,
      action,
      status: intake.aiSummary.status
    });

    return res.json({ success: true, status: intake.aiSummary.status });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to update summary' });
  }
};

exports.postAiAutoSuggest = (req, res) => {
  try {
    const suggestions = AiClinicalCopilotService.getClinicalSuggestions(req.body);
    return res.json(suggestions);
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to generate suggestions' });
  }
};

exports.postSaveConsultation = async (req, res) => {
  try {
    const { patientId, approvedSummary, clinicalImpression, prescribedMedications, labOrders, followUpDate } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

    const note = await ConsultationNote.create({
      patientId: String(patient._id),
      uhid: patient.uhid,
      doctorId: req.user ? String(req.user.id) : 'DOC-01',
      doctorName: req.user ? req.user.name : (patient.assignedDoctorName || 'Dr. Rajesh Kumar Sharma, BAMS, MD'),
      department: patient.department,
      approvedSummary,
      clinicalImpression,
      prescribedMedications: Array.isArray(prescribedMedications) ? prescribedMedications : [{ medicineName: prescribedMedications }],
      labOrders: Array.isArray(labOrders) ? labOrders : [labOrders],
      followUpDate
    });

    await Patient.findByIdAndUpdate(patientId, { status: 'completed' });

    logger.audit('DOCTOR_CONSULTATION_SAVED', req.user ? req.user.email : 'doctor@hospital.org', {
      patientId: patient._id,
      noteId: note._id
    });

    return res.json({ success: true, noteId: note._id });
  } catch (err) {
    logger.error('Error saving consultation note: ' + err.message);
    return res.status(500).json({ success: false, error: 'Failed to save consultation note' });
  }
};
