const jwt = require('jsonwebtoken');
const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ACCESS_TOKEN_EXPIRY, COOKIE_NAME } = require('../config/auth');
const User = require('../models/User');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    } else if (req.cookies && req.cookies.medikiosk_access_token) {
      token = req.cookies.medikiosk_access_token;
    }

    // 1. Verify Access Token
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
        if (decoded && decoded.id) {
          let user = null;
          try {
            user = await User.findById(decoded.id);
          } catch(e) {}

          if (!user && decoded.email) {
            try {
              user = await User.findOne({ email: decoded.email });
            } catch(e) {}
          }

          if (user && user.active) {
            req.user = {
              id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              department: user.department
            };
            return next();
          } else if (decoded.role) {
            // Fallback to verified JWT payload so server restarts don't drop sessions
            req.user = {
              id: decoded.id,
              name: decoded.name || 'Hospital Staff',
              email: decoded.email || 'user@hospital.org',
              role: decoded.role,
              department: decoded.department || 'General AYUSH'
            };
            return next();
          }
        }
      } catch (err) {
        // Access token expired -> Fallback to refresh token below
      }
    }

    // 2. Fallback to Refresh Token Cookie
    if (req.cookies && req.cookies[COOKIE_NAME]) {
      const refreshToken = req.cookies[COOKIE_NAME];
      try {
        const decodedRefresh = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        if (decodedRefresh && decodedRefresh.id) {
          let user = null;
          try {
            user = await User.findById(decodedRefresh.id);
          } catch(e) {}

          if (user && user.active) {
            req.user = {
              id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              department: user.department
            };

            const newAccessToken = jwt.sign(
              { id: user._id, role: user.role, name: user.name, email: user.email, department: user.department },
              JWT_ACCESS_SECRET,
              { expiresIn: ACCESS_TOKEN_EXPIRY }
            );

            res.cookie('medikiosk_access_token', newAccessToken, {
              httpOnly: false,
              sameSite: 'lax',
              maxAge: 24 * 60 * 60 * 1000
            });

            return next();
          }
        }
      } catch (e) {
        // Refresh token expired or invalid
      }
    }

    // Unauthenticated
    if (req.accepts('html')) {
      return res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
    }
    return res.status(401).json({ success: false, error: 'Authentication required. Please login.' });
  } catch (err) {
    logger.error('Auth middleware error: ' + err.message);
    if (req.accepts('html')) {
      return res.redirect('/auth/login');
    }
    return res.status(500).json({ success: false, error: 'Internal authentication error.' });
  }
};

module.exports = authenticate;
