const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resumes');
const jobRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');
const privacyRoutes = require('./routes/privacy');
const securityRoutes = require('./routes/security');
const adminRoutes = require('./routes/admin');
const recruiterRoutes = require('./routes/recruiter');
const testRoutes = require('./routes/tests');
const uploadRoutes = require('./routes/uploads');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers (Cyber Security Best Practice)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://fonts.gstatic.com https://*.firebaseio.com https://*.googleapis.com data: blob:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.identitytoolkit.googleapis.com;");
  next();
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing with payload size limits (denial of service mitigation)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Static frontend serving
app.use(express.static(path.join(__dirname, 'public')));
const uploadsStaticDir = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsStaticDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/recruiter', recruiterRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/uploads', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'SecureCV Career & Security Platform',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()) + 's'
  });
});

// SPA fallback: return index.html for non-API client routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API route not found.' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized Safe Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Exception:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An internal system error occurred. Please try again later.'
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🛡️  SecureCV Full-Stack Server Running on Port ${PORT}`);
    console.log(`🚀 Access Web Application: http://localhost:${PORT}`);
    console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`======================================================\n`);
  });
}

module.exports = app;
