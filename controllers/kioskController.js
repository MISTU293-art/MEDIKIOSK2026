const Patient = require('../models/Patient');
const IntakeSession = require('../models/IntakeSession');
const Kiosk = require('../models/Kiosk');
const RedFlagService = require('../services/redFlagService');
const AiSummaryService = require('../services/aiSummaryService');
const { getDoctorForDepartment } = require('../utils/doctorRoster');
const questionBank = require('../utils/questionBanks.json');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const UI_STRINGS = {
  en: { repeatAudio: 'Audio Prompt', holdToSpeak: 'Hold to Speak', start: 'Start Intake' },
  hi: { repeatAudio: 'ऑडियो सुनें', holdToSpeak: 'बोलने के लिए दबाएं', start: 'शुरू करें' },
  bn: { repeatAudio: 'অডিও শুনুন', holdToSpeak: 'কথা বলতে চাপুন', start: 'শুরু করুন' }
};

exports.getWelcome = async (req, res) => {
  const kiosk = await Kiosk.findOne({ kioskId: 'KIOSK-01' }) || { kioskId: 'KIOSK-01', name: 'Main OPD Kiosk', location: 'Ground Floor' };
  res.render('kiosk/welcome', {
    title: 'MediKiosk — Ministry of AYUSH & Ayushman Bharat Portal',
    language: 'en',
    kiosk
  });
};

exports.getIntakeWizard = async (req, res) => {
  const language = req.query.lang || 'en';
  const kiosk = await Kiosk.findOne({ kioskId: 'KIOSK-01' }) || { kioskId: 'KIOSK-01', name: 'Main OPD Kiosk', location: 'Ground Floor' };
  const prefillMobile = req.query.mobile || '';
  const prefillAbha = req.query.abha || '';
  const prefillAadhaar = req.query.aadhaar || '';
  
  res.render('kiosk/intake', {
    title: 'Patient Intake — Ministry of AYUSH & ABDM',
    language,
    lang: language,
    sessionToken: 'KS-' + uuidv4().substring(0, 8).toUpperCase(),
    kiosk,
    kioskId: kiosk.kioskId,
    questionBank,
    strings: UI_STRINGS[language] || UI_STRINGS.en,
    voiceConsent: true,
    prefillMobile,
    prefillAbha,
    prefillAadhaar
  });
};

exports.getUpload = async (req, res) => {
  const language = req.query.lang || 'en';
  const sessionToken = req.query.sessionToken || ('KS-' + uuidv4().substring(0, 8).toUpperCase());
  const kiosk = await Kiosk.findOne({ kioskId: 'KIOSK-01' }) || { kioskId: 'KIOSK-01', name: 'Main OPD Kiosk', location: 'Ground Floor' };
  res.render('kiosk/upload', {
    title: 'ImageKit Medical Document Scanner — MediKiosk',
    lang: language,
    sessionToken,
    kiosk
  });
};

