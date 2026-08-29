const User = require('../models/User');
const Patient = require('../models/Patient');
const IntakeSession = require('../models/IntakeSession');
const Kiosk = require('../models/Kiosk');
const RedFlagAudit = require('../models/RedFlagAudit');
const Document = require('../models/Document');
const DispensationRecord = require('../models/DispensationRecord');
const { DEPARTMENT_DOCTOR_ROSTER } = require('../utils/doctorRoster');
const logger = require('../utils/logger');

// Dynamic System Settings Store
let systemSettings = {
  hospital_name: 'National Institute of Ayurveda & AYUSH Research Hospital',
  facility_type: 'National AYUSH Institute & Tertiary Hospital',
  state: 'Delhi (National Capital Territory)',
  district: 'Central Delhi',
  hfr_id: 'IN-DL-AYUSH-HOSP-0042',
  abdm_mode: 'sandbox',
  opd_daily_quota: 500,
  bed_capacity: 250,
  
  // AI Model & CDSS
  ai_model_provider: 'gemini-1.5-flash',
  ai_temperature: 0.2,
  ai_max_tokens: 1024,
  ai_safety_level: 'level_3_strict',
  red_flag_sensitivity: 'high',
  allergy_shield_mode: 'block_dispensation',
  custom_disclaimer: 'AI-generated draft. Requires review and confirmation by an authorized healthcare professional.',

  // ImageKit.io & Cloud OCR
  imagekit_public_key: 'public_medikiosk_2026_demo',
  imagekit_private_key: 'private_medikiosk_2026_demo',
  imagekit_url_endpoint: 'https://ik.imagekit.io/medikiosk_ayush',
  cloud_storage_mode: 'imagekit_active',
  auto_contrast_enhancement: true,

  // Kiosk & Multilingual Voice
  speech_rate: 0.95,
  inactivity_timeout_sec: 120,
  enabled_languages: ['en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn'],
  auto_voice_prompt: true,

  // Security & DPDP Compliance
  dpo_email: 'dpo@ayush.gov.in',
  audit_retention_days: 365,
  mask_aadhaar_always: true
};

exports.getDashboard = async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments({});
    const totalIntakes = await IntakeSession.countDocuments({});
    const totalKiosks = await Kiosk.countDocuments({});
    const redFlagCount = await RedFlagAudit.countDocuments({});
    const activeKiosks = await Kiosk.find({});
    const recentPatients = await Patient.find({});

    res.render('admin/dashboard', {
      title: 'Executive Analytics & Command Center — Superadmin',
      user: req.user,
      stats: {
        totalPatients,
        totalIntakes,
        totalKiosks: totalKiosks || 4,
        redFlagCount,
        onlineKiosks: (activeKiosks && activeKiosks.length) || 3
      },
      recentPatients: recentPatients.slice(0, 10),
      kiosks: activeKiosks
    });
  } catch (err) {
    logger.error('Admin dashboard error: ' + err.message);
    res.status(500).send('Error loading admin dashboard');
  }
};

exports.getSettings = (req, res) => {
  res.render('admin/settings', {
    title: 'Hospital Facility & Cloud AI Backend Settings — MediKiosk',
    user: req.user,
    settings: systemSettings,
    success: req.query.success === 'true'
  });
};

exports.postSettings = (req, res) => {
  try {
    systemSettings = {
      ...systemSettings,
      ...req.body,
      ai_temperature: parseFloat(req.body.ai_temperature) || 0.2,
      speech_rate: parseFloat(req.body.speech_rate) || 0.95,
      inactivity_timeout_sec: parseInt(req.body.inactivity_timeout_sec, 10) || 120,
      opd_daily_quota: parseInt(req.body.opd_daily_quota, 10) || 500,
      bed_capacity: parseInt(req.body.bed_capacity, 10) || 250,
      audit_retention_days: parseInt(req.body.audit_retention_days, 10) || 365,
      enabled_languages: Array.isArray(req.body.enabled_languages) ? req.body.enabled_languages : (req.body.enabled_languages ? [req.body.enabled_languages] : systemSettings.enabled_languages)
    };

    logger.audit('SUPERADMIN_SETTINGS_UPDATED', req.user ? req.user.email : 'admin@hospital.org', {
      provider: systemSettings.ai_model_provider,
      hospital: systemSettings.hospital_name,
      state: systemSettings.state
    });

    if (req.accepts('html')) {
      return res.redirect('/admin/settings?success=true');
    }
    return res.json({ success: true, settings: systemSettings });
  } catch (err) {
    logger.error('Error saving settings: ' + err.message);
    return res.status(500).json({ success: false, error: 'Failed to update settings.' });
  }
};

