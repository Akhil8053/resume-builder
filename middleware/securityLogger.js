const firestoreStore = require('../db/firestoreStore');
const db = require('../db/database');

function logSecurityEvent(userId, eventType, severity = 'low', req = null, details = '') {
  try {
    // 1. Log to Cloud Firestore securityEvents collection
    firestoreStore.logSecurityEvent(userId, eventType, severity, req, details);

    // 2. Keep local SQLite audit log in sync if available
    try {
      if (db && typeof db.prepare === 'function') {
        const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';
        const userAgent = req ? (req.headers['user-agent'] || 'Unknown') : 'System Internal';
        db.prepare(`
          INSERT INTO security_events (user_id, event_type, severity, ip_address, user_agent, details)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId || null, eventType, severity, ip, userAgent, typeof details === 'object' ? JSON.stringify(details) : String(details || ''));
      }
    } catch {}
  } catch (error) {
    console.error('Failed to log security event:', error.message);
  }
}

module.exports = { logSecurityEvent };
