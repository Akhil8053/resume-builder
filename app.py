import json
import sqlite3
import os
import time
from functools import wraps
from flask import Flask, render_template, request, jsonify, redirect, url_for, session, send_from_directory
from werkzeug.utils import secure_filename
from database import get_db_connection, init_db, hash_password, verify_password
from ats_scanner import analyze_ats_match

# Explicit directory resolution for Vercel
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, 'templates'),
    static_folder=os.path.join(BASE_DIR, 'static')
)
app.secret_key = os.environ.get('SECRET_KEY', 'careercraft-placement-secret-key-3rd-year')

# Configure Uploads (Vercel serverless /tmp fallback)
if os.environ.get('VERCEL'):
    UPLOAD_FOLDER = '/tmp/uploads'
else:
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'txt'}
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ----------------- Strict Role-Based Access Control (RBAC) -----------------

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login_page', msg='Please sign in to access this page.', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

def candidate_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login_page', portal='candidate', msg='Please sign in as a Job Seeker / Candidate to build your resume.'))
        if session.get('user_role') != 'applicant':
            return redirect(url_for('application_tracker', error='Access Restricted: The Resume Studio and personal applications are strictly for Job Seekers. You are currently logged in as a Company Recruiter.'))
        return f(*args, **kwargs)
    return decorated_function

def recruiter_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login_page', portal='company', msg='Please sign in with a Company / Employer account to post jobs.'))
        if session.get('user_role') != 'recruiter':
            return redirect(url_for('job_board', error='Access Denied: Only verified Company Recruiters can post jobs and review talent resumes. You are currently logged in as a Job Seeker.'))
        return f(*args, **kwargs)
    return decorated_function

# Context processor for templates
@app.context_processor
def inject_user_context():
    unread_count = 0
    notifications = []
    if 'user_email' in session:
        conn = get_db_connection()
        notifications = conn.execute('''
            SELECT * FROM notifications 
            WHERE user_email = ? AND is_read = 0 
            ORDER BY id DESC LIMIT 5
        ''', (session['user_email'],)).fetchall()
        unread_count = len(notifications)
        conn.close()
    return {
        'current_user': {
            'id': session.get('user_id'),
            'name': session.get('user_name'),
            'email': session.get('user_email'),
            'role': session.get('user_role')
        },
        'unread_notifications_count': unread_count,
        'recent_notifications': notifications,
        'system_error': request.args.get('error'),
        'system_msg': request.args.get('msg')
    }

with app.app_context():
    init_db()

# ----------------- Main Web Pages -----------------

@app.route('/')
def index():
    conn = get_db_connection()
    jobs_count = conn.execute('SELECT COUNT(*) FROM jobs').fetchone()[0]
    apps_count = conn.execute('SELECT COUNT(*) FROM applications').fetchone()[0]
    resumes_count = conn.execute('SELECT COUNT(*) FROM resumes').fetchone()[0]
    recent_jobs = conn.execute('SELECT * FROM jobs ORDER BY id DESC LIMIT 3').fetchall()
    conn.close()
    return render_template('index.html', 
                           jobs_count=jobs_count, 
                           apps_count=apps_count, 
                           resumes_count=resumes_count,
                           recent_jobs=recent_jobs)

@app.route('/builder')
@candidate_required
def resume_builder():
    return render_template('builder.html')

@app.route('/resumes')
@candidate_required
def resume_gallery():
    conn = get_db_connection()
    user_id = session.get('user_id')
    resumes = conn.execute('SELECT * FROM resumes WHERE user_id = ? ORDER BY id DESC', (user_id,)).fetchall()
    conn.close()
    
    formatted_resumes = []
    for r in resumes:
        try:
            data = json.loads(r['data_json'])
        except Exception:
            data = {}
        formatted_resumes.append({
            'id': r['id'],
            'full_name': r['full_name'],
            'email': r['email'],
            'phone': r['phone'],
            'job_title': r['job_title'],
            'created_at': r['created_at'],
            'data': data
        })
    return render_template('resumes.html', resumes=formatted_resumes)

