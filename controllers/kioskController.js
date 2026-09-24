const Patient = require("../models/Patient");
const IntakeSession = require("../models/IntakeSession");
const Kiosk = require("../models/Kiosk");
const EmergencyModel = require("../models/Emergency");
const RedFlagService = require("../services/redFlagService");
const AiSummaryService = require("../services/aiSummaryService");
const { getDoctorForDepartment } = require("../utils/doctorRoster");
const questionBank = require("../utils/questionBanks.json");
const logger = require("../utils/logger");
const { v4: uuidv4 } = require("uuid");
const Visit = require("../models/Visit");
const KioskAssistantService = require("../services/kioskAssistantService");
const {
  validateRegistration,
  nextToken,
  createIdentifiers,
  maskAadhaar,
  DEFAULT_DEPARTMENT,
  normalizePhone,
  normalizeIdentifier,
} = require("../utils/patientRegistry");

const UI_STRINGS = {
  en: {
    repeatAudio: "Audio Prompt",
    holdToSpeak: "Hold to Speak",
    start: "Start Intake",
    back: "Back",
    next: "Next",
    skip: "Skip",
    submit: "Complete Registration & Get Token",
  },
  hi: {
    repeatAudio: "ऑडियो सुनें",
    holdToSpeak: "बोलने के लिए दबाएं",
    start: "शुरू करें",
    back: "पीछे",
    next: "आगे बढ़ें",
    skip: "छोड़ें",
    submit: "पंजीकरण पूरा करें और टोकन लें",
  },
  bn: {
    repeatAudio: "অডিও শুনুন",
    holdToSpeak: "কথা বলতে চাপুন",
    start: "শুরু করুন",
    back: "পেছনে",
    next: "পরবর্তী",
    skip: "এড়িয়ে যান",
    submit: "নিবন্ধন সম্পন্ন করুন এবং টোকেন নিন",
  },
};

exports.getWelcome = async (req, res) => {
  const kiosk = (await Kiosk.findOne({ kioskId: "KIOSK-01" })) || {
    kioskId: "KIOSK-01",
    name: "Main OPD Kiosk",
    location: "Ground Floor",
  };
  res.render("kiosk/welcome", {
    title: "MediKiosk — Ministry of AYUSH & Ayushman Bharat Portal",
    language: "en",
    kiosk,
  });
};

exports.getIntakeWizard = async (req, res) => {
  const language = req.query.lang || "en";
  const kiosk = (await Kiosk.findOne({ kioskId: "KIOSK-01" })) || {
    kioskId: "KIOSK-01",
    name: "Main OPD Kiosk",
    location: "Ground Floor",
  };
  const prefillMobile = req.query.mobile || "";
  const prefillAbha = req.query.abha || "";
  const prefillAadhaar = req.query.aadhaar || "";
  const prefillPatientId = req.query.patientId || "";

  res.render("kiosk/intake", {
    title: "Patient Intake — Ministry of AYUSH & ABDM",
    language,
    lang: language,
    sessionToken: "KS-" + uuidv4().substring(0, 8).toUpperCase(),
    kiosk,
    kioskId: kiosk.kioskId,
    questionBank,
    strings: UI_STRINGS[language] || UI_STRINGS.en,
    voiceConsent: true,
    prefillMobile,
    prefillAbha,
    prefillAadhaar,
    prefillPatientId,
  });
};

exports.getUpload = async (req, res) => {
  const language = req.query.lang || "en";
  const sessionToken =
    req.query.sessionToken || "KS-" + uuidv4().substring(0, 8).toUpperCase();
  const patientId = req.query.patientId || "";
  const kiosk = (await Kiosk.findOne({ kioskId: "KIOSK-01" })) || {
    kioskId: "KIOSK-01",
    name: "Main OPD Kiosk",
    location: "Ground Floor",
  };
  res.render("kiosk/upload", {
    title: "ImageKit Medical Document Scanner — MediKiosk",
    lang: language,
    sessionToken,
    patientId,
    kiosk,
  });
};

