const Patient = require('../models/Patient');
const IntakeSession = require('../models/IntakeSession');
const Document = require('../models/Document');
const ConsultationNote = require('../models/ConsultationNote');
const DispensationRecord = require('../models/DispensationRecord');
const AiClinicalCopilotService = require('../services/aiClinicalCopilotService');
const logger = require('../utils/logger');
const Visit = require('../models/Visit');
const Report = require('../models/Report');
const { validateRegistration, nextToken, createIdentifiers, DEFAULT_DEPARTMENT, normalizePhone } = require('../utils/patientRegistry');
const { getDoctorForDepartment } = require('../utils/doctorRoster');
const KioskAssistantService = require('../services/kioskAssistantService');
const EmergencyModel = require("../models/Emergency");
exports.getQueue = async (req, res) => {
  try {
    const patients = await Patient.find({
      status: { $in: ["queued", "in_consultation"] }
    });

    const emergencyPatients = await EmergencyModel.find({
      status: { $in: ["queued", "in-progress"] }
    });

    console.log("NORMAL PATIENTS:", patients.length);
    console.log("EMERGENCY PATIENTS:", emergencyPatients.length);

    const normalData = patients.map((patient) => ({
      ...patient.toObject(),
      patientType: "Normal",
      isEmergency: false,
    }));

    const emergencyData = emergencyPatients.map((patient) => ({
      ...patient.toObject(),
      fullName: patient.name,
      phone: patient.mobile,
      patientType: "Emergency",
      isEmergency: true,
      priority: "Emergency",
    }));

    const allPatients = [
      ...emergencyData,
      ...normalData,
    ];

    const priorityWeight = {
      "Emergency Red-Flag": 4,
      Emergency: 3,
      Urgent: 2,
      Normal: 1,
    };

    allPatients.sort((a, b) => {
      const priorityA = priorityWeight[a.priority] || 1;
      const priorityB = priorityWeight[b.priority] || 1;

      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      return new Date(a.createdAt || 0) -
             new Date(b.createdAt || 0);
    });

    console.log("TOTAL QUEUE:", allPatients.length);

    res.render("doctor/queue", {
      title: "Doctor Consultation Queue — MediKiosk",
      user: req.user,
      patients: allPatients,
      stats: {
        total: allPatients.length,
        emergency: emergencyData.length,
        normal: normalData.length,
        waiting: allPatients.filter(
          p => p.status === "queued"
        ).length,
        consultation: allPatients.filter(
          p =>
            p.status === "in_consultation" ||
            p.status === "in-progress"
        ).length,
      },
    });

  } catch (err) {
    console.error("DOCTOR QUEUE ERROR:", err);
    res.status(500).send(
      "Error loading doctor consultation queue: " +
      err.message
    );
  }
};
exports.postCreatePatient = async (req, res) => {
  try {
    const { fullName, age, gender, phone, emergencyContact, department, medicalHistory, allergies, currentMedications } = req.body;
    const validation = validateRegistration({ fullName, age, gender, phone });
    if (!validation.valid) return res.status(400).json({ success: false, error: 'Please correct the patient fields.', fields: validation.errors });
    const dept = department || req.user.department || DEFAULT_DEPARTMENT;
    const assignment = getDoctorForDepartment(dept);
    const { uhid, cardNumber } = createIdentifiers();
    const patient = await Patient.create({ uhid, cardNumber, tokenNumber: await nextToken(Patient), fullName: validation.fullName, age: validation.age, gender: validation.gender, phone: validation.phone, emergencyContact: String(emergencyContact || '').trim(), department: dept, medicalHistory: String(medicalHistory || '').trim(), allergies: String(allergies || '').trim(), currentMedications: String(currentMedications || '').trim(), registrationSource: 'doctor', assignedDoctorName: req.user.name, assignedDoctorId: String(req.user.id), assignedDoctorQualification: assignment.qualification, roomNumber: assignment.roomNumber, status: 'queued' });
    await Visit.create({ patientId: String(patient._id), cardNumber, tokenNumber: patient.tokenNumber, department: dept, assignedDoctorId: String(req.user.id), assignedDoctorName: req.user.name, status: 'queued' });
    logger.audit('DOCTOR_PATIENT_REGISTER', req.user.email, { patientId: patient._id, cardNumber });
    return res.json({ success: true, patientId: patient._id, cardNumber, tokenNumber: patient.tokenNumber });
  } catch (err) {
    logger.error('Doctor patient registration error: ' + err.message);
    return res.status(500).json({ success: false, error: 'Failed to register patient.' });
  }
};

