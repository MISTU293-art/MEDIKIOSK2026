const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY, COOKIE_NAME, COOKIE_OPTIONS } = require('../config/auth');
const logger = require('../utils/logger');

exports.getLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Institutional Access — MediKiosk AYUSH',
    error: req.query.error || null,
    expired: req.query.expired === 'true',
    logged_out: req.query.logged_out === 'true',
    redirect: req.query.redirect || ''
  });
};

exports.postLogin = async (req, res) => {
  try {
    const { email, password, redirect } = req.body;
    if (!email || !password) {
      return res.status(400).render('auth/login', {
        title: 'Institutional Access — MediKiosk AYUSH',
        error: 'Email and password are required.',
        expired: false,
        logged_out: false,
        redirect
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user || !user.active) {
      logger.audit('LOGIN_FAILED', cleanEmail, { reason: 'User not found or inactive' });
      return res.status(401).render('auth/login', {
        title: 'Institutional Access — MediKiosk AYUSH',
        error: 'Invalid email credentials or account is inactive.',
        expired: false,
        logged_out: false,
        redirect
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.audit('LOGIN_FAILED', cleanEmail, { reason: 'Password mismatch' });
      return res.status(401).render('auth/login', {
        title: 'Institutional Access — MediKiosk AYUSH',
        error: 'Invalid password. Please enter correct credentials.',
        expired: false,
        logged_out: false,
        redirect
      });
    }

    const accessToken = jwt.sign(
      { id: user._id, role: user.role, name: user.name, department: user.department },
      JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
    res.cookie('medikiosk_access_token', accessToken, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    logger.audit('USER_LOGIN', user.email, { role: user.role, ip: req.ip });

    if (redirect && redirect.startsWith('/') && !redirect.startsWith('/auth')) {
      return res.redirect(redirect);
    }

    if (user.role === 'doctor') return res.redirect('/doctor/queue');
    if (user.role === 'admin') return res.redirect('/admin/dashboard');
    if (user.role === 'pharmacist') return res.redirect('/pharmacy');
    return res.redirect('/staff/dashboard');
  } catch (err) {
    logger.error('Login error: ' + err.message);
    return res.status(500).render('auth/login', {
      title: 'Institutional Access — MediKiosk AYUSH',
      error: 'An unexpected server error occurred during login.',
      expired: false,
      logged_out: false,
      redirect: req.body.redirect || ''
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies[COOKIE_NAME] || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.active) {
      return res.status(401).json({ success: false, error: 'Invalid user or account disabled' });
    }

    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role, name: user.name, department: user.department },
      JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    res.cookie('medikiosk_access_token', newAccessToken, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({ success: true, accessToken: newAccessToken });
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.clearCookie('medikiosk_access_token');
  if (req.user) {
    logger.audit('USER_LOGOUT', req.user.email);
  }
  if (req.accepts('html')) {
    return res.redirect('/auth/login?logged_out=true');
  }
  return res.json({ success: true, message: 'Logged out successfully' });
};

exports.getLogout = exports.logout;

exports.getMe = (req, res) => {
  return res.json({ success: true, user: req.user });
};