exports.postAyushmanLookup = async (req, res) => {
  try {
    const query = (req.body.identifier || req.query.identifier || '').trim();
    if (!query) {
      return res.status(400).json({ success: false, error: 'Ayushman Card number, Aadhaar number, ABHA ID, or Mobile number is required.' });
    }

    const allPatients = await Patient.find({});
    const cleanQ = query.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    const existingPatient = allPatients.find(p => {
      const pAbha = (p.abhaId || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const pPhone = (p.phone || '').replace(/[^a-zA-Z0-9]/g, '');
      const pUhid = (p.uhid || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const pAadhaar = (p.aadhaarNumber || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      return pAbha === cleanQ || pPhone === cleanQ || pUhid === cleanQ || pAadhaar.endsWith(cleanQ) || p.phone === query || p.uhid === query;
    });

    if (existingPatient) {
      const tokenCount = await Patient.countDocuments({});
      const todayTokenNumber = 'AYUSH-' + (101 + tokenCount);
      const doctorAssignment = getDoctorForDepartment(existingPatient.department);

      await Patient.findByIdAndUpdate(existingPatient._id, {
        tokenNumber: todayTokenNumber,
        assignedDoctorName: doctorAssignment.doctorName,
        assignedDoctorQualification: doctorAssignment.qualification,
        assignedDoctorId: doctorAssignment.doctorId,
        roomNumber: doctorAssignment.roomNumber,
        status: 'queued',
        updatedAt: new Date()
      });

      existingPatient.tokenNumber = todayTokenNumber;
      existingPatient.assignedDoctorName = doctorAssignment.doctorName;
      existingPatient.roomNumber = doctorAssignment.roomNumber;

      logger.audit('AYUSHMAN_PATIENT_RECOGNIZED', existingPatient.uhid, {
        patientId: existingPatient._id,
        tokenNumber: todayTokenNumber,
        identifier: query
      });

      return res.json({
        success: true,
        alreadyRegistered: true,
        patient: existingPatient,
        tokenNumber: todayTokenNumber,
        roomNumber: doctorAssignment.roomNumber,
        assignedDoctorName: doctorAssignment.doctorName,
        cardUrl: `/kiosk/card/${existingPatient._id}`,
        message: `Welcome back, ${existingPatient.fullName}! Your token for today is ${todayTokenNumber}.`
      });
    }

    return res.json({
      success: true,
      alreadyRegistered: false,
      message: 'No previous record found. Proceed to Ayushman Bharat Digital Registration.'
    });
  } catch (err) {
    logger.error('Ayushman lookup error: ' + err.message);
    return res.status(500).json({ success: false, error: 'Error during Ayushman Card verification.' });
  }
};

exports.getPatientCard = async (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.redirect('/kiosk');
    }
    const intake = await IntakeSession.findOne({ patientId: String(patient._id) });
    res.render('kiosk/patientCard', {
      title: `AYUSH Patient OPD Card: ${patient.fullName} (${patient.tokenNumber})`,
      patient,
      intake
    });
  } catch (err) {
    logger.error('Error loading patient card: ' + err.message);
    res.redirect('/kiosk');
  }
};

exports.postSubmitIntake = async (req, res) => {
  try {
    const { sessionToken, kioskId = 'KIOSK-01', language = 'en', consent, stepData } = req.body;

    if (!stepData || !stepData.demographics) {
      return res.status(400).json({ success: false, error: 'Demographic information is required.' });
    }

    const { fullName, age, gender, phone, emergencyContact, preferredDepartment, abhaId, aadhaarNumber, ayushmanSchemeType, prakriti } = stepData.demographics;

    let maskedAadhaar = '';
    if (aadhaarNumber) {
      const cleanA = aadhaarNumber.replace(/\D/g, '');
      if (cleanA.length >= 4) {
        maskedAadhaar = 'XXXX-XXXX-' + cleanA.slice(-4);
      } else {
        maskedAadhaar = aadhaarNumber;
      }
    }

    const dept = preferredDepartment || 'Ayurveda (Kayachikitsa & Panchakarma)';
    const doctorAssignment = getDoctorForDepartment(dept);

    const tokenCount = await Patient.countDocuments({});
    const tokenNumber = 'AYUSH-' + (101 + tokenCount);
    const uhid = 'UHID-AYUSH-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random()*900+100);

    const patient = await Patient.create({
      uhid,
      abhaId: abhaId || uhid,
      aadhaarNumber: maskedAadhaar,
      ayushmanSchemeType: ayushmanSchemeType || 'PM-JAY Golden Card (₹5 Lakh Cover)',
      tokenNumber,
      fullName: fullName || 'Ayush Patient',
      age: parseInt(age, 10) || 35,
      gender: gender || 'other',
      phone: phone || '9999999999',
      emergencyContact: emergencyContact || '',
      preferredLanguage: language,
      department: dept,
      assignedDoctorName: doctorAssignment.doctorName,
      assignedDoctorQualification: doctorAssignment.qualification,
      assignedDoctorId: doctorAssignment.doctorId,
      roomNumber: doctorAssignment.roomNumber,
      priority: 'Normal',
      prioritySource: 'system',
      status: 'queued'
    });

    const redFlagResult = await RedFlagService.evaluateIntake(stepData, patient, sessionToken, kioskId);

    if (redFlagResult.hasRedFlag) {
      await Patient.findByIdAndUpdate(patient._id, {
        priority: 'Emergency Red-Flag',
        prioritySource: 'red_flag_system'
      });
      patient.priority = 'Emergency Red-Flag';
    }

    const aiSummaryResult = AiSummaryService.generateDraftSummary(stepData, patient, language);

    const uniqueSessionToken = 'KS-' + uuidv4().substring(0, 8).toUpperCase() + '-' + Date.now().toString().slice(-4);
    const intakeSession = await IntakeSession.create({
      sessionToken: uniqueSessionToken,
      kioskId,
      patientId: String(patient._id),
      language,
      consent: {
        medicalDataSharing: consent ? consent.medicalDataSharing : true,
        voiceRecording: consent ? consent.voiceRecording : false,
        consentTimestamp: new Date()
      },
      stepData: {
        ...stepData,
        prakritiAssessment: prakriti || 'Vata-Pitta Prakriti'
      },
      redFlagCheck: redFlagResult,
      aiSummary: {
        status: 'pending',
        isAiDrafted: true,
        draftText: aiSummaryResult.draftText,
        soapStructure: aiSummaryResult.soapStructure
      },
      status: 'submitted'
    });

    logger.audit('INTAKE_SUBMITTED', patient.uhid, {
      patientId: patient._id,
      kioskId,
      priority: patient.priority,
      redFlagTriggered: redFlagResult.hasRedFlag
    });

    return res.json({
      success: true,
      patientId: patient._id,
      tokenNumber: patient.tokenNumber,
      uhid: patient.uhid,
      roomNumber: doctorAssignment.roomNumber,
      assignedDoctorName: doctorAssignment.doctorName,
      priority: patient.priority,
      redFlagCheck: redFlagResult,
      cardUrl: `/kiosk/card/${patient._id}`
    });
  } catch (err) {
    logger.error('Intake submission error: ' + err.message);
    return res.status(500).json({ success: false, error: 'Failed to process intake submission.' });
  }
};