exports.postAssistant = (req, res) => {
  const message = String(req.body.message || '').trim();
  if (!message) return res.status(400).json({ success: false, error: 'Please enter a question.' });
  return res.json({ success: true, ...KioskAssistantService.answer(message, 'doctor') });
};

exports.getReports = async (req, res) => {
  const reports = await Report.find({ requestedBy: String(req.user.id) });
  const patients = await Patient.find({});
  res.render('doctor/reports', { title: 'Doctor Reports & Tests', user: req.user, reports, patients });
};

exports.postRequestReport = async (req, res) => {
  const { patientId, reportType, priority, instructions } = req.body;
  if (!patientId || !String(reportType || '').trim()) return res.status(400).json({ success: false, error: 'Patient and report type are required.' });
  const patient = await Patient.findById(patientId);
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found.' });
  const report = await Report.create({ patientId: String(patient._id), requestedBy: String(req.user.id), reportType: String(reportType).trim(), priority: priority || 'routine', instructions: String(instructions || '').trim(), status: 'requested' });
  logger.audit('REPORT_REQUESTED', req.user.email, { reportId: report._id, patientId: patient._id });
  return res.json({ success: true, reportId: report._id });
};

exports.getPatientDetail = async (req, res) => {
  try {
    const { patientId } = req.params;

    let patient = null;
    let isEmergency = false;

    // First search normal Patient collection
    patient = await Patient.findById(patientId);

    // If not found, search Emergency collection
    if (!patient) {
      patient = await EmergencyModel.findById(patientId);
      isEmergency = true;
    }

    if (!patient) {
      return res.status(404).send("Patient not found");
    }

    // Convert emergency data into the same structure
    // expected by the patient detail page
    if (isEmergency) {
      patient = {
        ...patient.toObject(),

        fullName: patient.name,
        phone: patient.mobile,

        age: patient.age || "-",
        gender: patient.gender || "-",
        preferredLanguage:
          patient.preferredLanguage || "English",

        patientType: "Emergency",
        isEmergency: true,
        priority: "Emergency",
      };
    }

    let intake = null;
    let documents = [];
    let pastNotes = [];
    let pastDispensations = [];
    let aiCopilotSuggestions = null;

    // Normal patients have intake/AI data
    if (!isEmergency) {
      intake = await IntakeSession.findOne({
        patientId: String(patient._id),
      });

      documents = await Document.find({
        patientId: String(patient._id),
      });

      pastNotes = await ConsultationNote.find({
        patientId: String(patient._id),
      });

      pastDispensations = await DispensationRecord.find({
        patientId: String(patient._id),
      });

      if (intake) {
        aiCopilotSuggestions =
          await AiClinicalCopilotService.getClinicalSuggestions({
            stepData: intake.stepData,
            chiefComplaint:
              intake?.stepData?.chiefComplaint,
            prakriti:
              intake?.stepData?.prakritiAssessment ||
              "Vata-Pitta Prakriti",
            age: patient.age,
            gender: patient.gender,
          });
      }
    }

    res.render("doctor/patientDetail", {
      title: `Patient 360 — ${
        patient.fullName || patient.name
      }`,

      user: req.user,

      patient,

      intake,

      documents,

      pastNotes,

      pastDispensations,

      aiSuggestions: aiCopilotSuggestions,

      isEmergency,
    });

  } catch (err) {
    console.error("PATIENT DETAIL ERROR:", err);

    logger.error(
      "Patient detail error: " + err.message
    );

    res.status(500).send(
      "Error loading patient detail: " +
      err.message
    );
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
    if (!String(patientId || '').trim() || !String(clinicalImpression || '').trim()) return res.status(400).json({ success: false, error: 'Patient and clinical impression are required.' });

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

    const note = await ConsultationNote.create({
      patientId: String(patient._id),
      uhid: patient.uhid,
      doctorId: req.user ? String(req.user.id) : 'DOC-01',
      doctorName: req.user ? req.user.name : (patient.assignedDoctorName || 'Dr. Rajesh Kumar Sharma, BAMS, MD'),
      department: patient.department,
      approvedIntakeSummary: String(approvedSummary || '').trim(),
      clinicalImpression: String(clinicalImpression).trim(),
      prescribedMedications: (Array.isArray(prescribedMedications) ? prescribedMedications : [{ medicineName: prescribedMedications }]).filter(item => item && String(item.medicineName || '').trim()),
      labOrders: (Array.isArray(labOrders) ? labOrders : [labOrders]).filter(item => String(item || '').trim()),
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