exports.postUpdateSettings = exports.postSettings;

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({});
    const departments = Object.keys(DEPARTMENT_DOCTOR_ROSTER);
    res.render('admin/users', {
      title: 'RBAC User & Clinical Staff Directory',
      user: req.user,
      users,
      departments
    });
  } catch (err) {
    res.status(500).send('Error loading users');
  }
};

exports.postCreateUser = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();
    
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      existing.name = name || existing.name;
      existing.password = password || existing.password;
      existing.role = role || existing.role;
      existing.department = department || existing.department;
      existing.active = true;
      await existing.save();
    } else {
      await User.create({
        name: name || 'Doctor / Staff',
        email: cleanEmail,
        password: password || 'hospital123',
        role: role || 'doctor',
        department: department || 'Ayurveda (Kayachikitsa & Panchakarma)',
        active: true
      });
    }

    logger.audit('USER_CREATED_BY_ADMIN', req.user ? req.user.email : 'admin@hospital.org', { createdEmail: cleanEmail, role });
    res.redirect('/admin/users');
  } catch (err) {
    res.status(500).send('Error creating user: ' + err.message);
  }
};

exports.postToggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (user) {
      user.active = !user.active;
      await user.save();
    }
    res.redirect('/admin/users');
  } catch (err) {
    res.status(500).send('Error toggling user status');
  }
};

exports.getReports = async (req, res) => {
  try {
    const patients = await Patient.find({});
    const totalPatients = patients.length;
    const priorityStats = {
      Emergency: patients.filter(p => p.priority === 'Emergency Red-Flag').length,
      Urgent: patients.filter(p => p.priority === 'Urgent').length,
      Normal: patients.filter(p => p.priority === 'Normal' || !p.priority).length
    };
    const deptStats = {};
    patients.forEach(p => {
      deptStats[p.department] = (deptStats[p.department] || 0) + 1;
    });

    res.render('admin/reports', {
      title: 'Departmental Intake & Triage Analytics Report',
      user: req.user,
      totalPatients,
      priorityStats,
      deptStats
    });
  } catch (err) {
    res.status(500).send('Error generating reports');
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const audits = await RedFlagAudit.find({});
    res.render('admin/auditLogs', {
      title: 'Institutional Audit Logs & Security Trail',
      user: req.user,
      audits,
      logs: audits
    });
  } catch (err) {
    res.status(500).send('Error loading audit logs');
  }
};

exports.getKiosks = async (req, res) => {
  try {
    const kiosks = await Kiosk.find({});
    res.render('admin/kiosks', {
      title: 'Hospital Hardware Kiosk Fleet Monitor',
      user: req.user,
      kiosks
    });
  } catch (err) {
    res.status(500).send('Error loading kiosks');
  }
};

exports.postCreateKiosk = async (req, res) => {
  try {
    const { kioskId, name, location } = req.body;
    await Kiosk.create({
      kioskId,
      name,
      location,
      status: 'online',
      hardwareHealth: { touchScreen: 'ok', thermalPrinter: 'ok', micArray: 'ok' }
    });
    res.redirect('/admin/kiosks');
  } catch (err) {
    res.status(500).send('Error creating kiosk');
  }
};

exports.getCompliance = async (req, res) => {
  try {
    const redFlagAudits = await RedFlagAudit.find({});
    res.render('admin/compliance', {
      title: 'ABDM Regulatory Compliance & Red-Flag Audit Registry',
      user: req.user,
      redFlagAudits,
      audits: redFlagAudits
    });
  } catch (err) {
    res.status(500).send('Error loading compliance registry');
  }
};

exports.postOverridePriority = async (req, res) => {
  try {
    const { patientId, newPriority } = req.body;
    await Patient.findByIdAndUpdate(patientId, {
      priority: newPriority,
      prioritySource: 'doctor_assigned'
    });
    logger.audit('SUPERADMIN_PRIORITY_OVERRIDE', req.user ? req.user.email : 'admin@hospital.org', {
      patientId,
      newPriority
    });
    res.json({ success: true, newPriority });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to override priority.' });
  }
};

exports.getExportIntakesCsv = async (req, res) => {
  try {
    const patients = await Patient.find({});
    let csv = 'Token,UHID,Full Name,Age,Gender,Phone,Aadhaar,Department,Doctor,Room,Priority,Status,Created At\n';
    patients.forEach(p => {
      csv += `"${p.tokenNumber}","${p.uhid}","${p.fullName}","${p.age}","${p.gender}","${p.phone}","${p.aadhaarNumber || ''}","${p.department}","${p.assignedDoctorName || ''}","${p.roomNumber || ''}","${p.priority}","${p.status}","${new Date(p.createdAt).toISOString()}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="medikiosk_ayush_intakes_export.csv"');
    return res.send(csv);
  } catch (err) {
    res.status(500).send('Error exporting CSV: ' + err.message);
  }
};

exports.getExportIntakes = exports.getExportIntakesCsv;
