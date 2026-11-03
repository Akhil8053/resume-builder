# CareerCraft — Full-Stack Resume Builder, ATS Scanner & Hiring Portal

CareerCraft is an enterprise-grade web application built with **Python (Flask), SQLite, and Tailwind CSS**. It bridges the gap between candidate resume crafting and modern hiring workflows with automated **ATS keyword matching, role-based authentication, recruiter analytics, and notification pipelines**.

---

## 🌟 Advanced Engineering Highlights

### 1. Automated ATS Compatibility & Keyword Scanner (`/api/ats-match`)
- **Algorithmic Evaluation**: Analyzes candidate resume content against job requirements using keyword frequency and token matching.
- **Visual Fit Score**: Real-time percentage score (`85% Strong Match`, `Moderate Match`, or `Low Match`).
- **Gap Analysis**: Categorizes exact **Matched Keywords** (green chips) and **Missing Keywords** (yellow chips) with actionable suggestions for improving ATS pass rates.

### 2. Role-Based Access Control & User Authentication
- **Dual User Roles**:
  - **Candidate / Job Seeker**: Drafts and edits personal resumes, views ATS fit scores, applies to jobs, and tracks submitted applications.
  - **Recruiter / Employer**: Posts job openings, reviews candidate submissions, accesses talent pool resumes, changes hiring stages, and monitors hiring analytics.
- **Security**: Cryptographic password hashing (`hashlib.sha256`) and session-backed route protection.
- **1-Click Demo Evaluation Logins**: On `/login`, click *"As Job Seeker (Alex Morgan)"* or *"As Recruiter (Sarah Jenkins)"* for instant demo access during vivas and recruiter reviews.

### 3. Recruiter Talent Analytics Dashboard (`/recruiter/analytics`)
- Visual interactive analytics powered by **Chart.js**:
  - **Hiring Funnel Conversion**: Doughnut breakdown across stages (*Submitted → Under Review → Interviewing → Offer Extended → Rejected*).
  - **Application Volume by Role**: Bar chart showing demand per job opening.
  - Real-time KPI summaries for total applications, live postings, and candidate resumes.

### 4. In-App Notification Center
- Bell icon in the navigation bar with unread count badges.
- Triggers automatic alerts when:
  - A candidate submits an application.
  - A recruiter updates an application stage (e.g. from *"Under Review"* to *"Interviewing"*).

### 5. Multi-Template Resume Studio with Live Preview
- **4 Professional Layouts**: Modern Teal, 2-Column Sidebar, Executive Navy, and Minimalist.
- **Dynamic Repeater Fields**: Experience, Projects, Education, Certifications, Languages, and Honors.
- **Print-Perfect A4 PDF Export**: Clean `@media print` styling formatted for standard A4 paper size.
- **Resume Vault (`/resumes`)**: Inspect, re-edit, or print any saved resume.

### 6. Automated Unit Testing & Docker Containerization
- **Unit Test Suite**: 6 automated test cases in `tests/test_app.py` validating routes, ATS algorithms, API payloads, and password security.
- **Docker Ready**: Includes `Dockerfile` and `docker-compose.yml` for single-command deployment.

---

## 📂 Project Architecture

```text
resume_job_portal/
├── app.py                     # Main server, auth sessions & REST API
├── database.py                # SQLite schema, migrations, & demo seed accounts
├── ats_scanner.py             # ATS keyword extraction & fit scoring algorithm
├── portal.db                  # Auto-generated SQLite database
├── requirements.txt           # Python dependencies (Flask)
├── Dockerfile                 # Container image specification
├── docker-compose.yml         # Container orchestration config
├── .env.example               # Environment variables template
├── run_app.bat                # Windows 1-click launcher
├── run_app.sh                 # macOS / Linux 1-click launcher
├── README.md                  # Comprehensive project documentation
├── tests/
│   └── test_app.py            # Automated unit test suite
├── uploads/                   # Stored candidate resume files (.pdf, .docx)
├── static/
│   ├── css/
│   │   └── style.css          # Theme definitions & A4 print stylesheets
│   └── js/
│       ├── builder.js         # Real-time resume preview sync & section manager
│       └── jobs.js            # Job search, ATS scanner & application submitter
└── templates/
    ├── base.html              # Base layout with navbar, notifications, & auth badge
    ├── index.html             # Landing page with live platform statistics
    ├── login.html             # Sign in page with 1-click demo logins
    ├── register.html          # User registration (Applicant vs Recruiter)
    ├── builder.html           # Split-screen resume studio & live preview
    ├── resumes.html           # Resume vault & inspection modal
    ├── jobs.html              # Job board with ATS scan & application modal
    ├── post_job.html          # Recruiter portal for publishing openings
    ├── analytics.html         # Recruiter analytics dashboard (Chart.js)
    └── applications.html      # Application pipeline & stage management
```

---

## 🚀 Quick Setup in VS Code

1. Open VS Code and open the `resume_job_portal` folder (**File > Open Folder...**).
2. Open the terminal (`` Ctrl + ` ``).
3. Install Flask:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the application:
   ```bash
   python app.py
   ```
5. Open your browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```

---

## 🧪 Running Automated Unit Tests
To verify all test cases, run:
```bash
python -m unittest tests/test_app.py
```
*(All 6 test cases will execute and verify database operations, ATS matching, and API endpoints)*

---

## 🐳 Running with Docker
```bash
docker compose up --build
```
The app will immediately be available at `http://localhost:5000`.
