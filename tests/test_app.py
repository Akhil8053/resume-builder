import unittest
import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
from database import init_db, get_db_connection, hash_password, verify_password
from ats_scanner import analyze_ats_match

class CareerCraftStrictRBACTestCase(unittest.TestCase):

    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()
        with app.app_context():
            init_db()

    def test_01_unauthenticated_user_blocked_from_builder(self):
        """Unauthenticated visitor trying to access /builder must be redirected to login."""
        response = self.client.get('/builder')
        # Expect 302 redirect to login
        self.assertEqual(response.status_code, 302)
        self.assertIn('/login', response.headers['Location'])

    def test_02_unauthenticated_user_blocked_from_post_job(self):
        """Unauthenticated visitor trying to access /post-job must be redirected to company login."""
        response = self.client.get('/post-job')
        self.assertEqual(response.status_code, 302)
        self.assertIn('/login', response.headers['Location'])

    def test_03_candidate_blocked_from_posting_job(self):
        """Candidate logged in trying to access /post-job or POST /api/jobs must be blocked with 403."""
        with self.client.session_transaction() as sess:
            sess['user_id'] = 1
            sess['user_name'] = "Alex Morgan"
            sess['user_email'] = "alex@demo.com"
            sess['user_role'] = "applicant"

        # Attempt visiting /post-job page
        page_res = self.client.get('/post-job')
        self.assertEqual(page_res.status_code, 302)
        self.assertIn('/jobs', page_res.headers['Location'])

        # Attempt API POST /api/jobs
        payload = {"title": "Test Role", "company": "Test Co", "description": "desc"}
        api_res = self.client.post('/api/jobs', 
                                   data=json.dumps(payload),
                                   content_type='application/json')
        self.assertEqual(api_res.status_code, 403)

    def test_04_recruiter_blocked_from_resume_builder_and_applying(self):
        """Recruiter trying to access /builder or apply must be blocked with 403."""
        with self.client.session_transaction() as sess:
            sess['user_id'] = 2
            sess['user_name'] = "Sarah Jenkins"
            sess['user_email'] = "sarah@recruiter.com"
            sess['user_role'] = "recruiter"

        # Attempt visiting /builder
        page_res = self.client.get('/builder')
        self.assertEqual(page_res.status_code, 302)
        self.assertIn('/applications', page_res.headers['Location'])

        # Attempt applying via API
        apply_res = self.client.post('/api/apply',
                                     data=json.dumps({"job_id": 1, "applicant_name": "Sarah", "applicant_email": "sarah@recruiter.com"}),
                                     content_type='application/json')
        self.assertEqual(apply_res.status_code, 403)

    def test_05_candidate_can_save_resume(self):
        """Candidate can save their resume successfully."""
        with self.client.session_transaction() as sess:
            sess['user_id'] = 1
            sess['user_name'] = "Alex Morgan"
            sess['user_email'] = "alex@demo.com"
            sess['user_role'] = "applicant"

        payload = {
            "personal": {"fullName": "Alex Morgan", "email": "alex@demo.com", "phone": "123", "title": "Dev"},
            "summary": "Full stack engineer",
            "skills": "Python, SQL, React",
            "experience": [],
            "education": [],
            "projects": []
        }
        res = self.client.post('/api/resumes', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data.get('success'))

    def test_06_ats_matcher(self):
        """Test ATS keyword matching logic."""
        res = analyze_ats_match("Python, Flask, Git", "Required: Python, Flask, Docker, Git")
        self.assertIn('score', res)
        self.assertIn('python', res['matched'])
        self.assertIn('docker', res['missing'])

if __name__ == '__main__':
    unittest.main()
