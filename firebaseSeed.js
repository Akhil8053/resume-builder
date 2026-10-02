/**
 * SecureCV — Firebase Cloud Firestore & Auth Migration / Seeder
 * Populates Firestore collections and Firebase Auth with demo accounts & career data.
 */

const { db, auth, isMockMode } = require('./firebase');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function seedFirebase() {
  console.log('🌱 Starting Firebase Migration & Seeding for SecureCV...');

  const salt = bcrypt.genSaltSync(10);
  const demoUsers = [
    {
      id: 'admin_1',
      username: 'admin',
      name: 'Master Administrator',
      email: 'admin@securecv.io',
      password: 'admin@524',
      role: 'admin',
      isActive: true,
      emailVerified: true,
      twoFactorEnabled: true
    },
    {
      id: 'recruiter_1',
      username: 'recruiter',
      name: 'Sarah Jenkins (Lead Recruiter)',
      email: 'recruiter@cyberfort.com',
      password: 'RecruiterPass@2026',
      role: 'recruiter',
      isActive: true,
      emailVerified: true,
      twoFactorEnabled: true
    },
    {
      id: 'seeker_akhil',
      username: 'akhil',
      name: 'Akhil G. (Job Seeker)',
      email: 'akhil@student.edu',
      password: 'SecurePassword@2026',
      role: 'job_seeker',
      isActive: true,
      emailVerified: true,
      twoFactorEnabled: false
    },
    {
      id: 'seeker_demo',
      username: 'demo',
      name: 'Alex Morgan (Job Seeker)',
      email: 'demo@securecv.io',
      password: 'DemoUser@2026',
      role: 'job_seeker',
      isActive: true,
      emailVerified: true,
      twoFactorEnabled: false
    }
  ];

  if (!isMockMode && db && auth) {
    console.log('📡 Connected to live Firebase project. Creating Auth records and Firestore documents...');

    for (const u of demoUsers) {
      try {
        // 1. Create or update user in Firebase Authentication
        let firebaseUid = u.id;
        try {
          const existingUser = await auth.getUserByEmail(u.email);
          firebaseUid = existingUser.uid;
          await auth.updateUser(firebaseUid, {
            displayName: u.name,
            password: u.password
          });
        } catch (authErr) {
          if (authErr.code === 'auth/user-not-found') {
            const newUser = await auth.createUser({
              uid: u.id,
              email: u.email,
              password: u.password,
              displayName: u.name,
              emailVerified: u.emailVerified
            });
            firebaseUid = newUser.uid;
          } else {
            console.warn(`Auth notice for ${u.email}:`, authErr.message);
          }
        }

        // Set custom claims for role
        await auth.setCustomUserClaims(firebaseUid, { role: u.role });

        // 2. Set Firestore User Document (NO passwords in Firestore!)
        await db.collection('users').doc(firebaseUid).set({
          id: firebaseUid,
          username: u.username,
          name: u.name,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          emailVerified: u.emailVerified,
          twoFactorEnabled: u.twoFactorEnabled,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // 3. Set Profile Document
        await db.collection('profiles').doc(firebaseUid).set({
          userId: firebaseUid,
          fullName: u.name,
          email: u.email,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // 4. Set Privacy Settings Document
        await db.collection('privacySettings').doc(firebaseUid).set({
          id: firebaseUid,
          userId: firebaseUid,
          resumeVisibility: u.role === 'admin' ? 'private' : 'recruiters_only',
          profileVisibility: u.role === 'admin' ? 'private' : 'recruiters_only',
          shareContactInfo: 1,
          shareProjectLinks: 1,
          consentDataProcessing: 1,
          consentAnalytics: u.username === 'demo' ? 1 : 0,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        console.log(`✅ Seeded user: ${u.name} (${u.role}) -> UID: ${firebaseUid}`);
      } catch (err) {
        console.error(`Error seeding user ${u.email}:`, err.message);
      }
    }

    // Seed Sample Jobs
    const jobs = [
      {
        id: 'job_cyber_analyst',
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
      },
      {
        id: 'job_fs_dev',
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
      }
    ];

    for (const j of jobs) {
      await db.collection('jobs').doc(j.id).set(j, { merge: true });
    }
    console.log('✅ Seeded demo jobs into Cloud Firestore.');

    // Seed Sample Resume for Akhil
    const sampleResume = {
      id: 'res_akhil_cyber',
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
    };

    await db.collection('resumes').doc(sampleResume.id).set(sampleResume, { merge: true });
    console.log('✅ Seeded demo resume for Akhil into Cloud Firestore.');

    // Seed Sample Application
    await db.collection('applications').doc('app_akhil_job1').set({
      id: 'app_akhil_job1',
      userId: 'seeker_akhil',
      jobId: 'job_cyber_analyst',
      resumeId: 'res_akhil_cyber',
      coverLetter: 'I am excited to submit my application for the Junior SOC Analyst opening at Fortress CyberShield Global.',
      status: 'Under Review',
      statusUpdatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }, { merge: true });
    console.log('✅ Seeded demo application into Cloud Firestore.');

  } else {
    console.log('⚡ Running in Offline Firestore Development Mode.');
    console.log('✅ Pre-seeded demo accounts ready in Firestore store (Admin, Recruiter, Akhil, Demo).');
  }

  console.log('\n=============================================================');
  console.log('🎉 Firebase Seeding Complete!');
  console.log('🔑 Demo Login Accounts Available:');
  console.log('   - 👑 Admin:     admin / admin@524 (admin@securecv.io)');
  console.log('   - 💼 Recruiter: recruiter / RecruiterPass@2026 (recruiter@cyberfort.com)');
  console.log('   - 👨‍🎓 Seeker:    akhil / SecurePassword@2026 (akhil@student.edu)');
  console.log('   - 🧪 Demo:      demo / DemoUser@2026 (demo@securecv.io)');
  console.log('=============================================================\n');
}

if (require.main === module) {
  seedFirebase().then(() => process.exit(0)).catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  });
}

module.exports = { seedFirebase };
