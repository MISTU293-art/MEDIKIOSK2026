const Patient = require('../models/Patient');
const Document = require('../models/Document');
const RedFlagAudit = require('../models/RedFlagAudit');
const { DOCUMENT_TYPES } = require('../config/constants');
const { getDoctorForDepartment } = require('../utils/doctorRoster');
const logger = require('../utils/logger');

exports.getDashboard = async (req, res) => {
  try {
    const patients = await Patient.find({});
    const activeAudits = await RedFlagAudit.find({});
    const unverifiedDocs = await Document.find({ ocrStatus: 'draft' });

    res.render('staff/dashboard', {
      title: 'Reception Desk & Triage Queue — MediKiosk',
      user: req.user,
      patients,
      activeAudits,
      unverifiedDocsCount: unverifiedDocs.length
    });
  } catch (err) {
    logger.error('Staff dashboard error: ' + err.message);
    res.status(500).send('Error loading staff dashboard');
  }
};

exports.postRegisterPatient = async (req, res) => {
  try {
    const { fullName, age, gender, phone, department, priority, aadhaarNumber, abhaId, ayushmanSchemeType } = req.body;
    const count = await Patient.countDocuments({});
    const tokenNumber = 'AYUSH-' + (101 + count);
    const uhid = 'UHID-AYUSH-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random()*900+100);

    let maskedAadhaar = '';
    if (aadhaarNumber) {
      const cleanA = aadhaarNumber.replace(/\D/g, '');
      if (cleanA.length >= 4) {
        maskedAadhaar = 'XXXX-XXXX-' + cleanA.slice(-4);
      } else {
        maskedAadhaar = aadhaarNumber;
      }
    }

    const dept = department || 'Ayurveda (Kayachikitsa & Panchakarma)';
    const doctorAssignment = getDoctorForDepartment(dept);

    const patient = await Patient.create({
      uhid,
      tokenNumber,
      fullName,
      age: parseInt(age, 10),
      gender,
      phone,
      aadhaarNumber: maskedAadhaar,
      abhaId: abhaId || uhid,
      ayushmanSchemeType: ayushmanSchemeType || 'PM-JAY Golden Card (₹5 Lakh Cover)',
      department: dept,
      assignedDoctorName: doctorAssignment.doctorName,
      assignedDoctorQualification: doctorAssignment.qualification,
      assignedDoctorId: doctorAssignment.doctorId,
      roomNumber: doctorAssignment.roomNumber,
      priority: priority || 'Normal',
      prioritySource: 'staff_assigned',
      status: 'queued'
    });

    logger.audit('STAFF_PATIENT_REGISTER', req.user.email, {
      patientId: patient._id,
      uhid: patient.uhid,
      tokenNumber: patient.tokenNumber
    });

    return res.redirect('/staff/dashboard');
  } catch (err) {
    logger.error('Staff patient registration error: ' + err.message);
    return res.status(500).send('Failed to register patient');
  }
};

exports.postAcknowledgeRedFlag = async (req, res) => {
  try {
    const { auditId, actionTaken } = req.body;
    const audit = await RedFlagAudit.findByIdAndUpdate(auditId, {
      acknowledgedBy: req.user.name,
      acknowledgedByRole: req.user.role,
      actionTaken: actionTaken || 'Patient attended by triage nurse.',
      acknowledgedAt: new Date()
    });

    logger.audit('RED_FLAG_ACKNOWLEDGED', req.user.email, { auditId, actionTaken });
    return res.json({ success: true, audit });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to acknowledge red flag' });
  }
};

exports.getOcrVerification = async (req, res) => {
  try {
    const pendingDocs = await Document.find({ ocrStatus: 'draft' });
    const selectedDocId = req.query.docId;
    let selectedDoc = null;
    if (selectedDocId) {
      selectedDoc = await Document.findById(selectedDocId);
    } else if (pendingDocs.length > 0) {
      selectedDoc = pendingDocs[0];
    }

    res.render('staff/ocrVerification', {
      title: 'Medical Document OCR Human-in-the-Loop Review',
      user: req.user,
      pendingDocs,
      document: selectedDoc,
      docTypes: DOCUMENT_TYPES
    });
  } catch (err) {
    logger.error('OCR Verification error: ' + err.message);
    res.status(500).send('Error loading OCR review tool');
  }
};

exports.getAssistKiosk = (req, res) => {
  res.redirect('/kiosk');
};

exports.getAssistedIntake = (req, res) => {
  res.redirect('/kiosk');
};
