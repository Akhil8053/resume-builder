const jwt = require('jsonwebtoken');
const firestoreStore = require('../db/firestoreStore');
const { auth } = require('../db/firebase');
const { logSecurityEvent } = require('./securityLogger');

const JWT_SECRET = process.env.JWT_SECRET || 'securecv_super_secret_jwt_key_2026_cybersecurity_grade_btech';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.'
    });
  }

  try {
    let userId = null;
    let userEmail = null;
    let decoded = null;

    // 1. Try Firebase Auth ID token verification if Firebase Admin is connected
    if (auth && typeof auth.verifyIdToken === 'function') {
      try {
        const fbDecoded = await auth.verifyIdToken(token);
        userId = fbDecoded.uid;
        userEmail = fbDecoded.email;
        decoded = fbDecoded;
      } catch (fbErr) {
        // Fall back to standard session token verification below
      }
    }

    // 2. If not a Firebase ID token, verify standard session JWT
    if (!userId) {
      decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
      userEmail = decoded.email;
    }

    // 3. Stateful session revocation check via Firestore Sessions collection
    const session = await firestoreStore.getSession(token);

    if (session) {
      if (session.isRevoked === 1 || session.isRevoked === true) {
        logSecurityEvent(userId, 'REVOKED_SESSION_ACCESS', 'high', req, 'Attempted access with a revoked session token.');
        return res.status(401).json({
          success: false,
          message: 'This session has been revoked for security. Please log in again.'
        });
      }
      await firestoreStore.updateSessionActivity(token);
    }

    // 4. Retrieve user record from Firestore users collection
    const user = await firestoreStore.findUserById(userId) || (userEmail ? await firestoreStore.findUserByEmail(userEmail) : null);

    if (!user || user.isActive === false || user.is_active === 0) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated or does not exist. Contact system administrator.'
      });
    }

    req.user = user;
    req.session = session || { id: token, sessionToken: token, userId: user.id };
    next();
  } catch (error) {
    logSecurityEvent(null, 'JWT_VERIFICATION_FAILED', 'medium', req, `Token error: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Authentication session expired or invalid. Please re-authenticate.'
    });
  }
}

async function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    let userId = null;
    let decoded = null;

    if (auth && typeof auth.verifyIdToken === 'function') {
      try {
        const fbDecoded = await auth.verifyIdToken(token);
        userId = fbDecoded.uid;
      } catch {}
    }

    if (!userId) {
      decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
    }

    const session = await firestoreStore.getSession(token);
    if (!session || (session.isRevoked !== 1 && session.isRevoked !== true)) {
      const user = await firestoreStore.findUserById(userId);
      req.user = user || null;
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }
  next();
}

module.exports = { authenticateToken, optionalAuthenticateToken, JWT_SECRET };
