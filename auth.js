const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const firestoreStore = require('../db/firestoreStore');
const { auth } = require('../db/firebase');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { checkLoginRateLimit, recordFailedLogin, clearFailedLogins } = require('../middleware/rateLimiter');
const { evaluatePasswordStrength, isValidEmail, sanitizeText } = require('../middleware/validation');
const { logSecurityEvent } = require('../middleware/securityLogger');

// 1. Password Strength Validation Endpoint (Live Feedback)
router.post('/validate-password', (req, res) => {
  const { password } = req.body;
  const analysis = evaluatePasswordStrength(password || '');
  res.json({ success: true, analysis });
});

// 2. Client Firebase Public Configuration
router.get('/firebase-config', (req, res) => {
  res.json({
    success: true,
    config: {
      apiKey: process.env.FIREBASE_API_KEY || '',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${process.env.FIREBASE_PROJECT_ID || 'securecv-platform'}.firebaseapp.com`,
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.FIREBASE_APP_ID || ''
    }
  });
});

// 3. User Registration (Firebase Authentication & Cloud Firestore)
router.post('/register', async (req, res) => {
  try {
    let { name, email, password, confirmPassword, role } = req.body;

    name = sanitizeText(name);
    email = (email || '').trim().toLowerCase();
    role = ['job_seeker', 'recruiter'].includes(role) ? role : 'job_seeker';

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const strength = evaluatePasswordStrength(password);
    if (!strength.passed) {
      return res.status(400).json({
        success: false,
        message: 'Password does not satisfy cybersecurity requirements: ' + strength.reasons.join(', ')
      });
    }

    // Check if user already exists in Firestore
    const existing = await firestoreStore.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
    }

    let userId = `usr_${crypto.randomBytes(8).toString('hex')}`;

    // Create Firebase Auth user if live Firebase Admin is connected
    if (auth && typeof auth.createUser === 'function') {
      try {
        const fbUser = await auth.createUser({
          email,
          password,
          displayName: name
        });
        userId = fbUser.uid;
        // Assign custom claims for RBAC
        await auth.setCustomUserClaims(userId, { role });
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-exists') {
          return res.status(409).json({ success: false, message: 'An account with this email address already exists in Firebase Auth.' });
        }
        console.warn('Firebase Auth creation notice:', authErr.message);
      }
    }

    // Hash password for offline / local auth check; never stored in Firestore documents
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // Create User Document in Cloud Firestore (NO password stored in Firestore)
    const newUser = await firestoreStore.createUser({
      id: userId,
      username: email.split('@')[0],
      name,
      email,
      role,
      passwordHash: passwordHash, // Stored in memory auth store only for offline verification
      isActive: true,
      emailVerified: false,
      twoFactorEnabled: false
    });

    // Create session token
    const token = jwt.sign(
      { id: userId, email, role, name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const userAgent = req.headers['user-agent'] || 'Web Browser';
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const deviceName = userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser';

    // Store stateful session in Firestore sessions collection
    await firestoreStore.createSession({
      sessionToken: token,
      userId,
      ipAddress: ip,
      userAgent,
      deviceName
    });

    logSecurityEvent(userId, 'REGISTER_SUCCESS', 'low', req, `New user registered with role: ${role}`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully with secure Firebase credentials.',
      token,
      user: {
        id: userId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        two_factor_enabled: 0
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during account registration.' });
  }
});

// 4. User Login (Protected with Rate Limiting)
router.post('/login', checkLoginRateLimit, async (req, res) => {
  try {
    const identifier = (req.body.email || req.body.username || '').trim().toLowerCase();
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Username or Email, and password are required.' });
    }

    let user = await firestoreStore.findUserByEmail(identifier);
    if (!user) {
      user = await firestoreStore.findUserByUsername(identifier);
    }

    if (!user) {
      recordFailedLogin(identifier, req);
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please verify username/email and password.' });
    }

    if (user.isActive === false || user.is_active === 0) {
      logSecurityEvent(user.id, 'DEACTIVATED_LOGIN_ATTEMPT', 'medium', req, 'Attempted login to deactivated account.');
      return res.status(403).json({ success: false, message: 'Account has been deactivated. Please contact admin.' });
    }

    // Verify Password: check in memory hash or standard passwords
    let passwordValid = false;
    if (user.passwordHash) {
      passwordValid = bcrypt.compareSync(password, user.passwordHash);
    } else {
      // Demo accounts fallback
      const demoPasswords = {
        'admin': 'admin@524',
        'admin@securecv.io': 'admin@524',
        'recruiter': 'RecruiterPass@2026',
        'recruiter@cyberfort.com': 'RecruiterPass@2026',
        'akhil': 'SecurePassword@2026',
        'akhil@student.edu': 'SecurePassword@2026',
        'demo': 'DemoUser@2026',
        'demo@securecv.io': 'DemoUser@2026'
      };
      passwordValid = demoPasswords[identifier] === password;
    }

    if (!passwordValid) {
      recordFailedLogin(identifier, req);
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please verify username/email and password.' });
    }

    // Reset rate limiter count on successful login
    clearFailedLogins(identifier, req);

    // Create session token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const userAgent = req.headers['user-agent'] || 'Web Browser';
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    let deviceName = 'Desktop Device';
    if (/Mobile|Android|iPhone/i.test(userAgent)) deviceName = 'Mobile Device';
    else if (/Macintosh/i.test(userAgent)) deviceName = 'macOS Desktop';
    else if (/Windows/i.test(userAgent)) deviceName = 'Windows PC';
    else if (/Linux/i.test(userAgent)) deviceName = 'Linux Workstation';

    // Store stateful session in Firestore sessions collection
    await firestoreStore.createSession({
      sessionToken: token,
      userId: user.id,
      ipAddress: ip,
      userAgent,
      deviceName
    });

    logSecurityEvent(user.id, 'LOGIN_SUCCESS', 'low', req, `User successfully authenticated via ${deviceName}`);

    res.json({
      success: true,
      message: 'Authentication verified successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        two_factor_enabled: user.twoFactorEnabled ? 1 : 0
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during authentication.' });
  }
});

// 5. User Logout (Revoke Session in Firestore)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.session ? (req.session.sessionToken || req.session.session_token || req.session.id) : null;
    if (token) {
      await firestoreStore.revokeSession(token);
    }
    logSecurityEvent(req.user.id, 'LOGOUT_SUCCESS', 'low', req, 'User session terminated and revoked in Firestore.');
    res.json({ success: true, message: 'Logged out successfully. Session invalidated.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Failed to terminate session.' });
  }
});

// 6. Current Authenticated Profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const privacy = await firestoreStore.getPrivacySettings(req.user.id);
    res.json({
      success: true,
      user: {
        ...req.user,
        two_factor_enabled: req.user.twoFactorEnabled ? 1 : (req.user.two_factor_enabled ? 1 : 0)
      },
      privacy: privacy || null
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed retrieving profile.' });
  }
});

// 7. Change Password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match.' });
    }

    const strength = evaluatePasswordStrength(newPassword);
    if (!strength.passed) {
      return res.status(400).json({
        success: false,
        message: 'New password does not meet security requirements: ' + strength.reasons.join(', ')
      });
    }

    // Update in Firebase Auth if live
    if (auth && typeof auth.updateUser === 'function') {
      try {
        await auth.updateUser(req.user.id, { password: newPassword });
      } catch (e) {
        console.warn('Firebase Auth password update notice:', e.message);
      }
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);
    await firestoreStore.updateUser(req.user.id, { passwordHash: newHash });

    logSecurityEvent(req.user.id, 'PASSWORD_CHANGED', 'low', req, 'Account password successfully updated with cryptographic salt.');

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Failed to update password.' });
  }
});

// 8. Toggle Two-Factor Authentication
router.post('/toggle-2fa', authenticateToken, async (req, res) => {
  try {
    const { enable } = req.body;
    const val = enable ? true : false;
    await firestoreStore.updateUser(req.user.id, { twoFactorEnabled: val });

    logSecurityEvent(
      req.user.id,
      val ? '2FA_ENABLED' : '2FA_DISABLED',
      val ? 'low' : 'medium',
      req,
      `Two-factor authentication ${val ? 'enabled' : 'disabled'}`
    );

    res.json({ success: true, two_factor_enabled: val ? 1 : 0, message: `Two-factor authentication ${val ? 'enabled' : 'disabled'}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update 2FA configuration.' });
  }
});

module.exports = router;
