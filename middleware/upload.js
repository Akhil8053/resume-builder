const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Use memory storage for direct cloud upload to Firebase Cloud Storage
const storage = multer.memoryStorage();

// Whitelist of allowed MIME types and extensions
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
];

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // 1. Validate extension against strict whitelist
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      new Error(`Security Alert: File extension '${ext}' is not permitted. Only PDF and DOCX documents are accepted.`),
      false
    );
  }

  // 2. Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new Error(`Security Alert: MIME type '${file.mimetype}' is not permitted. Suspicious or corrupted document detected.`),
      false
    );
  }

  // 3. Reject executable or script-like signatures in original name
  if (/\.(exe|sh|bat|cmd|vbs|js|php|py|jar|bin|pl)$/i.test(file.originalname)) {
    return cb(new Error('Security Alert: Malicious file execution signature detected.'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB maximum
  },
  fileFilter
});

module.exports = upload;