exports.postAyushmanLookup = async (req, res) => {
  try {
    const query = (req.body.identifier || req.query.identifier || "").trim();
    if (!query) {
      return res.status(400).json({
        success: false,
        error:
          "Ayushman Card number, Aadhaar number, ABHA ID, or Mobile number is required.",
      });
    }

    const cleanQ = normalizeIdentifier(query);
    const allPatients = await Patient.find({});
    const existingPatient = allPatients.find(
      (patient) =>
        [patient.cardNumber, patient.abhaId, patient.uhid].some(
          (value) => normalizeIdentifier(value) === cleanQ,
        ) || normalizePhone(patient.phone) === normalizePhone(query),
    );

    if (existingPatient) {
      const existingVisits = await Visit.find({
        patientId: String(existingPatient._id),
      });
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayVisit = existingVisits.find(
        (visit) => new Date(visit.createdAt) >= todayStart,
      );
      const todayTokenNumber = todayVisit
        ? todayVisit.tokenNumber
        : await nextToken(Patient);
      const doctorAssignment = getDoctorForDepartment(
        existingPatient.department,
      );
      const visit =
        todayVisit ||
        (await Visit.create({
          patientId: String(existingPatient._id),
          cardNumber: existingPatient.cardNumber || existingPatient.uhid,
          tokenNumber: todayTokenNumber,
          department: existingPatient.department,
          assignedDoctorId: doctorAssignment.doctorId,
          assignedDoctorName: doctorAssignment.doctorName,
          status: "queued",
        }));
      await Patient.findByIdAndUpdate(existingPatient._id, {
        status: "queued",
        updatedAt: new Date(),
      });

      logger.audit("AYUSHMAN_PATIENT_RECOGNIZED", existingPatient.uhid, {
        patientId: existingPatient._id,
        tokenNumber: todayTokenNumber,
        identifier: query,
      });

      return res.json({
        success: true,
        alreadyRegistered: true,
        patient: existingPatient,
        tokenNumber: todayTokenNumber,
        visitId: visit._id,
        roomNumber: doctorAssignment.roomNumber,
        assignedDoctorName: doctorAssignment.doctorName,
        cardUrl: `/kiosk/card/${existingPatient._id}?visitId=${visit._id}`,
        message: `Welcome back, ${existingPatient.fullName}! Your token for today is ${todayTokenNumber}.`,
      });
    }

    return res.json({
      success: true,
      alreadyRegistered: false,
      message:
        "No previous record found. Proceed to Ayushman Bharat Digital Registration.",
    });
  } catch (err) {
    logger.error("Ayushman lookup error: " + err.message);
    return res.status(500).json({
      success: false,
      error: "Error during Ayushman Card verification.",
    });
  }
};

exports.postAssistant = (req, res) => {
  const message = String(req.body.message || "").trim();
  if (!message)
    return res
      .status(400)
      .json({ success: false, error: "Please enter a question." });
  return res.json({
    success: true,
    ...KioskAssistantService.answer(message, req.body.mode),
  });
};

exports.getPatientCard = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { visitId } = req.query;
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.redirect("/kiosk");
    }
    const intake = await IntakeSession.findOne({
      patientId: String(patient._id),
    });
    const visits = await Visit.find({ patientId: String(patient._id) });
    const currentVisit =
      (visitId &&
        visits.find((visit) => String(visit._id) === String(visitId))) ||
      visits[0] ||
      null;
    res.render("kiosk/patientCard", {
      title: `AYUSH Patient OPD Card: ${patient.fullName} (${patient.tokenNumber})`,
      patient,
      intake,
      currentVisit,
    });
  } catch (err) {
    logger.error("Error loading patient card: " + err.message);
    res.redirect("/kiosk");
  }
};