@app.route('/jobs')
def job_board():
    category = request.args.get('category', '')
    job_type = request.args.get('type', '')
    query = request.args.get('q', '').strip()

    sql = 'SELECT * FROM jobs WHERE 1=1'
    params = []

    if category:
        sql += ' AND category = ?'
        params.append(category)
    if job_type:
        sql += ' AND type = ?'
        params.append(job_type)
    if query:
        sql += ' AND (title LIKE ? OR company LIKE ? OR description LIKE ?)'
        wildcard = f'%{query}%'
        params.extend([wildcard, wildcard, wildcard])

    sql += ' ORDER BY id DESC'

    conn = get_db_connection()
    jobs = conn.execute(sql, params).fetchall()
    categories = [row[0] for row in conn.execute('SELECT DISTINCT category FROM jobs').fetchall()]
    job_types = [row[0] for row in conn.execute('SELECT DISTINCT type FROM jobs').fetchall()]
    conn.close()

    return render_template('jobs.html', jobs=jobs, categories=categories, job_types=job_types, selected_cat=category, selected_type=job_type, query=query)

@app.route('/post-job')
@recruiter_required
def post_job_page():
    return render_template('post_job.html')

@app.route('/applications')
@login_required
def application_tracker():
    conn = get_db_connection()
    if session.get('user_role') == 'applicant':
        applications = conn.execute('''
            SELECT a.*, j.title as job_title, j.company as job_company, j.location as job_location
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            WHERE a.applicant_email = ? OR a.user_id = ?
            ORDER BY a.id DESC
        ''', (session['user_email'], session.get('user_id'))).fetchall()
    else:
        applications = conn.execute('''
            SELECT a.*, j.title as job_title, j.company as job_company, j.location as job_location
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            ORDER BY a.id DESC
        ''').fetchall()
    conn.close()
    return render_template('applications.html', applications=applications)

@app.route('/recruiter/analytics')
@recruiter_required
def recruiter_analytics():
    conn = get_db_connection()
    raw_job_stats = conn.execute('''
        SELECT j.title, j.company, COUNT(a.id) as app_count
        FROM jobs j
        LEFT JOIN applications a ON j.id = a.job_id
        GROUP BY j.id
        ORDER BY app_count DESC LIMIT 6
    ''').fetchall()

    job_stats = [
        {
            'title': row['title'],
            'company': row['company'],
            'app_count': row['app_count']
        }
        for row in raw_job_stats
    ]

    status_counts = conn.execute('''
        SELECT status, COUNT(*) as count
        FROM applications
        GROUP BY status
    ''').fetchall()

    total_apps = conn.execute('SELECT COUNT(*) FROM applications').fetchone()[0]
    total_jobs = conn.execute('SELECT COUNT(*) FROM jobs').fetchone()[0]
    total_resumes = conn.execute('SELECT COUNT(*) FROM resumes').fetchone()[0]
    conn.close()

    status_dict = {row['status']: row['count'] for row in status_counts}

    return render_template('analytics.html', 
                           job_stats=job_stats, 
                           status_dict=status_dict,
                           total_apps=total_apps,
                           total_jobs=total_jobs,
                           total_resumes=total_resumes)

@app.route('/uploads/<path:filename>')
@login_required
def download_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=False)

# ----------------- Authentication Routes -----------------

@app.route('/login', methods=['GET', 'POST'])
def login_page():
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')

        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        conn.close()

        if user and verify_password(password, user['password_hash']):
            session['user_id'] = user['id']
            session['user_name'] = user['name']
            session['user_email'] = user['email']
            session['user_role'] = user['role']

            if user['role'] == 'recruiter':
                return redirect(url_for('application_tracker'))
            else:
                return redirect(url_for('resume_builder'))
        else:
            return render_template('login.html', error="Invalid email or password.")

    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register_page():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        role = request.form.get('role', 'applicant')

        if not name or not email or not password:
            return render_template('register.html', error="All fields are required.")

        conn = get_db_connection()
        existing = conn.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
        if existing:
            conn.close()
            return render_template('register.html', error="An account with this email already exists.")

        pwd_hash = hash_password(password)
        cursor = conn.cursor()
        cursor.execute('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
                       (name, email, pwd_hash, role))
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()

        session['user_id'] = user_id
        session['user_name'] = name
        session['user_email'] = email
        session['user_role'] = role

        if role == 'recruiter':
            return redirect(url_for('post_job_page'))
        else:
            return redirect(url_for('resume_builder'))

    return render_template('register.html')

@app.route('/demo-login/<role>')
def demo_login(role):
    conn = get_db_connection()
    if role == 'recruiter':
        user = conn.execute("SELECT * FROM users WHERE role = 'recruiter' LIMIT 1").fetchone()
    else:
        user = conn.execute("SELECT * FROM users WHERE role = 'applicant' LIMIT 1").fetchone()
    conn.close()

    if user:
        session['user_id'] = user['id']
        session['user_name'] = user['name']
        session['user_email'] = user['email']
        session['user_role'] = user['role']

    if role == 'recruiter':
        return redirect(url_for('application_tracker'))
    else:
        return redirect(url_for('resume_builder'))

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index', msg='You have been successfully signed out.'))

