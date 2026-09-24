const jwt = require('jsonwebtoken');
const { JWT_ACCESS_SECRET } = require('../config/auth');
const PatientAccount = require('../models/PatientAccount');
const Patient = require('../models/Patient');
const logger = require('../utils/logger');

const PATIENT_COOKIE_NAME = 'medikiosk_patient_token';

// Simple in-memory rate limiter for patient login attempts
const loginAttempts = new Map(); // key: ip or identifier -> { count, firstAttempt }

const checkLoginRateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown-ip';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 10;

  const record = loginAttempts.get(ip);
  if (!record) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }

  if (now - record.firstAttempt > windowMs) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }

  if (record.count >= maxAttempts) {
    const retryAfter = Math.ceil((windowMs - (now - record.firstAttempt)) / 1000);
    logger.warn(`Patient login rate limit exceeded for IP ${ip}`);
    if (req.accepts('html')) {
      return res.status(429).render('patient/login', {
        title: 'Patient Login — MediKiosk',
        error: `Too many login attempts. Please wait ${Math.ceil(retryAfter / 60)} minute(s) before trying again.`,
        redirect: req.body.redirect || ''
      });
    }
    return res.status(429).json({
      success: false,
      error: `Too many failed login attempts. Please try again after ${retryAfter} seconds.`
    });
  }

  record.count += 1;
  return next();
};

const authenticatePatient = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    } else if (req.cookies && req.cookies[PATIENT_COOKIE_NAME]) {
      token = req.cookies[PATIENT_COOKIE_NAME];
    }

    if (!token) {
      if (req.accepts('html')) {
        return res.redirect('/patient/login?redirect=' + encodeURIComponent(req.originalUrl));
      }
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log into the patient portal.'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    } catch (err) {
      if (req.accepts('html')) {
        return res.redirect('/patient/login?expired=true&redirect=' + encodeURIComponent(req.originalUrl));
      }
      return res.status(401).json({
        success: false,
        error: 'Session expired or invalid. Please log in again.'
      });
    }

    if (!decoded || !decoded.patientId) {
      if (req.accepts('html')) {
        return res.redirect('/patient/login');
      }
      return res.status(401).json({ success: false, error: 'Invalid token payload.' });
    }

    // Verify Patient exists
    const patient = await Patient.findById(decoded.patientId);
    if (!patient) {
      if (req.accepts('html')) {
        return res.redirect('/patient/login?error=Patient+record+not+found');
      }
      return res.status(401).json({ success: false, error: 'Patient record not found.' });
    }

    // Check account status if accountId is present
    let account = null;
    if (decoded.accountId) {
      account = await PatientAccount.findById(decoded.accountId);
      if (account && account.status === 'locked' && account.lockUntil && account.lockUntil > new Date()) {
        if (req.accepts('html')) {
          return res.redirect('/patient/login?error=Account+locked+temporarily');
        }
        return res.status(403).json({ success: false, error: 'Account temporarily locked due to repeated failed logins.' });
      }
    }

    // Attach verified patient info
    req.patient = {
      _id: String(patient._id),
      id: String(patient._id),
      uhid: patient.uhid,
      cardNumber: patient.cardNumber,
      fullName: patient.fullName,
      phone: patient.phone,
      gender: patient.gender,
      age: patient.age,
      preferredLanguage: (account && account.preferredLanguage) || patient.preferredLanguage || 'en',
      tokenNumber: patient.tokenNumber,
      department: patient.department
    };

    req.patientAccount = account || {
      _id: decoded.accountId,
      patientId: String(patient._id),
      uhid: patient.uhid,
      mobile: patient.phone,
      preferredLanguage: patient.preferredLanguage || 'en'
    };

    return next();
  } catch (err) {
    logger.error('Patient auth middleware error: ' + err.message);
    if (req.accepts('html')) {
      return res.redirect('/patient/login');
    }
    return res.status(500).json({ success: false, error: 'Internal authentication error.' });
  }
};

module.exports = {
  authenticatePatient,
  checkLoginRateLimit,
  PATIENT_COOKIE_NAME
};