exports.getSummary = async (req, res) => {
  try {
    const { sessionToken, patientId } = req.query;
    let patient = null;
    if (patientId) {
      patient = await Patient.findById(patientId);
    }
    if (!patient && sessionToken) {
      const intakeSession = await IntakeSession.findOne({ sessionToken });
      if (intakeSession && intakeSession.patientId) {
        patient = await Patient.findById(intakeSession.patientId);
      }
    }
    if (!patient) {
      const allPatients = await Patient.find({});
      if (allPatients && allPatients.length > 0) {
        patient = allPatients[allPatients.length - 1];
      }
    }
    if (!patient) {
      return res.redirect("/kiosk");
    }
    res.render("kiosk/summary", {
      title: "Intake Completed — MediKiosk",
      patient,
    });
  } catch (err) {
    logger.error("Error loading intake summary: " + err.message);
    res.redirect("/kiosk");
  }
};

exports.postSubmitIntake = async (req, res) => {
  try {
    const {
      sessionToken,
      kioskId = "KIOSK-01",
      language = "en",
      consent,
      stepData,
      existingPatientId,
    } = req.body;

    if (!stepData || !stepData.demographics) {
      return res.status(400).json({
        success: false,
        error: "Demographic information is required.",
      });
    }

    const {
      fullName,
      age,
      gender,
      phone,
      emergencyContact,
      preferredDepartment,
      abhaId,
      aadhaarNumber,
      ayushmanSchemeType,
      prakriti,
      address,
      medicalHistory,
      allergies,
      currentMedications,
    } = stepData.demographics;
    const validation = validateRegistration({ fullName, age, gender, phone });
    if (!validation.valid)
      return res.status(400).json({
        success: false,
        error: "Please correct the highlighted registration fields.",
        fields: validation.errors,
      });

    const dept = preferredDepartment || DEFAULT_DEPARTMENT;
    const doctorAssignment = getDoctorForDepartment(dept);
    let patient;
    let tokenNumber = await nextToken(Patient);
    let cardNumber;
    if (existingPatientId) {
      patient = await Patient.findById(existingPatientId);
      if (!patient)
        return res.status(404).json({
          success: false,
          error: "Existing patient record was not found.",
        });
      cardNumber = patient.cardNumber || patient.uhid;
      await Visit.create({
        patientId: String(patient._id),
        cardNumber,
        tokenNumber,
        department: patient.department,
        assignedDoctorId: doctorAssignment.doctorId,
        assignedDoctorName: doctorAssignment.doctorName,
        status: "queued",
      });
    } else {
      const identifiers = createIdentifiers();
      cardNumber = identifiers.cardNumber;
      patient = await Patient.create({
        uhid: identifiers.uhid,
        cardNumber,
        abhaId: abhaId || identifiers.uhid,
        aadhaarNumber: maskAadhaar(aadhaarNumber),
        ayushmanSchemeType:
          ayushmanSchemeType || "PM-JAY Golden Card (₹5 Lakh Cover)",
        tokenNumber,
        fullName: validation.fullName,
        age: validation.age,
        gender: validation.gender,
        phone: validation.phone,
        emergencyContact: emergencyContact || "",
        address: address || "",
        medicalHistory: medicalHistory || "",
        allergies: allergies || "",
        currentMedications: currentMedications || "",
        registrationSource: "kiosk",
        preferredLanguage: language,
        department: dept,
        assignedDoctorName: doctorAssignment.doctorName,
        assignedDoctorQualification: doctorAssignment.qualification,
        assignedDoctorId: doctorAssignment.doctorId,
        roomNumber: doctorAssignment.roomNumber,
        priority: "Normal",
        prioritySource: "system",
        status: "queued",
      });
      await Visit.create({
        patientId: String(patient._id),
        cardNumber,
        tokenNumber,
        department: dept,
        assignedDoctorId: doctorAssignment.doctorId,
        assignedDoctorName: doctorAssignment.doctorName,
        status: "queued",
      });

      // Auto-create Patient Portal Account for seamless Patient Portal & AI access (Section 78)
      try {
        const PatientAccount = require("../models/PatientAccount");
        if (!(await PatientAccount.findOne({ patientId: String(patient._id) }))) {
          await PatientAccount.create({
            patientId: String(patient._id),
            uhid: patient.uhid,
            cardNumber: patient.cardNumber,
            mobile: patient.phone,
            password: "patient123",
            fullName: patient.fullName,
            preferredLanguage: language || "en",
          });
        }
      } catch (accErr) {
        logger.warn("PatientAccount auto-create notice: " + accErr.message);
      }
    }

    const redFlagResult = await RedFlagService.evaluateIntake(
      stepData,
      patient,
      sessionToken,
      kioskId,
    );

    if (redFlagResult.hasRedFlag) {
      await Patient.findByIdAndUpdate(patient._id, {
        priority: "Emergency Red-Flag",
        prioritySource: "red_flag_system",
      });
      patient.priority = "Emergency Red-Flag";
    }

    const aiSummaryResult = AiSummaryService.generateDraftSummary(
      stepData,
      patient,
      language,
    );

    const uniqueSessionToken =
      "KS-" +
      uuidv4().substring(0, 8).toUpperCase() +
      "-" +
      Date.now().toString().slice(-4);
    const intakeSession = await IntakeSession.create({
      sessionToken: uniqueSessionToken,
      kioskId,
      patientId: String(patient._id),
      language,
      consent: {
        medicalDataSharing: consent ? consent.medicalDataSharing : true,
        voiceRecording: consent ? consent.voiceRecording : false,
        consentTimestamp: new Date(),
      },
      stepData: {
        ...stepData,
        prakritiAssessment: prakriti || "Vata-Pitta Prakriti",
      },
      redFlagCheck: redFlagResult,
      aiSummary: {
        status: "pending",
        isAiDrafted: true,
        draftText: aiSummaryResult.draftText,
        soapStructure: aiSummaryResult.formattedSoap,
      },
      status: "submitted",
    });

    logger.audit("INTAKE_SUBMITTED", patient.uhid, {
      patientId: patient._id,
      kioskId,
      priority: patient.priority,
      redFlagTriggered: redFlagResult.hasRedFlag,
    });

    return res.json({
      success: true,
      patientId: patient._id,
      tokenNumber,
      uhid: patient.uhid,
      roomNumber: doctorAssignment.roomNumber,
      assignedDoctorName: doctorAssignment.doctorName,
      priority: patient.priority,
      redFlagCheck: redFlagResult,
      cardUrl: `/kiosk/card/${patient._id}`,
    });
  } catch (err) {
    logger.error("Intake submission error: " + err.message);
    return res
      .status(500)
      .json({ success: false, error: "Failed to process intake submission." });
  }
};