# ----------------- REST API Endpoints with Strict RBAC -----------------

@app.route('/api/ats-match', methods=['POST'])
def ats_match_api():
    if 'user_id' not in session:
        return jsonify({'error': 'Login required: Please sign in as a Job Seeker to run ATS analysis.'}), 401
    
    data = request.get_json() or {}
    job_id = data.get('job_id')
    resume_text = data.get('resume_text', '')

    conn = get_db_connection()
    job = conn.execute('SELECT * FROM jobs WHERE id = ?', (job_id,)).fetchone()
    conn.close()

    if not job:
        return jsonify({'error': 'Job not found'}), 404

    job_text = f"{job['title']} {job['description']} {job['requirements']}"
    result = analyze_ats_match(resume_text, job_text)
    return jsonify(result)

@app.route('/api/enhance-bullet', methods=['POST'])
def enhance_bullet():
    if 'user_id' not in session:
        return jsonify({'error': 'Login required.'}), 401

    data = request.get_json() or {}
    raw_bullet = data.get('bullet', '').strip()
    if not raw_bullet:
        return jsonify({'error': 'No bullet point provided'}), 400

    verb_templates = [
        f"Architected and delivered {raw_bullet}, achieving notable system stability and performance gains.",
        f"Spearheaded {raw_bullet}, optimizing developer workflows and reducing cycle latency.",
        f"Engineered and automated {raw_bullet}, resulting in enhanced scalability and throughput."
    ]

    return jsonify({
        'original': raw_bullet,
        'suggestions': verb_templates
    })

@app.route('/api/notifications/read-all', methods=['POST'])
def mark_notifications_read():
    if 'user_email' in session:
        conn = get_db_connection()
        conn.execute('UPDATE notifications SET is_read = 1 WHERE user_email = ?', (session['user_email'],))
        conn.commit()
        conn.close()
    return jsonify({'success': True})

