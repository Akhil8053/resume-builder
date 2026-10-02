/**
 * Input Validation & XSS Sanitization Utilities
 */

// Basic XSS Sanitization for user input strings
function sanitizeText(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:[^"']*/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<[^>]*>?/gm, (match) => {
      // Allow only basic line break or strip
      return match.toLowerCase() === '<br>' || match.toLowerCase() === '<br/>' ? '<br>' : '';
    })
    .trim();
}

// Deep sanitize object fields
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      clean[key] = sanitizeText(value);
    } else if (typeof value === 'object') {
      clean[key] = sanitizeObject(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

// Middleware to sanitize request body
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

// Evaluate Password Strength
function evaluatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { score: 0, strength: 'Weak', passed: false, reasons: ['Password is empty'] };
  }

  const reasons = [];
  let score = 0;

  if (password.length >= 8) score += 25;
  else reasons.push('At least 8 characters required');

  if (/[A-Z]/.test(password)) score += 25;
  else reasons.push('At least 1 uppercase letter required');

  if (/[a-z]/.test(password)) score += 15;
  else reasons.push('At least 1 lowercase letter required');

  if (/[0-9]/.test(password)) score += 20;
  else reasons.push('At least 1 digit required');

  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 15;
  else reasons.push('At least 1 special character required');

  let strength = 'Weak';
  if (score >= 85) strength = 'Strong';
  else if (score >= 50) strength = 'Medium';

  return {
    score,
    strength,
    passed: score >= 75 && reasons.length === 0,
    reasons
  };
}

// Email Validator
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
}

module.exports = {
  sanitizeText,
  sanitizeObject,
  sanitizeBody,
  evaluatePasswordStrength,
  isValidEmail
};