exports.getEmergency = async (req, res) => {
  try {
    const kiosk = (await Kiosk.findOne({ kioskId: "KIOSK-01" })) || {
      kioskId: "KIOSK-01",
      name: "Main OPD Kiosk",
      location: "Ground Floor",
    };

    res.render("kiosk/emergency", {
      title: "Emergency Patient Registration — MediKiosk",
      kiosk,
      error: null,
      message: null,
      formData: {},
    });
  } catch (err) {
    logger.error("Error loading emergency patient page: " + err.message);

    res.status(500).send("Unable to load emergency registration.");
  }
};

exports.emergencyPatientData = async (req, res) => {
  try {
    const {
      name,
      mobile,
      aadhaar,
      bloodGroup,
    } = req.body;

    console.log("Emergency Form Data:", req.body);

    const formData = {
      name: name || "",
      mobile: mobile || "",
      aadhaar: aadhaar || "",
      bloodGroup: bloodGroup || "",
    };

    // ==========================================
    // VALIDATION (Name & Mobile are required)
    // ==========================================

    if (!name || !name.trim() || !mobile || !mobile.trim()) {
      return res.status(400).render("kiosk/emergency", {
        title: "Emergency Patient Registration — MediKiosk",
        kiosk: {
          kioskId: "KIOSK-01",
          name: "Main OPD Kiosk",
          location: "Ground Floor",
        },
        error: "Patient Name and Mobile Number are required for emergency intake.",
        message: null,
        formData,
      });
    }

    // ==========================================
    // MOBILE VALIDATION
    // ==========================================

    const cleanMobile = mobile.trim().replace(/\D/g, "").slice(-10);
    if (cleanMobile.length !== 10) {
      return res.status(400).render("kiosk/emergency", {
        title: "Emergency Patient Registration — MediKiosk",
        kiosk: {
          kioskId: "KIOSK-01",
          name: "Main OPD Kiosk",
          location: "Ground Floor",
        },
        error: "Please enter a valid 10-digit mobile number.",
        message: null,
        formData,
      });
    }

    // ==========================================
    // AADHAAR & BLOOD GROUP (Emergency-safe defaults)
    // ==========================================
    let cleanAadhaar = (aadhaar && aadhaar.trim()) ? aadhaar.trim().replace(/\D/g, "") : "000000000000";
    if (cleanAadhaar.length !== 12) {
      cleanAadhaar = "000000000000";
    }
    const cleanBloodGroup = (bloodGroup && bloodGroup.trim()) ? bloodGroup.trim() : "Unknown";

    // ==========================================
    // IDENTIFIERS
    // ==========================================

    const identifiers = createIdentifiers();

    const tokenNumber = await nextToken(Patient);

    const department = DEFAULT_DEPARTMENT;

    const doctorAssignment =
      getDoctorForDepartment(department);

    // ==========================================
    // CREATE EMERGENCY PATIENT
    // ==========================================

    const patient = await EmergencyModel.create({
      uhid: identifiers.uhid,

      cardNumber: identifiers.cardNumber,

      name: name.trim(),

      mobile: normalizePhone(cleanMobile),

      // Store masked Aadhaar
      aadhaar: maskAadhaar(cleanAadhaar),

      bloodGroup: cleanBloodGroup,

      tokenNumber,

      department,

      assignedDoctorName:
        doctorAssignment.doctorName,

      assignedDoctorQualification:
        doctorAssignment.qualification,

      assignedDoctorId:
        doctorAssignment.doctorId,

      roomNumber:
        doctorAssignment.roomNumber,

      priority: "Emergency",

      prioritySource: "emergency_registration",

      status: "queued",

      registrationSource: "emergency_kiosk",
    });

    // ==========================================
    // CREATE VISIT
    // ==========================================

    const visit = await Visit.create({
      patientId: String(patient._id),

      cardNumber: patient.cardNumber,

      tokenNumber,

      department,

      assignedDoctorId:
        doctorAssignment.doctorId,

      assignedDoctorName:
        doctorAssignment.doctorName,

      status: "queued",
    });

    // ==========================================
    // AUDIT
    // ==========================================

    logger.audit(
      "EMERGENCY_PATIENT_REGISTERED",
      patient.uhid,
      {
        patientId: patient._id,
        tokenNumber,
        registrationSource: "emergency_kiosk",
        priority: "Emergency",
      }
    );

    // ==========================================
    // SUCCESS
    // ==========================================

    return res.render(
      "kiosk/emergencyCard",
      {
        title:
          "Emergency Registration Card — MediKiosk",

        patient,

        visit,

        doctorAssignment,

        message:
          "Emergency patient registered successfully.",
      }
    );

  } catch (err) {
    logger.error(
      "Emergency patient registration error: " +
        err.message
    );

    console.error(err);

    return res.status(500).render(
      "kiosk/emergency",
      {
        title:
          "Emergency Patient Registration — MediKiosk",

        kiosk: {
          kioskId: "KIOSK-01",
          name: "Main OPD Kiosk",
          location: "Ground Floor",
        },

        error:
          "Internal Server Error. Please try again.",

        message: null,

        formData: req.body || {},
      }
    );
  }
};

