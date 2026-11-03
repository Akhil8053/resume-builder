// CareerCraft Job Application & ATS Controller with Strict Auth & Role Enforcement

document.addEventListener('DOMContentLoaded', () => {
    initJobsPage();
});

function initJobsPage() {
    const applyModal = document.getElementById('apply-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelApply = document.getElementById('btn-cancel-apply');
    const formApply = document.getElementById('form-job-apply');

    const inputJobId = document.getElementById('apply-job-id');
    const inputName = document.getElementById('apply-name');
    const inputEmail = document.getElementById('apply-email');
    const inputPortfolio = document.getElementById('apply-portfolio');
    const inputResumeId = document.getElementById('apply-resume-id');
    const inputResumeSummary = document.getElementById('apply-resume-summary');
    const inputCoverNote = document.getElementById('apply-cover-note');
    const inputFile = document.getElementById('apply-file');

    const radioBuilt = document.getElementById('choice-built');
    const radioUpload = document.getElementById('choice-upload');
    const boxSavedResume = document.getElementById('box-saved-resume');
    const boxUploadResume = document.getElementById('box-upload-resume');

    const modalTitle = document.getElementById('modal-job-title');
    const modalCompany = document.getElementById('modal-job-company');
    const resumeAttachStatus = document.getElementById('resume-attach-status');
    const resumeAttachDetails = document.getElementById('resume-attach-details');

    // ATS elements
    const btnRunAts = document.getElementById('btn-run-ats');
    const atsResults = document.getElementById('ats-results');
    const atsScoreText = document.getElementById('ats-score-text');
    const atsRatingBadge = document.getElementById('ats-rating-badge');
    const atsProgressBar = document.getElementById('ats-progress-bar');
    const atsMatchedTags = document.getElementById('ats-matched-tags');
    const atsMissingTags = document.getElementById('ats-missing-tags');
    const atsRecommendation = document.getElementById('ats-recommendation');

    let currentJobRequirements = "";

    // Radio choice toggles
    if (radioBuilt && radioUpload) {
        radioBuilt.addEventListener('change', () => {
            boxSavedResume.classList.remove('hidden');
            boxUploadResume.classList.add('hidden');
        });
        radioUpload.addEventListener('change', () => {
            boxSavedResume.classList.add('hidden');
            boxUploadResume.classList.remove('hidden');
        });
    }

    // Attach click listeners to all "Apply Now" buttons with STRICT Auth Guard
    document.querySelectorAll('.btn-open-apply').forEach(btn => {
        btn.addEventListener('click', async () => {
            const authState = document.getElementById('auth-state');
            const isLoggedIn = authState?.getAttribute('data-logged-in') === 'true';
            const userRole = authState?.getAttribute('data-role');

            if (!isLoggedIn) {
                alert("Login Required: Please sign in as a Job Seeker / Candidate to scan your ATS match score and apply for this job.");
                window.location.href = "/login?portal=candidate&msg=Please+sign+in+as+a+Job+Seeker+to+apply";
                return;
            }

            if (userRole === 'recruiter') {
                alert("Access Restricted: You are currently signed in with a Company / Recruiter account. Employers cannot apply for jobs. Please log in with a Candidate account to submit an application.");
                return;
            }

            inputJobId.value = btn.getAttribute('data-job-id');
            modalTitle.textContent = btn.getAttribute('data-job-title');
            modalCompany.textContent = `${btn.getAttribute('data-job-company')} • ${btn.getAttribute('data-job-location')}`;
            currentJobRequirements = `${btn.getAttribute('data-job-desc')} ${btn.getAttribute('data-job-reqs')}`;

            // Reset ATS scan view
            atsResults.classList.add('hidden');

            loadCandidateProfile();
            applyModal.classList.remove('hidden');
        });
    });

    // Run ATS Fit Score Scanner
    if (btnRunAts) {
        btnRunAts.addEventListener('click', async () => {
            const originalText = btnRunAts.innerHTML;
            btnRunAts.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Scanning...`;
            btnRunAts.disabled = true;

            let resumeText = "";
            const local = localStorage.getItem('careerCraft_resume');
            if (local) {
                try {
                    const parsed = JSON.parse(local);
                    resumeText = `${parsed.summary || ''} ${parsed.skills || ''} ${(parsed.experience || []).map(e => e.description).join(' ')}`;
                } catch(e) {}
            }

            try {
                const res = await fetch('/api/ats-match', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        job_id: inputJobId.value,
                        resume_text: resumeText
                    })
                });

                if (res.status === 401) {
                    alert("Please sign in as a Job Seeker to run ATS analysis.");
                    window.location.href = "/login?portal=candidate";
                    return;
                }

                const data = await res.json();

                atsScoreText.textContent = `${data.score}%`;
                atsRatingBadge.textContent = data.rating;
                atsProgressBar.style.width = `${data.score}%`;

                if (data.score >= 75) {
                    atsScoreText.className = 'text-base font-black text-emerald-600 ml-1';
                    atsRatingBadge.className = 'ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800';
                    atsProgressBar.className = 'bg-emerald-500 h-2 rounded-full transition-all duration-500';
                } else if (data.score >= 50) {
                    atsScoreText.className = 'text-base font-black text-amber-600 ml-1';
                    atsRatingBadge.className = 'ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800';
                    atsProgressBar.className = 'bg-amber-500 h-2 rounded-full transition-all duration-500';
                } else {
                    atsScoreText.className = 'text-base font-black text-rose-600 ml-1';
                    atsRatingBadge.className = 'ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800';
                    atsProgressBar.className = 'bg-rose-500 h-2 rounded-full transition-all duration-500';
                }

                atsMatchedTags.innerHTML = (data.matched || []).map(k => `
                    <span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10.5px] font-semibold">${k}</span>
                `).join('') || '<span class="text-slate-400 text-[11px]">None detected</span>';

                atsMissingTags.innerHTML = (data.missing || []).map(k => `
                    <span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10.5px] font-semibold">${k}</span>
                `).join('') || '<span class="text-slate-400 text-[11px]">None</span>';

                atsRecommendation.textContent = data.recommendation;
                atsResults.classList.remove('hidden');

            } catch (err) {
                console.error(err);
                alert('Error running ATS scan.');
            } finally {
                btnRunAts.innerHTML = originalText;
                btnRunAts.disabled = false;
            }
        });
    }

    async function loadCandidateProfile() {
        const local = localStorage.getItem('careerCraft_resume');
        const localId = localStorage.getItem('careerCraft_latest_resume_id');

        if (local) {
            try {
                const parsed = JSON.parse(local);
                if (parsed.personal) {
                    if (!inputName.value) inputName.value = parsed.personal.fullName || '';
                    if (!inputEmail.value) inputEmail.value = parsed.personal.email || '';
                    if (!inputPortfolio.value) inputPortfolio.value = parsed.personal.website || '';
                }
                if (localId) {
                    inputResumeId.value = localId;
                    inputResumeSummary.value = parsed.summary || '';
                    resumeAttachStatus.textContent = `Attached: Profile #${localId}`;
                    resumeAttachStatus.className = 'text-[11px] text-emerald-800 font-semibold bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300';
                    resumeAttachDetails.textContent = `Linked to: ${parsed.personal?.fullName || 'Candidate'}`;
                    return;
                }
            } catch (e) {
                console.warn(e);
            }
        }

        try {
            const res = await fetch('/api/resumes/latest');
            const data = await res.json();
            if (data.resume) {
                const r = data.resume;
                inputResumeId.value = r.id;
                if (!inputName.value) inputName.value = r.full_name;
                if (!inputEmail.value) inputEmail.value = r.email;
                resumeAttachStatus.textContent = `Attached: Profile #${r.id}`;
                resumeAttachStatus.className = 'text-[11px] text-emerald-800 font-semibold bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300';
                resumeAttachDetails.textContent = `Linked to: ${r.full_name} (${r.job_title})`;
            } else {
                resumeAttachStatus.textContent = 'No saved profile yet';
                resumeAttachStatus.className = 'text-[11px] text-amber-800 font-semibold bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300';
                resumeAttachDetails.textContent = 'Build one in the Studio or upload a file above.';
            }
        } catch (err) {
            resumeAttachStatus.textContent = 'Manual application';
        }
    }

    function closeModal() {
        applyModal.classList.add('hidden');
    }

    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnCancelApply) btnCancelApply.addEventListener('click', closeModal);
    if (applyModal) {
        applyModal.addEventListener('click', (e) => {
            if (e.target === applyModal) closeModal();
        });
    }

    // Submit Application using FormData
    if (formApply) {
        formApply.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = document.getElementById('btn-submit-apply');
            const originalText = submitBtn.innerHTML;

            const formData = new FormData();
            formData.append('job_id', inputJobId.value);
            formData.append('applicant_name', inputName.value.trim());
            formData.append('applicant_email', inputEmail.value.trim());
            formData.append('portfolio_url', inputPortfolio.value.trim());
            formData.append('cover_note', inputCoverNote.value.trim());

            if (radioUpload.checked) {
                if (inputFile.files && inputFile.files[0]) {
                    formData.append('resume_file', inputFile.files[0]);
                } else {
                    alert('Please select a resume file (.pdf, .doc, or .docx) to upload.');
                    return;
                }
            } else {
                if (inputResumeId.value) {
                    formData.append('resume_id', inputResumeId.value);
                    formData.append('resume_summary', inputResumeSummary.value);
                }
            }

            try {
                submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting...`;
                submitBtn.disabled = true;

                const res = await fetch('/api/apply', {
                    method: 'POST',
                    body: formData
                });

                if (res.status === 401) {
                    alert('Please log in as a Job Seeker / Candidate to submit your application.');
                    window.location.href = '/login?portal=candidate';
                    return;
                }
                if (res.status === 403) {
                    alert('Access Denied: Company Recruiters cannot apply for jobs.');
                    return;
                }

                const result = await res.json();
                if (result.success) {
                    closeModal();
                    alert(`🎉 Congratulations! Your application for "${modalTitle.textContent}" was successfully submitted!`);
                    window.location.href = '/applications';
                } else {
                    alert('❌ Submission failed: ' + (result.error || 'Server error'));
                }
            } catch (err) {
                console.error(err);
                alert('❌ Network error submitting application.');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}
