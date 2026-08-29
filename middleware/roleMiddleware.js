/**
 * Role-Based Access Control (RBAC) Middleware
 * Allows multi-disciplinary clinical team access without abrupt redirects
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      if (req.accepts('html')) {
        return res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
      }
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    // 1. Superadmin has absolute universal bypass for all routes
    if (req.user.role === 'admin') {
      return next();
    }

    // 2. Direct role match
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    // 3. Clinical team cross-collaboration: Doctor and Staff can collaborate across queues
    const isClinicalStaff = ['doctor', 'staff', 'pharmacist'].includes(req.user.role);
    const isClinicalRoute = allowedRoles.some(r => ['doctor', 'staff', 'pharmacist'].includes(r));

    if (isClinicalStaff && isClinicalRoute) {
      return next();
    }

    // Restricted section
    if (req.accepts('html')) {
      return res.status(403).render('partials/error', {
        title: '403 - Access Restricted',
        message: `Your account role '${req.user.role}' is restricted from this section. Please login as an authorized role.`,
        user: req.user
      });
    }
    return res.status(403).json({
      success: false,
      error: `Access Denied: Role '${req.user.role}' does not have clearance for this section.`
    });
  };
};

module.exports = requireRole;
