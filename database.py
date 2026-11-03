import sqlite3
import json
import os
import shutil
import hashlib

# Vercel serverless writable path
if os.environ.get('VERCEL'):
    DB_PATH = '/tmp/portal.db'
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), 'portal.db')
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()
def ensure_db_ready():
    if os.environ.get('VERCEL'):
        base_db = os.path.join(os.path.dirname(__file__), 'portal.db')
        if not os.path.exists(DB_PATH) and os.path.exists(base_db):
            try:
                shutil.copyfile(base_db, DB_PATH)
            except Exception:
                pass
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='jobs'")
        exists = cursor.fetchone()
        conn.close()
        if not exists:
            init_db()
    except Exception:
        init_db()

def get_db_connection():
    ensure_db_ready()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create Users Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'applicant',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create Resumes Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS resumes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            job_title TEXT,
            data_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # Create Jobs Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recruiter_id INTEGER,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            location TEXT NOT NULL,
            type TEXT NOT NULL,
            category TEXT NOT NULL,
            salary TEXT NOT NULL,
            description TEXT NOT NULL,
            requirements TEXT NOT NULL,
            posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (recruiter_id) REFERENCES users (id)
        )
    ''')

    # Create Applications Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER NOT NULL,
            user_id INTEGER,
            applicant_name TEXT NOT NULL,
            applicant_email TEXT NOT NULL,
            resume_id INTEGER,
            resume_summary TEXT,
            cover_note TEXT,
            portfolio_url TEXT,
            resume_file TEXT,
            status TEXT DEFAULT 'Submitted',
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id) REFERENCES jobs (id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (resume_id) REFERENCES resumes (id)
        )
    ''')

    # Create Notifications Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            message TEXT NOT NULL,
            link TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Safe Migrations for existing databases
    cursor.execute("PRAGMA table_info(applications)")
    app_cols = [col[1] for col in cursor.fetchall()]
    if 'resume_file' not in app_cols:
        cursor.execute("ALTER TABLE applications ADD COLUMN resume_file TEXT")
    if 'user_id' not in app_cols:
        cursor.execute("ALTER TABLE applications ADD COLUMN user_id INTEGER")

    cursor.execute("PRAGMA table_info(resumes)")
    res_cols = [col[1] for col in cursor.fetchall()]
    if 'user_id' not in res_cols:
        cursor.execute("ALTER TABLE resumes ADD COLUMN user_id INTEGER")

    cursor.execute("PRAGMA table_info(jobs)")
    job_cols = [col[1] for col in cursor.fetchall()]
    if 'recruiter_id' not in job_cols:
        cursor.execute("ALTER TABLE jobs ADD COLUMN recruiter_id INTEGER")

    # Seed Default Demo Users if empty
    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] == 0:
        demo_users = [
            ("Alex Morgan", "alex@demo.com", hash_password("password123"), "applicant"),
            ("Sarah Jenkins (HR Nexora)", "sarah@recruiter.com", hash_password("password123"), "recruiter")
        ]
        cursor.executemany('''
            INSERT INTO users (name, email, password_hash, role)
            VALUES (?, ?, ?, ?)
        ''', demo_users)

    # Seed Sample Jobs if empty
    cursor.execute('SELECT COUNT(*) FROM jobs')
    if cursor.fetchone()[0] == 0:
        sample_jobs = [
            (
                "Junior Full-Stack Developer",
                "Nexora Tech Solutions",
                "Remote / Bengaluru",
                "Full-time",
                "Engineering",
                "$65,000 - $85,000 / yr",
                "Seeking an enthusiastic Junior Full-Stack Developer proficient in Python, JavaScript, and modern web frameworks.",
                "Knowledge of Python/Flask or Node.js; HTML5, CSS3, JavaScript; Familiarity with relational databases (SQLite/PostgreSQL); Git and REST APIs."
            ),
            (
                "Frontend React Engineer",
                "CloudPulse Studio",
                "Hybrid / Mumbai",
                "Full-time",
                "Engineering",
                "$80,000 - $105,000 / yr",
                "Build polished, accessible user interfaces for our real-time cloud collaboration platform.",
                "3+ years experience with React and TypeScript; Deep knowledge of Tailwind CSS; Experience with RESTful APIs; Git version control."
            ),
            (
                "UI/UX Product Designer",
                "Aura Design Labs",
                "Remote",
                "Full-time",
                "Design",
                "$70,000 - $95,000 / yr",
                "Lead end-to-end design workflows from wireframes and design systems to high-fidelity prototypes.",
                "Proficiency in Figma and design tokens; User journey mapping; Strong portfolio showcasing product-led growth design."
            ),
            (
                "Data Analyst & BI Specialist",
                "MetricFlow Analytics",
                "Delhi / Hybrid",
                "Full-time",
                "Data",
                "$60,000 - $82,000 / yr",
                "Transform raw business data into actionable dashboards, executive KPI reports, and customer retention insights.",
                "Strong SQL and Python (Pandas) skills; Experience with visualization tools (Tableau/Power BI); Stakeholder communication."
            ),
            (
                "Associate Product Manager",
                "VentureScale Labs",
                "Remote",
                "Full-time",
                "Product",
                "$75,000 - $95,000 / yr",
                "Collaborate with engineering, design, and growth marketing to define product specs and prioritize sprints.",
                "1-2 years experience in tech product or project coordination; Data-driven decision making; Excellent documentation skills."
            ),
            (
                "Web Development Intern",
                "Apex Digital Innovations",
                "Remote",
                "Internship",
                "Engineering",
                "$25 - $35 / hr",
                "Great learning opportunity for computer science students or bootcamp grads to work on live client projects.",
                "Understanding of core web concepts (HTTP, DOM, REST APIs); Hands-on personal projects or GitHub portfolio; Team collaboration."
            )
        ]
        cursor.executemany('''
            INSERT INTO jobs (title, company, location, type, category, salary, description, requirements)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', sample_jobs)

    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database configured for Local & Vercel Serverless deployment!")
