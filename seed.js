const bcrypt = require('bcryptjs');
const db = require('./database');

async function seed() {
  console.log('🌱 Starting database seeding for SecureCV...');

  // Clear existing data in reverse order of foreign keys
  const tables = [
    'failed_login_attempts',
    'security_events',
    'privacy_settings',
    'applications',
    'saved_jobs',
    'jobs',
    'resume_sections',
    'resumes',
    'sessions',
    'users'
  ];

  for (const table of tables) {
    db.prepare(`DELETE FROM ${table}`).run();
  }

  // Reset sqlite sequence
  db.prepare(`DELETE FROM sqlite_sequence`).run();

  console.log('🧹 Cleaned existing tables.');

  // Password hashes
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('admin@524', salt);
  const recruiterHash = bcrypt.hashSync('RecruiterPass@2026', salt);
  const studentHash = bcrypt.hashSync('SecurePassword@2026', salt);
  const demoHash = bcrypt.hashSync('DemoUser@2026', salt);

  // 1. Insert Users with Usernames
  const insertUser = db.prepare(`
    INSERT INTO users (username, name, email, password_hash, role, is_active, email_verified, two_factor_enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const adminUser = insertUser.run('admin', 'Master Administrator', 'admin@securecv.io', adminHash, 'admin', 1, 1, 1);
  const recruiterUser = insertUser.run('recruiter', 'Sarah Jenkins (Lead Recruiter)', 'recruiter@cyberfort.com', recruiterHash, 'recruiter', 1, 1, 1);
  const studentUser = insertUser.run('akhil', 'Akhil G. (Job Seeker)', 'akhil@student.edu', studentHash, 'job_seeker', 1, 1, 0);
  const demoUser = insertUser.run('demo', 'Alex Morgan (Job Seeker)', 'demo@securecv.io', demoHash, 'job_seeker', 1, 1, 0);

  const studentId = studentUser.lastInsertRowid;
  const recruiterId = recruiterUser.lastInsertRowid;
  const adminId = adminUser.lastInsertRowid;

  console.log('✅ Created Demo Users (Admin [admin/admin@524], Recruiter, Student/Seeker)');

  // 2. Privacy Settings for Users
  const insertPrivacy = db.prepare(`
    INSERT INTO privacy_settings (user_id, resume_visibility, profile_visibility, share_contact_info, share_project_links, consent_data_processing, consent_analytics)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertPrivacy.run(studentId, 'recruiters_only', 'recruiters_only', 1, 1, 1, 0);
  insertPrivacy.run(demoUser.lastInsertRowid, 'public', 'public', 1, 1, 1, 1);

  // 3. Insert Resumes for Akhil
  const insertResume = db.prepare(`
    INSERT INTO resumes (user_id, title, template_id, summary, full_name, professional_title, email, phone, location, linkedin, github, portfolio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const resume1 = insertResume.run(
    studentId,
    'Cyber Security & AppSec Specialist Resume',
    'cyber',
    'Analytical and security-minded 3rd-year B.Tech Cyber Security undergraduate with practical expertise in secure software development lifecycle (SSDLC), vulnerability assessment, network penetration testing, and modern full-stack web architectures. Dedicated to building resilient, threat-modeled systems.',
    'Akhil G.',
    'Cyber Security Analyst & Secure Systems Developer',
    'akhil@student.edu',
    '+91 98765 43210',
    'Hyderabad, India',
    'https://linkedin.com/in/akhil-cybersec',
    'https://github.com/akhil-security',
    'https://akhil-secfolio.dev'
  );

  const resume2 = insertResume.run(
    studentId,
    'Full Stack Software Developer Resume',
    'modern',
    'High-performance full stack software engineering student with proven skills in Node.js, Express, SQLite, React, API security, and containerization. Passionate about clean code architectures and security-by-design principles.',
    'Akhil G.',
    'Full Stack Software Engineer',
    'akhil@student.edu',
    '+91 98765 43210',
    'Hyderabad, India',
    'https://linkedin.com/in/akhil-cybersec',
    'https://github.com/akhil-security',
    'https://akhil-secfolio.dev'
  );

  const resume1Id = resume1.lastInsertRowid;
  const resume2Id = resume2.lastInsertRowid;

  // 4. Insert Resume Sections for Resume 1 (Cyber Resume)
  const insertSection = db.prepare(`
    INSERT INTO resume_sections (resume_id, section_type, content_json, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  // Education
  insertSection.run(
    resume1Id,
    'education',
    JSON.stringify([
      {
        institution: 'National Institute of Technology',
        degree: 'Bachelor of Technology (B.Tech)',
        field: 'Computer Science & Cyber Security',
        start_year: '2023',
        end_year: '2027 (Expected)',
        grade: 'CGPA: 8.9 / 10.0'
      },
      {
        institution: 'Kendriya Vidyalaya Academy',
        degree: 'Higher Secondary Certificate (Class XII)',
        field: 'PCM & Computer Science',
        start_year: '2021',
        end_year: '2023',
        grade: 'Percentage: 94.2%'
      }
    ]),
    1
  );

  // Experience
  insertSection.run(
    resume1Id,
    'experience',
    JSON.stringify([
      {
        company: 'CyberDefense SOC Labs',
        position: 'Cyber Security & Vulnerability Assessment Intern',
        start_date: 'June 2025',
        end_date: 'August 2025',
        description: 'Conducted automated and manual vulnerability scans on 15+ web endpoints using OWASP ZAP and Burp Suite. Prepared remediation reports that mitigated 3 High-severity SQLi & XSS flaws.'
      },
      {
        company: 'Campus Cyber Security Club',
        position: 'Technical Lead & Workshop Coordinator',
        start_date: 'August 2024',
        end_date: 'Present',
        description: 'Organized hands-on CTF competitions and secure coding workshops for 200+ students on buffer overflow exploits, cryptanalysis, and web application security.'
      }
    ]),
    2
  );

  // Projects
  insertSection.run(
    resume1Id,
    'projects',
    JSON.stringify([
      {
        name: 'SecureCV — Secure Career & ATS Platform',
        description: 'Full-stack platform integrating role-based access control, cryptographic password hashing, audit trails, dynamic ATS scoring, and interactive resume builder.',
        technologies: 'Node.js, Express, SQLite, Vanilla CSS, JWT, Cryptography',
        link: 'https://github.com/akhil-security/securecv'
      },
      {
        name: 'Network Threat Detection & Packet Analyzer',
        description: 'Built a lightweight Python-based intrusion detection script analyzing PCAP streams, identifying SYN flood anomalies, ARP spoofing, and port scan signatures.',
        technologies: 'Python, Scapy, Wireshark, Bash, Linux',
        link: 'https://github.com/akhil-security/net-sentinel'
      }
    ]),
    3
  );

  // Skills
  insertSection.run(
    resume1Id,
    'skills',
    JSON.stringify([
      { category: 'Cyber Security', items: ['Vulnerability Assessment', 'Burp Suite', 'OWASP Top 10', 'Wireshark', 'Metasploit', 'Nmap', 'Cryptography', 'SIEM Basics'] },
      { category: 'Development & Scripting', items: ['Python', 'JavaScript (ES6+)', 'Node.js', 'Express', 'SQL', 'Bash / PowerShell', 'Git'] },
      { category: 'Security Principles', items: ['Authentication & RBAC', 'Data Encryption (AES/Bcrypt)', 'Input Sanitization', 'Audit Logging', 'Zero Trust Architecture'] }
    ]),
    4
  );

  // Certifications
  insertSection.run(
    resume1Id,
    'certifications',
    JSON.stringify([
      {
        certificate: 'CompTIA Security+ (SY0-701)',
        organization: 'CompTIA',
        date: 'May 2025',
        credential_link: 'https://comptia.org/verify/COMP123456'
      },
      {
        certificate: 'Certified Ethical Hacker (CEH Practical Prep)',
        organization: 'EC-Council Academic',
        date: 'December 2024',
        credential_link: 'https://eccouncil.org/verify/CEH78901'
      }
    ]),
    5
  );

  // Languages
  insertSection.run(
    resume1Id,
    'languages',
    JSON.stringify([
      { language: 'English', proficiency: 'Professional Working' },
      { language: 'Hindi', proficiency: 'Full Professional' },
      { language: 'Telugu', proficiency: 'Native / Bilingual' }
    ]),
    6
  );

  // Add sections for resume 2 (Developer Resume)
  insertSection.run(
    resume2Id,
    'education',
    JSON.stringify([
      {
        institution: 'National Institute of Technology',
        degree: 'Bachelor of Technology (B.Tech)',
        field: 'Computer Science & Cyber Security',
        start_year: '2023',
        end_year: '2027 (Expected)',
        grade: 'CGPA: 8.9 / 10.0'
      }
    ]),
    1
  );

  insertSection.run(
    resume2Id,
    'skills',
    JSON.stringify([
      { category: 'Languages', items: ['JavaScript', 'TypeScript', 'Python', 'SQL', 'HTML5', 'CSS3'] },
      { category: 'Frameworks & Backends', items: ['Node.js', 'Express.js', 'REST APIs', 'SQLite', 'Docker'] },
      { category: 'Practices', items: ['Secure Coding', 'Unit Testing', 'CI/CD Pipelines', 'Git Version Control'] }
    ]),
    2
  );

  // 5. Insert Realistic Jobs by Recruiter
  const insertJob = db.prepare(`
    INSERT INTO jobs (recruiter_id, title, company, location, work_type, experience_level, salary_range, category, description, responsibilities, requirements, required_skills, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const job1 = insertJob.run(
    recruiterId,
    'Junior SOC Analyst (Tier 1)',
    'CyberFort Global Defense',
    'Bengaluru, India / Hybrid',
    'Hybrid',
    'Entry Level',
    '₹7,50,000 - ₹10,50,000 / year',
    'Cybersecurity',
    'We are seeking an alert, detail-oriented Junior SOC Analyst to monitor security events, investigate potential breaches, and triage security incidents in a 24/7 security operations center.',
    '• Monitor SIEM alerts and triage suspicious security anomalies.\n• Analyze PCAP network packets and endpoint telemetry.\n• Escalate confirmed security incidents with preliminary forensics.\n• Assist in vulnerability assessments and patch verification.',
    '• Bachelor\'s degree in Computer Science, Cyber Security, or related field.\n• Knowledge of TCP/IP, OSI model, and standard networking protocols.\n• Familiarity with Wireshark, Splunk/ELK, and standard security toolkits.\n• Strong problem solving and incident triage mindset.',
    'Wireshark, SIEM Basics, Vulnerability Assessment, Network Security, Python, Linux, OWASP Top 10',
    'active'
  );

  const job2 = insertJob.run(
    recruiterId,
    'Associate Penetration Tester / Ethical Hacker',
    'SecOps Elite Labs',
    'Remote',
    'Remote',
    'Mid-Level',
    '₹9,00,000 - ₹13,00,000 / year',
    'Cybersecurity',
    'Perform offensive security assessments, manual web penetration testing, and API vulnerability analyses for high-growth fintech clients.',
    '• Conduct black-box and white-box penetration tests on web and API endpoints.\n• Identify OWASP Top 10 vulnerabilities (SQLi, XSS, SSRF, IDOR).\n• Write actionable proof-of-concept exploits and remediation advisories.\n• Collaborate with developers to verify secure coding fixes.',
    '• Practical hands-on experience with Burp Suite Professional, Nmap, Metasploit.\n• Deep understanding of Web Security, HTTP protocols, and Authentication flaws.\n• Relevant certifications (e.g. CEH, Security+, eJPT) preferred.',
    'Burp Suite, OWASP Top 10, Penetration Testing, Nmap, Metasploit, Cryptography, Python, Linux',
    'active'
  );

  const job3 = insertJob.run(
    recruiterId,
    'Junior Full Stack Security Developer',
    'FinSecure Systems',
    'Hyderabad, India',
    'On-site',
    'Entry Level',
    '₹8,00,000 - ₹11,00,000 / year',
    'Software Engineering',
    'Join our core banking security engineering team developing resilient APIs, cryptographic key management microservices, and client authentication portals.',
    '• Develop clean, secure RESTful APIs in Node.js and Express.\n• Implement rigorous input sanitization, rate limiting, and RBAC policies.\n• Write automated integration tests and security regression tests.\n• Maintain zero-defect database queries preventing injection attacks.',
    '• Solid foundation in JavaScript, Node.js, Express, and Relational Databases.\n• Understanding of authentication flows (JWT, Session Management, Bcrypt).\n• Knowledge of secure software engineering principles.',
    'JavaScript (ES6+), Node.js, Express, SQL, Authentication & RBAC, Git, REST APIs, Secure Coding',
    'active'
  );

  const job4 = insertJob.run(
    recruiterId,
    'Cloud Security Associate (AWS / Azure)',
    'AeroCloud Technologies',
    'Bengaluru, India',
    'Remote',
    'Entry Level',
    '₹8,50,000 - ₹12,00,000 / year',
    'Cloud Security',
    'Help secure cloud infrastructure, automate IAM governance policies, and audit cloud security posture across multi-tenant environments.',
    '• Audit AWS/Azure cloud resources against CIS benchmarks.\n• Automate security checks using Python and CloudWatch alarms.\n• Manage least-privilege IAM policies and credential rotation.\n• Collaborate with DevOps on container security scanning.',
    '• Understanding of AWS security fundamentals (IAM, KMS, VPC, S3 security).\n• Scripting skills in Python or Bash.\n• Exposure to Docker containerization and CI/CD pipelines.',
    'AWS, Python, Docker, Linux, Bash / PowerShell, Cryptography, Network Security',
    'active'
  );

  const job1Id = job1.lastInsertRowid;
  const job2Id = job2.lastInsertRowid;
  const job3Id = job3.lastInsertRowid;

  // 6. Insert Saved Jobs for Student
  const insertSaved = db.prepare(`
    INSERT INTO saved_jobs (user_id, job_id) VALUES (?, ?)
  `);
  insertSaved.run(studentId, job1Id);
  insertSaved.run(studentId, job2Id);

  // 7. Insert Applications for Student
  const insertApp = db.prepare(`
    INSERT INTO applications (user_id, job_id, resume_id, cover_letter, additional_info, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertApp.run(
    studentId,
    job1Id,
    resume1Id,
    'Dear Hiring Manager, I am thrilled to apply for the Junior SOC Analyst role. With extensive hands-on experience in vulnerability assessment, SIEM monitoring, and packet analysis, I look forward to contributing immediately to CyberFort Defense.',
    'Available for immediate start; willing to work flexible rotations.',
    'Interview'
  );

  insertApp.run(
    studentId,
    job2Id,
    resume1Id,
    'Dear SecOps Team, as an avid ethical hacker with proven bug reporting and hands-on web application assessment experience, I am excited to apply for your Associate Penetration Tester position.',
    'Portfolio and CTF writeups attached in resume links.',
    'Under Review'
  );

  // 8. Insert Security Events for Student & Admin Audit
  const insertEvent = db.prepare(`
    INSERT INTO security_events (user_id, event_type, severity, ip_address, user_agent, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertEvent.run(studentId, 'LOGIN_SUCCESS', 'low', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120', 'User authenticated with verified credentials');
  insertEvent.run(studentId, 'RESUME_CREATED', 'low', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120', 'Created resume "Cyber Security & AppSec Specialist Resume"');
  insertEvent.run(studentId, 'JOB_APPLICATION_SUBMITTED', 'low', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120', 'Applied for "Junior SOC Analyst (Tier 1)"');
  insertEvent.run(studentId, 'PRIVACY_UPDATED', 'low', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120', 'Visibility set to Recruiters Only');
  insertEvent.run(recruiterId, 'LOGIN_SUCCESS', 'low', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120', 'Recruiter session initiated');
  insertEvent.run(adminId, 'ADMIN_ACCESS', 'medium', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120', 'Admin dashboard viewed');
  insertEvent.run(null, 'SUSPICIOUS_LOGIN_ATTEMPT', 'high', '192.168.1.105', 'Python-requests/2.28.1', 'Failed login attempt with unrecognized user-agent');

  console.log('✅ Demo Data Seeded Successfully!');
  console.log('----------------------------------------------------');
  console.log('DEMO ACCOUNTS:');
  console.log('Student/Seeker: akhil@student.edu       | SecurePassword@2026');
  console.log('Recruiter:      recruiter@cyberfort.com | RecruiterPass@2026');
  console.log('Admin:          admin@securecv.io       | AdminPassword@2026');
  console.log('----------------------------------------------------');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