@app.route('/api/jobs', methods=['POST'])
def create_job():
    if 'user_id' not in session:
        return jsonify({'error': 'Login required: Only signed-in Company Recruiters can post jobs.'}), 401
    if session.get('user_role') != 'recruiter':
        return jsonify({'error': 'Access Denied: Job Seekers / Candidates cannot post jobs. Only verified Company Recruiters are permitted to publish job openings.'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No job data provided'}), 400

    title = data.get('title', '').strip()
    company = data.get('company', '').strip()
    location = data.get('location', '').strip()
    job_type = data.get('type', 'Full-time').strip()
    category = data.get('category', 'Engineering').strip()
    salary = data.get('salary', '').strip()
    description = data.get('description', '').strip()
    requirements = data.get('requirements', '').strip()
    recruiter_id = session.get('user_id')

    if not title or not company or not description:
        return jsonify({'error': 'Title, company, and description are required.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO jobs (recruiter_id, title, company, location, type, category, salary, description, requirements)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (recruiter_id, title, company, location, job_type, category, salary, description, requirements))
    job_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({'success': True, 'job_id': job_id, 'message': 'Job posted successfully!'})

@app.route('/api/resumes', methods=['POST'])
def save_resume():
    if 'user_id' not in session:
        return jsonify({'error': 'Login required: Please sign in as a Job Seeker / Candidate to save your resume.'}), 401
    if session.get('user_role') != 'applicant':
        return jsonify({'error': 'Access Denied: Company Recruiters cannot create candidate resumes.'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    full_name = data.get('personal', {}).get('fullName', 'Anonymous')
    email = data.get('personal', {}).get('email', '')
    phone = data.get('personal', {}).get('phone', '')
    job_title = data.get('personal', {}).get('title', '')
    user_id = session.get('user_id')
    data_json = json.dumps(data)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO resumes (user_id, full_name, email, phone, job_title, data_json)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (user_id, full_name, email, phone, job_title, data_json))
    resume_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({'success': True, 'resume_id': resume_id, 'message': 'Resume saved successfully!'})

@app.route('/api/resumes/<int:resume_id>', methods=['GET'])
@login_required
def get_resume(resume_id):
    conn = get_db_connection()
    resume = conn.execute('SELECT * FROM resumes WHERE id = ?', (resume_id,)).fetchone()
    conn.close()
    if resume is None:
        return jsonify({'error': 'Resume not found'}), 404
    
    if session.get('user_role') == 'applicant' and resume['user_id'] != session.get('user_id'):
        return jsonify({'error': 'Access Denied'}), 403

    return jsonify({
        'id': resume['id'],
        'full_name': resume['full_name'],
        'email': resume['email'],
        'job_title': resume['job_title'],
        'data': json.loads(resume['data_json'])
    })

@app.route('/api/resumes/<int:resume_id>', methods=['DELETE'])
@candidate_required
def delete_resume(resume_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM resumes WHERE id = ? AND user_id = ?', (resume_id, session.get('user_id')))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Resume deleted successfully.'})

@app.route('/api/resumes/latest', methods=['GET'])
def get_latest_resume():
    if 'user_id' not in session:
        return jsonify({'resume': None})

    conn = get_db_connection()
    resume = conn.execute('SELECT * FROM resumes WHERE user_id = ? ORDER BY id DESC LIMIT 1', (session['user_id'],)).fetchone()
    conn.close()

    if resume is None:
        return jsonify({'resume': None})
    return jsonify({
        'resume': {
            'id': resume['id'],
            'full_name': resume['full_name'],
            'email': resume['email'],
            'job_title': resume['job_title'],
            'data': json.loads(resume['data_json'])
        }
    })

@app.route('/api/apply', methods=['POST'])
def submit_application():
    if 'user_id' not in session:
        return jsonify({'error': 'Login required: Please sign in as a Job Seeker / Candidate to submit your application.'}), 401
    if session.get('user_role') != 'applicant':
        return jsonify({'error': 'Access Denied: Company Recruiters cannot apply for jobs. Please log in with a Candidate account.'}), 403

    user_id = session.get('user_id')

    if request.content_type and 'multipart/form-data' in request.content_type:
        job_id = request.form.get('job_id')
        name = request.form.get('applicant_name')
        email = request.form.get('applicant_email')
        resume_id = request.form.get('resume_id') or None
        resume_summary = request.form.get('resume_summary', '')
        cover_note = request.form.get('cover_note', '')
        portfolio_url = request.form.get('portfolio_url', '')

        saved_filename = None
        if 'resume_file' in request.files:
            file = request.files['resume_file']
            if file and file.filename and allowed_file(file.filename):
                sec_name = secure_filename(file.filename)
                saved_filename = f"{int(time.time())}_{sec_name}"
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], saved_filename))
    else:
        data = request.get_json() or {}
        job_id = data.get('job_id')
        name = data.get('applicant_name')
        email = data.get('applicant_email')
        resume_id = data.get('resume_id')
        resume_summary = data.get('resume_summary', '')
        cover_note = data.get('cover_note', '')
        portfolio_url = data.get('portfolio_url', '')
        saved_filename = None

    if not job_id or not name or not email:
        return jsonify({'error': 'Job ID, applicant name, and email are required.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO applications (job_id, user_id, applicant_name, applicant_email, resume_id, resume_summary, cover_note, portfolio_url, resume_file)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (job_id, user_id, name, email, resume_id, resume_summary, cover_note, portfolio_url, saved_filename))
    app_id = cursor.lastrowid

    # Notification to candidate
    cursor.execute('''
        INSERT INTO notifications (user_email, message, link)
        VALUES (?, ?, ?)
    ''', (email, f"Application submitted successfully for Job #{job_id}", "/applications"))

    conn.commit()
    conn.close()

    return jsonify({'success': True, 'application_id': app_id, 'message': 'Application submitted successfully!'})

@app.route('/api/applications/<int:app_id>/status', methods=['POST'])
def update_application_status(app_id):
    if 'user_id' not in session or session.get('user_role') != 'recruiter':
        return jsonify({'error': 'Access Denied: Only company recruiters can update hiring pipeline stages.'}), 403

    data = request.get_json()
    new_status = data.get('status')
    if not new_status:
        return jsonify({'error': 'Status is required.'}), 400

    conn = get_db_connection()
    app_record = conn.execute('SELECT * FROM applications WHERE id = ?', (app_id,)).fetchone()
    
    conn.execute('UPDATE applications SET status = ? WHERE id = ?', (new_status, app_id))

    if app_record:
        candidate_email = app_record['applicant_email']
        job_info = conn.execute('SELECT title FROM jobs WHERE id = ?', (app_record['job_id'],)).fetchone()
        job_name = job_info['title'] if job_info else "Role"
        notif_msg = f"Your application for '{job_name}' has moved to: {new_status}!"
        conn.execute('INSERT INTO notifications (user_email, message, link) VALUES (?, ?, ?)',
                     (candidate_email, notif_msg, '/applications'))

    conn.commit()
    conn.close()

    return jsonify({'success': True, 'message': f'Status updated to {new_status}'})

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
