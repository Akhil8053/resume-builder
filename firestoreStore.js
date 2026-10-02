/**
 * SecureCV — Cloud Firestore Persistence Layer
 * Implements collections: users, profiles, resumes, jobs, applications,
 * savedJobs, privacySettings, securityEvents, sessions.
 */

const { db, auth, isMockMode } = require('./firebase');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// In-Memory store for offline development / test mode
const inMemoryStore = {
  users: new Map(),
  profiles: new Map(),
  resumes: new Map(),
  jobs: new Map(),
  applications: new Map(),
  savedJobs: new Map(),
  privacySettings: new Map(),
  securityEvents: [],
  sessions: new Map(),
  failedLoginAttempts: []
};

// Seed default users in memory for instant local viva demonstration
function seedInMemoryData() {
  const salt = bcrypt.genSaltSync(10);

  // Admin
  inMemoryStore.users.set('admin_1', {
    id: 'admin_1',
    username: 'admin',
    name: 'Master Administrator',
    email: 'admin@securecv.io',
    passwordHash: bcrypt.hashSync('admin@524', salt), // Auth validation only, never returned
    role: 'admin',
    isActive: true,
    emailVerified: true,
    twoFactorEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Recruiter
  inMemoryStore.users.set('recruiter_1', {
    id: 'recruiter_1',
    username: 'recruiter',
    name: 'Sarah Jenkins (Lead Recruiter)',
    email: 'recruiter@cyberfort.com',
    passwordHash: bcrypt.hashSync('RecruiterPass@2026', salt),
    role: 'recruiter',
    isActive: true,
    emailVerified: true,
    twoFactorEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Candidate: Akhil
  inMemoryStore.users.set('seeker_akhil', {
    id: 'seeker_akhil',
    username: 'akhil',
    name: 'Akhil G. (Job Seeker)',
    email: 'akhil@student.edu',
    passwordHash: bcrypt.hashSync('SecurePassword@2026', salt),
    role: 'job_seeker',
    isActive: true,
    emailVerified: true,
    twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Candidate: Demo
  inMemoryStore.users.set('seeker_demo', {
    id: 'seeker_demo',
    username: 'demo',
    name: 'Alex Morgan (Job Seeker)',
    email: 'demo@securecv.io',
    passwordHash: bcrypt.hashSync('DemoUser@2026', salt),
    role: 'job_seeker',
    isActive: true,
    emailVerified: true,
    twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Privacy Settings for Akhil
  inMemoryStore.privacySettings.set('seeker_akhil', {
    id: 'seeker_akhil',
    userId: 'seeker_akhil',
    resumeVisibility: 'recruiters_only',
    profileVisibility: 'recruiters_only',
    shareContactInfo: 1,
    shareProjectLinks: 1,
    consentDataProcessing: 1,
    consentAnalytics: 0,
    updatedAt: new Date().toISOString()
  });

  // Privacy Settings for Demo
  inMemoryStore.privacySettings.set('seeker_demo', {
    id: 'seeker_demo',
    userId: 'seeker_demo',
    resumeVisibility: 'public',
    profileVisibility: 'public',
    shareContactInfo: 1,
    shareProjectLinks: 1,
    consentDataProcessing: 1,
    consentAnalytics: 1,
    updatedAt: new Date().toISOString()
  });

  // Sample Resume 1 for Akhil
  const resume1Id = 'res_akhil_cyber';
  inMemoryStore.resumes.set(resume1Id, {
    id: resume1Id,
    userId: 'seeker_akhil',
    title: 'Cyber Security & AppSec Specialist Resume',
    templateId: 'cyber',
    summary: 'Analytical and security-minded 3rd-year B.Tech Cyber Security undergraduate with practical expertise in secure software development lifecycle (SSDLC), vulnerability assessment, network penetration testing, and modern full-stack web architectures.',
    fullName: 'Akhil G.',
    professionalTitle: 'Cyber Security Analyst & Secure Systems Developer',
    email: 'akhil@student.edu',
    phone: '+91 98765 43210',
    location: 'Hyderabad, India',
    linkedin: 'https://linkedin.com/in/akhil-cybersec',
    github: 'https://github.com/akhil-security',
    portfolio: 'https://akhil-secfolio.dev',
    sections: [
      {
        sectionType: 'education',
        items: [
          {
            institution: 'National Institute of Technology',
            degree: 'Bachelor of Technology (B.Tech)',
            field: 'Computer Science & Cyber Security',
            start_year: '2023',
            end_year: '2027 (Expected)',
            grade: 'CGPA: 8.9 / 10.0'
          }
        ]
      },
      {
        sectionType: 'experience',
        items: [
          {
            company: 'CyberDefense SOC Labs',
            position: 'Cyber Security & Vulnerability Assessment Intern',
            start_date: 'June 2025',
            end_date: 'August 2025',
            description: 'Conducted automated and manual vulnerability scans on 15+ web endpoints using OWASP ZAP and Burp Suite. Prepared remediation reports that mitigated 3 High-severity SQLi & XSS flaws.'
          }
        ]
      },
      {
        sectionType: 'skills',
        items: [
          {
            category: 'Application Security',
            skills: ['OWASP Top 10', 'Burp Suite', 'Bcrypt Cryptography', 'Input Sanitization', 'JWT Authentication', 'RBAC Authorization']
          },
          {
            category: 'Software Engineering',
            skills: ['Node.js', 'Express.js', 'Cloud Firestore', 'JavaScript (ES6+)', 'REST APIs', 'Git', 'Vercel']
          }
        ]
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Sample Jobs
  const job1Id = 'job_cyber_analyst';
  inMemoryStore.jobs.set(job1Id, {
    id: job1Id,
    recruiterId: 'recruiter_1',
    title: 'Junior SOC Analyst & Threat Hunter',
    company: 'Fortress CyberShield Global',
    location: 'Remote / Bengaluru, India',
    workType: 'Remote',
    experienceLevel: 'Entry Level',
    salaryRange: '₹6,50,000 - ₹9,00,000 PA',
    category: 'Cybersecurity',
    description: 'Looking for a motivated Cyber Security graduate to join our 24/7 Security Operations Center (SOC).',
    responsibilities: 'Monitor SIEM alerts, triage suspicious incident logs, conduct initial root cause investigation.',
    requirements: 'Strong foundational knowledge of TCP/IP, OSI model, Linux commands, OWASP Top 10 vulnerabilities, and security log analysis.',
    requiredSkills: 'SIEM, Log Analysis, OWASP Top 10, Network Security, Python, Incident Response',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const job2Id = 'job_fs_dev';
  inMemoryStore.jobs.set(job2Id, {
    id: job2Id,
    recruiterId: 'recruiter_1',
    title: 'Full Stack Web Developer (Node.js & Cloud)',
    company: 'Nexus Software Technologies',
    location: 'Hyderabad, India',
    workType: 'Hybrid',
    experienceLevel: 'Entry Level',
    salaryRange: '₹5,50,000 - ₹8,00,000 PA',
    category: 'Software Engineering',
    description: 'Seeking an enthusiastic Full Stack Software Engineer to build scalable web platforms.',
    responsibilities: 'Develop REST APIs, design relational and NoSQL schemas, implement responsive UI.',
    requirements: 'Proficiency in JavaScript (Node.js, Express), HTML/CSS, SQL or NoSQL databases, Git, and deployment.',
    requiredSkills: 'Node.js, Express, JavaScript, REST APIs, HTML5, CSS3, SQL, Firebase',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Sample Application for Akhil
  inMemoryStore.applications.set('app_akhil_job1', {
    id: 'app_akhil_job1',
    userId: 'seeker_akhil',
    jobId: job1Id,
    resumeId: resume1Id,
    coverLetter: 'I am excited to submit my application for the Junior SOC Analyst opening at Fortress CyberShield Global.',
    status: 'Under Review',
    statusUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  });
}

seedInMemoryData();

// Helper to strip sensitive internal fields before returning user data
function sanitizeUserData(user) {
  if (!user) return null;
  const { passwordHash, ...cleanUser } = user;
  return cleanUser;
}

const firestoreStore = {
  // =========================================================================
  // 1. USERS & PROFILES
  // =========================================================================
  async findUserById(id) {
    if (!id) return null;
    if (isMockMode || !db) {
      const u = inMemoryStore.users.get(String(id));
      return u ? { ...u } : null;
    }
    const doc = await db.collection('users').doc(String(id)).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async findUserByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    if (isMockMode || !db) {
      for (const u of inMemoryStore.users.values()) {
        if (u.email && u.email.toLowerCase() === cleanEmail) {
          return { ...u };
        }
      }
      return null;
    }
    const snapshot = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  async findUserByUsername(username) {
    if (!username) return null;
    const cleanUsername = username.trim().toLowerCase();
    if (isMockMode || !db) {
      for (const u of inMemoryStore.users.values()) {
        if (u.username && u.username.toLowerCase() === cleanUsername) {
          return { ...u };
        }
      }
      return null;
    }
    const snapshot = await db.collection('users').where('username', '==', cleanUsername).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  async createUser(userData) {
    const id = userData.id || `usr_${crypto.randomBytes(8).toString('hex')}`;
    const userDoc = {
      id,
      username: userData.username || userData.email.split('@')[0],
      name: userData.name,
      email: userData.email.trim().toLowerCase(),
      role: userData.role || 'job_seeker',
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      emailVerified: userData.emailVerified || false,
      twoFactorEnabled: userData.twoFactorEnabled || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isMockMode || !db) {
      // In offline mock mode, store password hash in memory for local demo verification
      if (userData.password) {
        const salt = bcrypt.genSaltSync(10);
        userDoc.passwordHash = bcrypt.hashSync(userData.password, salt);
      } else if (userData.passwordHash) {
        userDoc.passwordHash = userData.passwordHash;
      }
      inMemoryStore.users.set(id, userDoc);

      // Create default profile and privacy settings
      inMemoryStore.profiles.set(id, {
        userId: id,
        fullName: userDoc.name,
        email: userDoc.email,
        updatedAt: new Date().toISOString()
      });

      inMemoryStore.privacySettings.set(id, {
        id,
        userId: id,
        resumeVisibility: 'recruiters_only',
        profileVisibility: 'recruiters_only',
        shareContactInfo: 1,
        shareProjectLinks: 1,
        consentDataProcessing: 1,
        consentAnalytics: 0,
        updatedAt: new Date().toISOString()
      });

      return sanitizeUserData(userDoc);
    }

    // In live Firestore mode: Store user record without password!
    await db.collection('users').doc(id).set(userDoc);

    // Initialize profile and privacy settings documents
    await db.collection('profiles').doc(id).set({
      userId: id,
      fullName: userDoc.name,
      email: userDoc.email,
      updatedAt: new Date().toISOString()
    });

    await db.collection('privacySettings').doc(id).set({
      id,
      userId: id,
      resumeVisibility: 'recruiters_only',
      profileVisibility: 'recruiters_only',
      shareContactInfo: 1,
      shareProjectLinks: 1,
      consentDataProcessing: 1,
      consentAnalytics: 0,
      updatedAt: new Date().toISOString()
    });

    return sanitizeUserData(userDoc);
  },

  async updateUser(id, updateData) {
    const data = { ...updateData, updatedAt: new Date().toISOString() };
    if (isMockMode || !db) {
      const existing = inMemoryStore.users.get(String(id));
      if (!existing) return null;
      const updated = { ...existing, ...data };
      inMemoryStore.users.set(String(id), updated);
      return sanitizeUserData(updated);
    }
    await db.collection('users').doc(String(id)).update(data);
    return this.findUserById(id);
  },

  async getAllUsers() {
    if (isMockMode || !db) {
      return Array.from(inMemoryStore.users.values()).map(sanitizeUserData);
    }
    const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  // =========================================================================
  // 2. RESUMES
  // =========================================================================
  async getResumesByUserId(userId) {
    if (!userId) return [];
    if (isMockMode || !db) {
      return Array.from(inMemoryStore.resumes.values()).filter((r) => r.userId === String(userId));
    }
    const snapshot = await db.collection('resumes').where('userId', '==', String(userId)).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  async getResumeById(id) {
    if (!id) return null;
    if (isMockMode || !db) {
      const r = inMemoryStore.resumes.get(String(id));
      return r ? { ...r } : null;
    }
    const doc = await db.collection('resumes').doc(String(id)).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async createResume(resumeData) {
    const id = resumeData.id || `res_${crypto.randomBytes(8).toString('hex')}`;
    const newResume = {
      id,
      userId: String(resumeData.userId),
      title: resumeData.title || 'Untitled Resume',
      templateId: resumeData.templateId || 'minimal',
      summary: resumeData.summary || '',
      fullName: resumeData.fullName || '',
      professionalTitle: resumeData.professionalTitle || '',
      email: resumeData.email || '',
      phone: resumeData.phone || '',
      location: resumeData.location || '',
      linkedin: resumeData.linkedin || '',
      github: resumeData.github || '',
      portfolio: resumeData.portfolio || '',
      sections: resumeData.sections || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isMockMode || !db) {
      inMemoryStore.resumes.set(id, newResume);
      return newResume;
    }
    await db.collection('resumes').doc(id).set(newResume);
    return newResume;
  },

  async updateResume(id, resumeData) {
    const updateData = { ...resumeData, updatedAt: new Date().toISOString() };
    if (isMockMode || !db) {
      const existing = inMemoryStore.resumes.get(String(id));
      if (!existing) return null;
      const updated = { ...existing, ...updateData };
      inMemoryStore.resumes.set(String(id), updated);
      return updated;
    }
    await db.collection('resumes').doc(String(id)).update(updateData);
    return this.getResumeById(id);
  },

  async deleteResume(id) {
    if (isMockMode || !db) {
      return inMemoryStore.resumes.delete(String(id));
    }
    await db.collection('resumes').doc(String(id)).delete();
    return true;
  },

  // =========================================================================
  // 3. JOBS & SAVED JOBS
  // =========================================================================
  async getAllJobs(filters = {}) {
    let jobList = [];
    if (isMockMode || !db) {
      jobList = Array.from(inMemoryStore.jobs.values());
    } else {
      const snapshot = await db.collection('jobs').get();
      jobList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    if (filters.status) {
      jobList = jobList.filter((j) => j.status === filters.status);
    }
    if (filters.category && filters.category !== 'all') {
      jobList = jobList.filter((j) => j.category && j.category.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.workType && filters.workType !== 'all') {
      jobList = jobList.filter((j) => j.workType && j.workType.toLowerCase() === filters.workType.toLowerCase());
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      jobList = jobList.filter((j) =>
        (j.title && j.title.toLowerCase().includes(s)) ||
        (j.company && j.company.toLowerCase().includes(s)) ||
        (j.requiredSkills && j.requiredSkills.toLowerCase().includes(s))
      );
    }
    return jobList;
  },

  async getJobById(id) {
    if (!id) return null;
    if (isMockMode || !db) {
      const j = inMemoryStore.jobs.get(String(id));
      return j ? { ...j } : null;
    }
    const doc = await db.collection('jobs').doc(String(id)).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async createJob(jobData) {
    const id = jobData.id || `job_${crypto.randomBytes(8).toString('hex')}`;
    const newJob = {
      id,
      recruiterId: String(jobData.recruiterId),
      title: jobData.title,
      company: jobData.company,
      location: jobData.location,
      workType: jobData.workType || 'Remote',
      experienceLevel: jobData.experienceLevel || 'Mid-Level',
      salaryRange: jobData.salaryRange || '',
      category: jobData.category || 'Cybersecurity',
      description: jobData.description || '',
      responsibilities: jobData.responsibilities || '',
      requirements: jobData.requirements || '',
      requiredSkills: jobData.requiredSkills || '',
      status: jobData.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isMockMode || !db) {
      inMemoryStore.jobs.set(id, newJob);
      return newJob;
    }
    await db.collection('jobs').doc(id).set(newJob);
    return newJob;
  },

  async updateJob(id, updateData) {
    const data = { ...updateData, updatedAt: new Date().toISOString() };
    if (isMockMode || !db) {
      const existing = inMemoryStore.jobs.get(String(id));
      if (!existing) return null;
      const updated = { ...existing, ...data };
      inMemoryStore.jobs.set(String(id), updated);
      return updated;
    }
    await db.collection('jobs').doc(String(id)).update(data);
    return this.getJobById(id);
  },

  async getJobsByRecruiter(recruiterId) {
    if (!recruiterId) return [];
    if (isMockMode || !db) {
      return Array.from(inMemoryStore.jobs.values()).filter((j) => j.recruiterId === String(recruiterId));
    }
    const snapshot = await db.collection('jobs').where('recruiterId', '==', String(recruiterId)).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  // Saved Jobs
  async getSavedJobs(userId) {
    if (!userId) return [];
    if (isMockMode || !db) {
      const saved = Array.from(inMemoryStore.savedJobs.values()).filter((s) => s.userId === String(userId));
      return saved.map((s) => ({
        ...s,
        job: inMemoryStore.jobs.get(s.jobId) || null
      }));
    }
    const snapshot = await db.collection('savedJobs').where('userId', '==', String(userId)).get();
    const saved = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const results = [];
    for (const s of saved) {
      const job = await this.getJobById(s.jobId);
      results.push({ ...s, job });
    }
    return results;
  },

  async saveJob(userId, jobId) {
    const id = `${userId}_${jobId}`;
    const record = { id, userId: String(userId), jobId: String(jobId), createdAt: new Date().toISOString() };
    if (isMockMode || !db) {
      inMemoryStore.savedJobs.set(id, record);
      return record;
    }
    await db.collection('savedJobs').doc(id).set(record);
    return record;
  },

  async removeSavedJob(userId, jobId) {
    const id = `${userId}_${jobId}`;
    if (isMockMode || !db) {
      return inMemoryStore.savedJobs.delete(id);
    }
    await db.collection('savedJobs').doc(id).delete();
    return true;
  },

  async isJobSaved(userId, jobId) {
    const id = `${userId}_${jobId}`;
    if (isMockMode || !db) {
      return inMemoryStore.savedJobs.has(id);
    }
    const doc = await db.collection('savedJobs').doc(id).get();
    return doc.exists;
  },

  // =========================================================================
  // 4. APPLICATIONS
  // =========================================================================
  async createApplication(appData) {
    const id = appData.id || `app_${crypto.randomBytes(8).toString('hex')}`;
    const newApp = {
      id,
      userId: String(appData.userId),
      jobId: String(appData.jobId),
      resumeId: appData.resumeId ? String(appData.resumeId) : null,
      coverLetter: appData.coverLetter || '',
      additionalInfo: appData.additionalInfo || '',
      status: 'Applied',
      statusUpdatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    if (isMockMode || !db) {
      inMemoryStore.applications.set(id, newApp);
      return newApp;
    }
    await db.collection('applications').doc(id).set(newApp);
    return newApp;
  },

  async getApplicationsByUser(userId) {
    if (!userId) return [];
    let apps = [];
    if (isMockMode || !db) {
      apps = Array.from(inMemoryStore.applications.values()).filter((a) => a.userId === String(userId));
    } else {
      const snapshot = await db.collection('applications').where('userId', '==', String(userId)).get();
      apps = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    // Enrich with job info
    const enriched = [];
    for (const a of apps) {
      const job = await this.getJobById(a.jobId);
      enriched.push({
        ...a,
        job_title: job ? job.title : 'Position',
        company: job ? job.company : 'Company',
        location: job ? job.location : 'Location'
      });
    }
    return enriched;
  },

  async getApplicationsByJob(jobId) {
    if (!jobId) return [];
    let apps = [];
    if (isMockMode || !db) {
      apps = Array.from(inMemoryStore.applications.values()).filter((a) => a.jobId === String(jobId));
    } else {
      const snapshot = await db.collection('applications').where('jobId', '==', String(jobId)).get();
      apps = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    const enriched = [];
    for (const a of apps) {
      const applicantUser = await this.findUserById(a.userId);
      const privacy = await this.getPrivacySettings(a.userId);
      const resume = a.resumeId ? await this.getResumeById(a.resumeId) : null;

      // Apply Privacy Masking
      const shareContact = privacy ? privacy.shareContactInfo === 1 || privacy.shareContactInfo === true : true;
      enriched.push({
        ...a,
        applicant_name: applicantUser ? applicantUser.name : 'Candidate',
        applicant_email: shareContact && applicantUser ? applicantUser.email : '***@protected-candidate.cv',
        applicant_phone: shareContact && resume ? resume.phone : '[Contact Masked for Candidate Privacy]',
        resume_title: resume ? resume.title : 'Attached CV'
      });
    }
    return enriched;
  },

  async getApplicationById(id) {
    if (!id) return null;
    if (isMockMode || !db) {
      const a = inMemoryStore.applications.get(String(id));
      return a ? { ...a } : null;
    }
    const doc = await db.collection('applications').doc(String(id)).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async updateApplicationStatus(id, status) {
    const update = { status, statusUpdatedAt: new Date().toISOString() };
    if (isMockMode || !db) {
      const a = inMemoryStore.applications.get(String(id));
      if (!a) return null;
      const updated = { ...a, ...update };
      inMemoryStore.applications.set(String(id), updated);
      return updated;
    }
    await db.collection('applications').doc(String(id)).update(update);
    return this.getApplicationById(id);
  },

  // =========================================================================
  // 5. PRIVACY SETTINGS
  // =========================================================================
  async getPrivacySettings(userId) {
    if (!userId) return null;
    if (isMockMode || !db) {
      return inMemoryStore.privacySettings.get(String(userId)) || {
        userId: String(userId),
        resumeVisibility: 'recruiters_only',
        profileVisibility: 'recruiters_only',
        shareContactInfo: 1,
        shareProjectLinks: 1,
        consentDataProcessing: 1,
        consentAnalytics: 0
      };
    }
    const doc = await db.collection('privacySettings').doc(String(userId)).get();
    if (!doc.exists) {
      return {
        userId: String(userId),
        resumeVisibility: 'recruiters_only',
        profileVisibility: 'recruiters_only',
        shareContactInfo: 1,
        shareProjectLinks: 1,
        consentDataProcessing: 1,
        consentAnalytics: 0
      };
    }
    return { id: doc.id, ...doc.data() };
  },

  async upsertPrivacySettings(userId, settings) {
    const docData = {
      userId: String(userId),
      resumeVisibility: settings.resumeVisibility || 'recruiters_only',
      profileVisibility: settings.profileVisibility || 'recruiters_only',
      shareContactInfo: settings.shareContactInfo !== undefined ? Number(settings.shareContactInfo) : 1,
      shareProjectLinks: settings.shareProjectLinks !== undefined ? Number(settings.shareProjectLinks) : 1,
      consentDataProcessing: settings.consentDataProcessing !== undefined ? Number(settings.consentDataProcessing) : 1,
      consentAnalytics: settings.consentAnalytics !== undefined ? Number(settings.consentAnalytics) : 0,
      updatedAt: new Date().toISOString()
    };

    if (isMockMode || !db) {
      inMemoryStore.privacySettings.set(String(userId), docData);
      return docData;
    }
    await db.collection('privacySettings').doc(String(userId)).set(docData, { merge: true });
    return docData;
  },

  // =========================================================================
  // 6. SECURITY EVENTS (IMMUTABLE AUDIT LOGS)
  // =========================================================================
  async logSecurityEvent(userId, eventType, severity, req, details) {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';
    const userAgent = req ? (req.headers['user-agent'] || 'Unknown') : 'System Agent';

    const event = {
      id: `sec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      userId: userId ? String(userId) : null,
      eventType,
      severity: severity || 'low',
      ipAddress: ip,
      userAgent: userAgent,
      details: typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
      createdAt: new Date().toISOString()
    };

    if (isMockMode || !db) {
      inMemoryStore.securityEvents.unshift(event);
      if (inMemoryStore.securityEvents.length > 500) inMemoryStore.securityEvents.pop();
      return event;
    }

    try {
      await db.collection('securityEvents').add(event);
    } catch (e) {
      console.warn('Audit event log warning:', e.message);
    }
    return event;
  },

  async getSecurityEventsByUser(userId, limit = 50) {
    if (isMockMode || !db) {
      return inMemoryStore.securityEvents
        .filter((e) => e.userId === String(userId))
        .slice(0, limit);
    }
    try {
      const snapshot = await db.collection('securityEvents')
        .where('userId', '==', String(userId))
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      try {
        const snapshot = await db.collection('securityEvents')
          .where('userId', '==', String(userId))
          .limit(limit)
          .get();
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return docs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      } catch {
        return [];
      }
    }
  },

  async getAllSecurityEvents(limit = 100) {
    if (isMockMode || !db) {
      return inMemoryStore.securityEvents.slice(0, limit);
    }
    const snapshot = await db.collection('securityEvents')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  // =========================================================================
  // 7. SESSIONS (STATEFUL REVOCATION)
  // =========================================================================
  async createSession(sessionData) {
    const token = sessionData.sessionToken;
    const sessionDoc = {
      id: token,
      userId: String(sessionData.userId),
      sessionToken: token,
      ipAddress: sessionData.ipAddress || '127.0.0.1',
      userAgent: sessionData.userAgent || 'Web Browser',
      deviceName: sessionData.deviceName || 'Desktop Workstation',
      isRevoked: 0,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    if (isMockMode || !db) {
      inMemoryStore.sessions.set(token, sessionDoc);
      return sessionDoc;
    }
    await db.collection('sessions').doc(token).set(sessionDoc);
    return sessionDoc;
  },

  async getSession(token) {
    if (!token) return null;
    if (isMockMode || !db) {
      return inMemoryStore.sessions.get(token) || null;
    }
    const doc = await db.collection('sessions').doc(token).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async revokeSession(token) {
    if (!token) return false;
    if (isMockMode || !db) {
      const s = inMemoryStore.sessions.get(token);
      if (s) {
        s.isRevoked = 1;
        return true;
      }
      return false;
    }
    await db.collection('sessions').doc(token).update({ isRevoked: 1 });
    return true;
  },

  async revokeAllOtherSessions(userId, currentToken) {
    if (!userId) return 0;
    let count = 0;
    if (isMockMode || !db) {
      for (const [token, s] of inMemoryStore.sessions.entries()) {
        if (s.userId === String(userId) && token !== currentToken && s.isRevoked === 0) {
          s.isRevoked = 1;
          count++;
        }
      }
      return count;
    }
    const snapshot = await db.collection('sessions')
      .where('userId', '==', String(userId))
      .where('isRevoked', '==', 0)
      .get();

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      if (doc.id !== currentToken) {
        batch.update(doc.ref, { isRevoked: 1 });
        count++;
      }
    }
    await batch.commit();
    return count;
  },

  async getUserActiveSessions(userId) {
    if (!userId) return [];
    if (isMockMode || !db) {
      return Array.from(inMemoryStore.sessions.values()).filter(
        (s) => s.userId === String(userId) && s.isRevoked === 0
      );
    }
    const snapshot = await db.collection('sessions')
      .where('userId', '==', String(userId))
      .where('isRevoked', '==', 0)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  async updateSessionActivity(token) {
    if (!token) return;
    if (isMockMode || !db) {
      const s = inMemoryStore.sessions.get(token);
      if (s) s.lastActive = new Date().toISOString();
      return;
    }
    try {
      await db.collection('sessions').doc(token).update({ lastActive: new Date().toISOString() });
    } catch {}
  },

  // =========================================================================
  // 8. BRUTE FORCE RATE LIMITING
  // =========================================================================
  async recordFailedLogin(email, ip) {
    const record = {
      email: (email || '').trim().toLowerCase(),
      ipAddress: ip || '127.0.0.1',
      attemptTime: Date.now()
    };
    inMemoryStore.failedLoginAttempts.push(record);
    if (!isMockMode && db) {
      try {
        await db.collection('failedLoginAttempts').add({
          ...record,
          createdAt: new Date().toISOString()
        });
      } catch {}
    }
  },

  async getRecentFailedAttempts(email, windowMinutes = 15) {
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    const cleanEmail = (email || '').trim().toLowerCase();
    return inMemoryStore.failedLoginAttempts.filter(
      (a) => a.email === cleanEmail && a.attemptTime >= cutoff
    ).length;
  },

  async clearFailedLogins(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    inMemoryStore.failedLoginAttempts = inMemoryStore.failedLoginAttempts.filter(
      (a) => a.email !== cleanEmail
    );
  }
};

module.exports = firestoreStore;
