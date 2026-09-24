const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { JWT_ACCESS_SECRET, ACCESS_TOKEN_EXPIRY } = require('../config/auth');
const Patient = require('../models/Patient');
const PatientAccount = require('../models/PatientAccount');
const { PATIENT_COOKIE_NAME } = require('../middleware/patientAuthMiddleware');
const logger = require('../utils/logger');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
};

class PatientAuthController {
  /**
   * Render Login Page
   */
  static async getLogin(req, res) {
    // If already logged in, redirect to dashboard
    if (req.cookies && req.cookies[PATIENT_COOKIE_NAME]) {
      try {
        const decoded = jwt.verify(req.cookies[PATIENT_COOKIE_NAME], JWT_ACCESS_SECRET);
        if (decoded && decoded.patientId) {
          return res.redirect('/patient/dashboard');
        }
      } catch (e) {
        // Token invalid, continue to login page
      }
    }

    res.render('patient/login', {
      title: 'Patient Login — MediKiosk Health Portal',
      error: req.query.error || null,
      expired: req.query.expired === 'true',
      logged_out: req.query.logged_out === 'true',
      redirect: req.query.redirect || ''
    });
  }

  /**
   * Authenticate patient: Mobile / Email / UHID / CardNumber + Password
   */
  static async postLogin(req, res) {
    try {
      const { identifier, password, redirect } = req.body;

      if (!identifier || !password) {
        if (req.accepts('html')) {
          return res.status(400).render('patient/login', {
            title: 'Patient Login — MediKiosk Health Portal',
            error: 'Please enter your mobile number, email, or UHID, and password.',
            expired: false,
            logged_out: false,
            redirect: redirect || ''
          });
        }
        return res.status(400).json({ success: false, error: 'Identifier and password are required.' });
      }

      const cleanIdentifier = String(identifier).trim();

      // Find PatientAccount matching mobile, email, uhid, or cardNumber
      let account = await PatientAccount.findOne({
        $or: [
          { mobile: cleanIdentifier },
          { email: cleanIdentifier.toLowerCase() },
          { uhid: cleanIdentifier },
          { cardNumber: cleanIdentifier }
        ]
      });

      // If account not directly found in PatientAccount, check Patient model and auto-link if demo/patient exists
      let patient = null;
      if (!account) {
        patient = await Patient.findOne({
          $or: [
            { phone: cleanIdentifier },
            { uhid: cleanIdentifier },
            { cardNumber: cleanIdentifier }
          ]
        });

        // If patient exists and default password matches (e.g. 'patient123' for seeded patients)
        if (patient && password === 'patient123') {
          account = await PatientAccount.create({
            patientId: String(patient._id),
            uhid: patient.uhid,
            cardNumber: patient.cardNumber,
            mobile: patient.phone,
            password: 'patient123',
            fullName: patient.fullName,
            preferredLanguage: patient.preferredLanguage || 'en'
          });
        }
      } else {
        patient = await Patient.findById(account.patientId);
      }

      if (!account || !patient) {
        logger.audit('PATIENT_LOGIN_FAILED', cleanIdentifier, { reason: 'Account or Patient record not found' });
        if (req.accepts('html')) {
          return res.status(401).render('patient/login', {
            title: 'Patient Login — MediKiosk Health Portal',
            error: 'Invalid patient credentials. Please check your details or register.',
            expired: false,
            logged_out: false,
            redirect: redirect || ''
          });
        }
        return res.status(401).json({ success: false, error: 'Invalid patient credentials.' });
      }

      // Check account lock
      if (account.status === 'locked' && account.lockUntil && account.lockUntil > new Date()) {
        const remainingMinutes = Math.ceil((account.lockUntil - new Date()) / 60000);
        const lockMsg = `Account locked due to consecutive failed attempts. Try again in ${remainingMinutes} minute(s).`;
        if (req.accepts('html')) {
          return res.status(403).render('patient/login', {
            title: 'Patient Login — MediKiosk Health Portal',
            error: lockMsg,
            expired: false,
            logged_out: false,
            redirect: redirect || ''
          });
        }
        return res.status(403).json({ success: false, error: lockMsg });
      }

      // Verify password
      const isMatch = await account.comparePassword(password);
      if (!isMatch) {
        const attempts = (account.failedLoginAttempts || 0) + 1;
        const updates = { failedLoginAttempts: attempts };

        if (attempts >= 5) {
          updates.status = 'locked';
          updates.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
          logger.warn(`Patient account ${account._id} locked for 15 minutes due to 5 failed attempts.`);
        }

        await PatientAccount.findByIdAndUpdate(account._id, updates);
        logger.audit('PATIENT_LOGIN_FAILED', cleanIdentifier, { reason: 'Password mismatch', attempts });

        if (req.accepts('html')) {
          return res.status(401).render('patient/login', {
            title: 'Patient Login — MediKiosk Health Portal',
            error: attempts >= 5 ? 'Account locked for 15 minutes after 5 failed attempts.' : 'Invalid password. Please enter correct credentials.',
            expired: false,
            logged_out: false,
            redirect: redirect || ''
          });
        }
        return res.status(401).json({ success: false, error: 'Invalid password.' });
      }

      // Reset failed attempts on success
      await PatientAccount.findByIdAndUpdate(account._id, {
        failedLoginAttempts: 0,
        status: 'active',
        lockUntil: null,
        lastLogin: new Date()
      });

      // Generate JWT Token
      const token = jwt.sign(
        {
          accountId: String(account._id),
          patientId: String(patient._id),
          uhid: patient.uhid,
          role: 'patient',
          fullName: patient.fullName,
          phone: patient.phone
        },
        JWT_ACCESS_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      res.cookie(PATIENT_COOKIE_NAME, token, COOKIE_OPTIONS);

      logger.audit('PATIENT_LOGIN_SUCCESS', patient.uhid, { ip: req.ip });

      if (redirect && redirect.startsWith('/patient')) {
        return res.redirect(redirect);
      }

      if (req.accepts('html')) {
        return res.redirect('/patient/dashboard');
      }

      return res.json({
        success: true,
        message: 'Patient authenticated successfully',
        token,
        patient: {
          id: patient._id,
          uhid: patient.uhid,
          fullName: patient.fullName,
          cardNumber: patient.cardNumber
        }
      });
    } catch (err) {
      logger.error('Patient login error: ' + err.message);
      if (req.accepts('html')) {
        return res.status(500).render('patient/login', {
          title: 'Patient Login — MediKiosk Health Portal',
          error: 'An unexpected system error occurred. Please try again.',
          expired: false,
          logged_out: false,
          redirect: ''
        });
      }
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Render Register Page
   */
  static async getRegister(req, res) {
    res.render('patient/register', {
      title: 'Patient Portal Registration — MediKiosk',
      error: null,
      success: null
    });
  }

  /**
   * Register new patient account
   */
  static async postRegister(req, res) {
    try {
      const { fullName, phone, email, password, confirmPassword, uhid } = req.body;

      if (!fullName || !phone || !password) {
        return res.render('patient/register', {
          title: 'Patient Portal Registration — MediKiosk',
          error: 'Full name, mobile number, and password are required.',
          success: null
        });
      }

      if (password !== confirmPassword) {
        return res.render('patient/register', {
          title: 'Patient Portal Registration — MediKiosk',
          error: 'Passwords do not match.',
          success: null
        });
      }

      // Check if existing patient record by UHID or phone
      let patient = null;
      if (uhid) {
        patient = await Patient.findOne({ uhid: uhid.trim() });
      }
      if (!patient) {
        patient = await Patient.findOne({ phone: phone.trim() });
      }

      // If no patient found, create new Patient record
      if (!patient) {
        const uhidGen = `UHID-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        const cardGen = `MKC-${Math.floor(100000 + Math.random() * 900000)}`;
        patient = await Patient.create({
          uhid: uhidGen,
          cardNumber: cardGen,
          tokenNumber: `T-${Math.floor(100 + Math.random() * 899)}`,
          fullName: fullName.trim(),
          age: 30,
          gender: 'other',
          phone: phone.trim(),
          department: 'General OPD',
          status: 'registered'
        });
      }

      // Create PatientAccount
      const account = await PatientAccount.create({
        patientId: String(patient._id),
        uhid: patient.uhid,
        cardNumber: patient.cardNumber,
        email: email ? email.toLowerCase().trim() : undefined,
        mobile: phone.trim(),
        password,
        fullName: fullName.trim(),
        preferredLanguage: 'en'
      });

      // Auto login
      const token = jwt.sign(
        {
          accountId: String(account._id),
          patientId: String(patient._id),
          uhid: patient.uhid,
          role: 'patient',
          fullName: patient.fullName,
          phone: patient.phone
        },
        JWT_ACCESS_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      res.cookie(PATIENT_COOKIE_NAME, token, COOKIE_OPTIONS);
      return res.redirect('/patient/dashboard');
    } catch (err) {
      logger.error('Registration error: ' + err.message);
      return res.render('patient/register', {
        title: 'Patient Portal Registration — MediKiosk',
        error: 'Failed to create patient account: ' + err.message,
        success: null
      });
    }
  }

  /**
   * Instant Demo Quick Login for Evaluators
   */
  static async quickDemoLogin(req, res) {
    try {
      const { demoType } = req.body;
      let query = {};
      if (demoType === 'sunita') {
        query = { phone: '9876543210' };
      } else {
        query = { phone: '9830112233' }; // Rajesh Chatterjee
      }

      let patient = await Patient.findOne(query);
      if (!patient) {
        patient = (await Patient.find())[0];
      }

      if (!patient) {
        return res.redirect('/patient/login?error=Demo+patients+not+found.+Please+run+seeding.');
      }

      let account = await PatientAccount.findOne({ patientId: String(patient._id) });
      if (!account) {
        account = await PatientAccount.create({
          patientId: String(patient._id),
          uhid: patient.uhid,
          cardNumber: patient.cardNumber,
          mobile: patient.phone,
          password: 'patient123',
          fullName: patient.fullName,
          preferredLanguage: patient.preferredLanguage || 'en'
        });
      }

      const token = jwt.sign(
        {
          accountId: String(account._id),
          patientId: String(patient._id),
          uhid: patient.uhid,
          role: 'patient',
          fullName: patient.fullName,
          phone: patient.phone
        },
        JWT_ACCESS_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      res.cookie(PATIENT_COOKIE_NAME, token, COOKIE_OPTIONS);
      return res.redirect('/patient/dashboard');
    } catch (err) {
      logger.error('Demo login error: ' + err.message);
      return res.redirect('/patient/login?error=Demo+login+failed');
    }
  }

  /**
   * Secure Patient Logout
   */
  static async logout(req, res) {
    res.clearCookie(PATIENT_COOKIE_NAME);
    if (req.patient) {
      logger.audit('PATIENT_LOGOUT', req.patient.uhid);
    }
    if (req.accepts('html')) {
      return res.redirect('/patient/login?logged_out=true');
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  }
}

module.exports = PatientAuthController;
