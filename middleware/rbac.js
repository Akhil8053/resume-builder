const { logSecurityEvent } = require('./securityLogger');

/**
 * Role-Based Access Control Middleware
 * @param {string|string[]} roles - Single role or array of roles permitted to access endpoint
 */
function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required prior to authorization.'
      });
    }

    // Master Admin has universal access to all system resources
    if (req.user.role === 'admin') {
      return next();
    }

    if (!allowed.includes(req.user.role)) {
      logSecurityEvent(
        req.user.id,
        'RBAC_ACCESS_DENIED',
        'medium',
        req,
        `User with role '${req.user.role}' attempted unauthorized access to restricted resource requiring [${allowed.join(', ')}]. Path: ${req.originalUrl}`
      );

      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. You do not possess the required permission level [${allowed.join('/')}].`
      });
    }

    next();
  };
}

module.exports = { requireRole };
