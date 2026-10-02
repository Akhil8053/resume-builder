-- ============================================================================
-- SecureCV Relational Database Schema (SQLite)
-- Software Engineering & Cyber Security Architecture
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. Users Table (Core Identity & RBAC)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'job_seeker' CHECK(role IN ('job_seeker', 'recruiter', 'admin')),
    is_active INTEGER NOT NULL DEFAULT 1,
    email_verified INTEGER NOT NULL DEFAULT 1,
    two_factor_enabled INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Sessions Table (Stateful Token & Device Management, Session Revocation)
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    device_name TEXT,
    is_revoked INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- 3. Resumes Table (Multiple Resumes per User)
CREATE TABLE IF NOT EXISTS resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    template_id TEXT NOT NULL DEFAULT 'minimal' CHECK(template_id IN ('minimal', 'modern', 'cyber')),
    summary TEXT,
    full_name TEXT,
    professional_title TEXT,
    email TEXT,
    phone TEXT,
    location TEXT,
    linkedin TEXT,
    github TEXT,
    portfolio TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);

-- 4. Resume Sections Table (Modular Sub-sections: Education, Experience, Projects, Skills, etc.)
CREATE TABLE IF NOT EXISTS resume_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    section_type TEXT NOT NULL CHECK(section_type IN ('education', 'experience', 'projects', 'skills', 'certifications', 'languages', 'achievements', 'extracurricular')),
    content_json TEXT NOT NULL, -- Stored as validated JSON array of structured items
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resume_sections_resume_id ON resume_sections(resume_id);

-- 5. Jobs Table (Job Postings by Recruiters)
CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recruiter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    work_type TEXT NOT NULL DEFAULT 'Remote' CHECK(work_type IN ('Remote', 'Hybrid', 'On-site')),
    experience_level TEXT NOT NULL DEFAULT 'Mid-Level' CHECK(experience_level IN ('Entry Level', 'Mid-Level', 'Senior Level', 'Lead / Principal')),
    salary_range TEXT,
    category TEXT DEFAULT 'Cybersecurity',
    description TEXT NOT NULL,
    responsibilities TEXT,
    requirements TEXT,
    required_skills TEXT NOT NULL, -- Comma-separated or JSON list of required skills
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_recruiter_id ON jobs(recruiter_id);

-- 6. Saved Jobs Table
CREATE TABLE IF NOT EXISTS saved_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON saved_jobs(user_id);

-- 7. Job Applications Table (Application Lifecycle & Tracking)
CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
    cover_letter TEXT,
    additional_info TEXT,
    status TEXT NOT NULL DEFAULT 'Applied' CHECK(status IN ('Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected')),
    status_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);

-- 8. Privacy Settings & Consent Table
CREATE TABLE IF NOT EXISTS privacy_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    resume_visibility TEXT NOT NULL DEFAULT 'recruiters_only' CHECK(resume_visibility IN ('private', 'recruiters_only', 'public')),
    profile_visibility TEXT NOT NULL DEFAULT 'recruiters_only' CHECK(profile_visibility IN ('private', 'recruiters_only', 'public')),
    share_contact_info INTEGER NOT NULL DEFAULT 1,
    share_project_links INTEGER NOT NULL DEFAULT 1,
    consent_data_processing INTEGER NOT NULL DEFAULT 1,
    consent_analytics INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Security Audit Events Table (Immutable Audit Logging)
CREATE TABLE IF NOT EXISTS security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'low' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);

-- 10. Failed Login Attempts Table (Rate Limiting & Brute-Force Monitoring)
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    ip_address TEXT,
    attempt_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_failed_logins_email_time ON failed_login_attempts(email, attempt_time);
