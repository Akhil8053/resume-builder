const firestoreStore = require('../db/firestoreStore');
const db = require('../db/database');
const { logSecurityEvent } = require('./securityLogger');

const MAX_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
const LOCKOUT_MINUTES = parseInt(process.env.LOCKOUT_TIME_MINUTES || '15', 10);

async function checkLoginRateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const email = (req.body.email || '').trim().toLowerCase();

  try {
    // 1. Check in firestoreStore
    const failedCount = await firestoreStore.getRecentFailedAttempts(email, LOCKOUT_MINUTES);

    if (failedCount >= MAX_ATTEMPTS) {
      logSecurityEvent(
        null,
        'RATE_LIMIT_LOCKOUT',
        'high',
        req,
        `Login blocked: Exceeded ${MAX_ATTEMPTS} failed attempts for email '${email}' / IP ${ip}. Locked for ${LOCKOUT_MINUTES} minutes.`
      );

      return res.status(429).json({
        success: false,
        message: `Security Lockout: Too many failed authentication attempts. Account temporarily locked for ${LOCKOUT_MINUTES} minutes to protect against brute-force attacks.`,
        lockoutMinutes: LOCKOUT_MINUTES
      });
    }
  } catch (err) {
    console.warn('Rate limiter check notice:', err.message);
  }

  next();
}

function recordFailedLogin(email, req) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';
    const cleanEmail = (email || '').trim().toLowerCase();

    firestoreStore.recordFailedLogin(cleanEmail, ip);

    try {
      if (db && typeof db.prepare === 'function') {
        db.prepare(`
          INSERT INTO failed_login_attempts (email, ip_address)
          VALUES (?, ?)
        `).run(cleanEmail, ip);
      }
    } catch {}

    logSecurityEvent(null, 'LOGIN_FAILED', 'medium', req, `Failed authentication attempt for email: ${cleanEmail}`);
  } catch (error) {
    console.error('Failed to record failed login:', error.message);
  }
}

function clearFailedLogins(email, req) {
  try {
    const cleanEmail = (email || '').trim().toLowerCase();
    firestoreStore.clearFailedLogins(cleanEmail);

    try {
      if (db && typeof db.prepare === 'function') {
        const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';
        db.prepare(`
          DELETE FROM failed_login_attempts
          WHERE email = ? OR ip_address = ?
        `).run(cleanEmail, ip);
      }
    } catch {}
  } catch (error) {
    console.error('Failed to clear failed logins:', error.message);
  }
}

module.exports = {
  checkLoginRateLimit,
  recordFailedLogin,
  clearFailedLogins
};
