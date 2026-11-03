// CareerCraft Resume Builder Controller

let currentTemplate = 'modern';
let experienceCount = 0;
let educationCount = 0;
let projectCount = 0;
let certCount = 0;
let langCount = 0;
let awardCount = 0;

// Expanded Sample Profile Data
const sampleResumeData = {
    personal: {
        fullName: "Samantha Wright",
        title: "Senior Full-Stack Software Engineer",
        email: "samantha.wright@devmail.io",
        phone: "+1 (415) 890-3421",
        location: "San Francisco, CA (Open to Remote)",
        website: "github.com/swright-dev • swright.tech"
    },
    summary: "High-performing Full-Stack Engineer with 5+ years building distributed cloud applications and high-throughput microservices. Proven expertise in Python, JavaScript/TypeScript, React, and relational database architecture. Passionate about developer tooling, API reliability, and modern UI engineering.",
    experience: [
        {
            role: "Lead Full-Stack Developer",
            company: "HyperScale Cloud Systems",
            location: "San Francisco, CA",
            dates: "2023 - Present",
            description: "• Architected microservices platform handling 14M+ daily API requests using Python and Redis.\n• Led frontend migration to React & Tailwind CSS, improving Lighthouse performance score from 68 to 96.\n• Mentored 4 junior engineers in CI/CD pipeline automation and clean code best practices."
        },
        {
            role: "Software Engineer",
            company: "Vanguard Digital Media",
            location: "Austin, TX",
            dates: "2021 - 2023",
            description: "• Built customer-facing dashboard enabling real-time analytics with sub-second query latency.\n• Designed and maintained SQLite and PostgreSQL data schemas for 120,000+ active user accounts.\n• Reduced web app bundle size by 35% through dynamic code-splitting and asset optimization."
        }
    ],
    education: [
        {
            degree: "B.S. in Computer Science",
            institution: "University of California, Berkeley",
            year: "2017 - 2021",
            score: "GPA: 3.85 / 4.0 (Dean's Honor List)"
        }
    ],
    skills: "Python, JavaScript (ES6+), TypeScript, React, Flask, Node.js, SQL, PostgreSQL, SQLite, Docker, Git, RESTful APIs, Tailwind CSS",
    projects: [
        {
            name: "CloudFlow Task Orchestrator",
            tech: "Python, Flask, SQLite, Celery",
            link: "github.com/swright-dev/cloudflow",
            description: "Open-source asynchronous job queue and monitoring dashboard with automated retry logic and Slack webhook alerts."
        },
        {
            name: "Interactive Portfolio & Job Radar",
            tech: "React, Tailwind, WebSockets",
            link: "radar.swright.tech",
            description: "Live job aggregator parsing 500+ daily tech openings with keyword matching and automated resume fit score."
        }
    ],
    certifications: [
        {
            name: "AWS Certified Solutions Architect – Associate",
            issuer: "Amazon Web Services",
            year: "2023"
        },
        {
            name: "Meta Professional Front-End Developer Certificate",
            issuer: "Coursera / Meta",
            year: "2022"
        }
    ],
    languages: [
        { name: "English", level: "Native / Bilingual" },
        { name: "Spanish", level: "Professional Working" },
        { name: "German", level: "Elementary" }
    ],
    awards: [
        { title: "First Place – HackTech 2023", organization: "Caltech Hackathon", year: "2023" },
        { title: "Engineering Excellence Award", organization: "HyperScale Cloud", year: "2024" }
    ]
};

// Form Inputs
const inputName = document.getElementById('input-name');
const inputTitle = document.getElementById('input-title');
const inputEmail = document.getElementById('input-email');
const inputPhone = document.getElementById('input-phone');
const inputLocation = document.getElementById('input-location');
const inputWebsite = document.getElementById('input-website');
const inputSummary = document.getElementById('input-summary');
const inputSkills = document.getElementById('input-skills');

// Preview Containers
const resumeDoc = document.getElementById('resume-document');
const layoutSingle = document.getElementById('layout-single-col');
const layoutSidebar = document.getElementById('layout-sidebar-col');

const expContainer = document.getElementById('experience-container');
const eduContainer = document.getElementById('education-container');
const projContainer = document.getElementById('projects-container');
const certContainer = document.getElementById('certifications-container');
const langContainer = document.getElementById('languages-container');
const awardContainer = document.getElementById('awards-container');

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();

    // Check if URL has ?load=ID to load specific resume from gallery
    const urlParams = new URLSearchParams(window.location.search);
    const loadId = urlParams.get('load');
    if (loadId) {
        fetch(`/api/resumes/${loadId}`)
            .then(res => res.json())
            .then(data => {
                if (data.data) {
                    loadDataIntoForm(data.data);
                }
            })
            .catch(() => loadFromStorageOrSample());
    } else {
        loadFromStorageOrSample();
    }
});

function loadFromStorageOrSample() {
    const saved = localStorage.getItem('careerCraft_resume');
    if (saved) {
        try {
            loadDataIntoForm(JSON.parse(saved));
        } catch (e) {
            loadDataIntoForm(sampleResumeData);
        }
    } else {
        loadDataIntoForm(sampleResumeData);
    }
}

function setupEventListeners() {
    [inputName, inputTitle, inputEmail, inputPhone, inputLocation, inputWebsite, inputSummary, inputSkills].forEach(input => {
        if (input) input.addEventListener('input', updatePreview);
    });

    document.getElementById('btn-add-experience').addEventListener('click', () => addExperienceField());
    document.getElementById('btn-add-education').addEventListener('click', () => addEducationField());
    document.getElementById('btn-add-project').addEventListener('click', () => addProjectField());
    document.getElementById('btn-add-cert').addEventListener('click', () => addCertField());
    document.getElementById('btn-add-lang').addEventListener('click', () => addLangField());
    document.getElementById('btn-add-award').addEventListener('click', () => addAwardField());

    document.getElementById('btn-load-sample').addEventListener('click', () => {
        if (confirm('Load sample professional data into your resume?')) {
            loadDataIntoForm(sampleResumeData);
        }
    });

    document.getElementById('btn-save-db').addEventListener('click', saveResumeToDatabase);
    document.getElementById('btn-export-pdf').addEventListener('click', () => window.print());

    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.template-btn').forEach(b => {
                b.classList.remove('active', 'bg-white', 'text-slate-800', 'shadow-sm');
                b.classList.add('text-slate-600');
            });
            btn.classList.add('active', 'bg-white', 'text-slate-800', 'shadow-sm');
            setTemplate(btn.getAttribute('data-template'));
        });
    });
}

function setTemplate(template) {
    currentTemplate = template;
    resumeDoc.classList.remove('modern-theme', 'executive-theme', 'minimalist-theme', 'sidebar-theme');
    resumeDoc.classList.add(`${template}-theme`);

    if (template === 'sidebar') {
        layoutSingle.classList.add('hidden');
        layoutSidebar.classList.remove('hidden');
    } else {
        layoutSingle.classList.remove('hidden');
        layoutSidebar.classList.add('hidden');
    }
    updatePreview();
}

// Add Dynamic Form Rows
function addExperienceField(data = {}) {
    experienceCount++;
    const id = experienceCount;
    const div = document.createElement('div');
    div.className = 'p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 exp-row';
    div.id = `exp-row-${id}`;
    div.innerHTML = `
        <div class="flex justify-between items-center text-xs font-bold text-slate-700">
            <span>Role #${id}</span>
            <button type="button" class="text-rose-500 hover:text-rose-700 font-normal" onclick="removeField('exp-row-${id}')">Remove</button>
        </div>
        <div class="grid grid-cols-2 gap-2">
            <input type="text" class="exp-role px-2 py-1.5 border rounded text-xs" placeholder="Job Title" value="${data.role || ''}">
            <input type="text" class="exp-company px-2 py-1.5 border rounded text-xs" placeholder="Company Name" value="${data.company || ''}">
        </div>
        <div class="grid grid-cols-2 gap-2">
            <input type="text" class="exp-dates px-2 py-1.5 border rounded text-xs" placeholder="Dates (e.g. 2022 - Present)" value="${data.dates || ''}">
            <input type="text" class="exp-location px-2 py-1.5 border rounded text-xs" placeholder="Location" value="${data.location || ''}">
        </div>
        <textarea rows="2" class="exp-desc w-full px-2 py-1.5 border rounded text-xs" placeholder="Achievements and bullet points...">${data.description || ''}</textarea>
    `;
    expContainer.appendChild(div);
    div.querySelectorAll('input, textarea').forEach(el => el.addEventListener('input', updatePreview));
    updatePreview();
}

function addEducationField(data = {}) {
    educationCount++;
    const id = educationCount;
    const div = document.createElement('div');
    div.className = 'p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 edu-row';
    div.id = `edu-row-${id}`;
    div.innerHTML = `
        <div class="flex justify-between items-center text-xs font-bold text-slate-700">
            <span>Education #${id}</span>
            <button type="button" class="text-rose-500 hover:text-rose-700 font-normal" onclick="removeField('edu-row-${id}')">Remove</button>
        </div>
        <div class="grid grid-cols-2 gap-2">
            <input type="text" class="edu-degree px-2 py-1.5 border rounded text-xs" placeholder="Degree (e.g. B.S. in CS)" value="${data.degree || ''}">
            <input type="text" class="edu-inst px-2 py-1.5 border rounded text-xs" placeholder="Institution" value="${data.institution || ''}">
        </div>
        <div class="grid grid-cols-2 gap-2">
            <input type="text" class="edu-year px-2 py-1.5 border rounded text-xs" placeholder="Year" value="${data.year || ''}">
            <input type="text" class="edu-score px-2 py-1.5 border rounded text-xs" placeholder="GPA / Honors" value="${data.score || ''}">
        </div>
    `;
    eduContainer.appendChild(div);
    div.querySelectorAll('input').forEach(el => el.addEventListener('input', updatePreview));
    updatePreview();
}

function addProjectField(data = {}) {
    projectCount++;
    const id = projectCount;
    const div = document.createElement('div');
    div.className = 'p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 proj-row';
    div.id = `proj-row-${id}`;
    div.innerHTML = `
        <div class="flex justify-between items-center text-xs font-bold text-slate-700">
            <span>Project #${id}</span>
            <button type="button" class="text-rose-500 hover:text-rose-700 font-normal" onclick="removeField('proj-row-${id}')">Remove</button>
        </div>
        <div class="grid grid-cols-2 gap-2">
            <input type="text" class="proj-name px-2 py-1.5 border rounded text-xs" placeholder="Project Name" value="${data.name || ''}">
            <input type="text" class="proj-tech px-2 py-1.5 border rounded text-xs" placeholder="Tech Stack" value="${data.tech || ''}">
        </div>
        <input type="text" class="proj-link w-full px-2 py-1.5 border rounded text-xs" placeholder="Demo or GitHub Link" value="${data.link || ''}">
        <textarea rows="2" class="proj-desc w-full px-2 py-1.5 border rounded text-xs" placeholder="Summary...">${data.description || ''}</textarea>
    `;
    projContainer.appendChild(div);
    div.querySelectorAll('input, textarea').forEach(el => el.addEventListener('input', updatePreview));
    updatePreview();
}

function addCertField(data = {}) {
    certCount++;
    const id = certCount;
    const div = document.createElement('div');
    div.className = 'p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 cert-row';
    div.id = `cert-row-${id}`;
    div.innerHTML = `
        <div class="flex justify-between items-center text-xs font-semibold text-slate-600">
            <span>Certification #${id}</span>
            <button type="button" class="text-rose-500 text-[11px]" onclick="removeField('cert-row-${id}')">Remove</button>
        </div>
        <input type="text" class="cert-name w-full px-2 py-1 border rounded text-xs" placeholder="Certificate Name" value="${data.name || ''}">
        <div class="grid grid-cols-2 gap-2">
            <input type="text" class="cert-issuer px-2 py-1 border rounded text-xs" placeholder="Issuing Body (e.g. AWS)" value="${data.issuer || ''}">
            <input type="text" class="cert-year px-2 py-1 border rounded text-xs" placeholder="Year" value="${data.year || ''}">
        </div>
    `;
    certContainer.appendChild(div);
    div.querySelectorAll('input').forEach(el => el.addEventListener('input', updatePreview));
    updatePreview();
}

function addLangField(data = {}) {
    langCount++;
    const id = langCount;
    const div = document.createElement('div');
    div.className = 'flex items-center space-x-2 lang-row';
    div.id = `lang-row-${id}`;
    div.innerHTML = `
        <input type="text" class="lang-name w-1/2 px-2 py-1 border rounded text-xs" placeholder="Language (e.g. Spanish)" value="${data.name || ''}">
        <input type="text" class="lang-level w-1/2 px-2 py-1 border rounded text-xs" placeholder="Proficiency (e.g. Fluent)" value="${data.level || ''}">
        <button type="button" class="text-rose-500 text-xs px-1" onclick="removeField('lang-row-${id}')">✕</button>
    `;
    langContainer.appendChild(div);
    div.querySelectorAll('input').forEach(el => el.addEventListener('input', updatePreview));
    updatePreview();
}

function addAwardField(data = {}) {
    awardCount++;
    const id = awardCount;
    const div = document.createElement('div');
    div.className = 'p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 award-row';
    div.id = `award-row-${id}`;
    div.innerHTML = `
        <div class="flex justify-between items-center text-xs font-semibold text-slate-600">
            <span>Award #${id}</span>
            <button type="button" class="text-rose-500 text-[11px]" onclick="removeField('award-row-${id}')">Remove</button>
        </div>
        <input type="text" class="award-title w-full px-2 py-1 border rounded text-xs" placeholder="Award Title" value="${data.title || ''}">
        <div class="grid grid-cols-2 gap-2">
            <input type="text" class="award-org px-2 py-1 border rounded text-xs" placeholder="Organization" value="${data.organization || ''}">
            <input type="text" class="award-year px-2 py-1 border rounded text-xs" placeholder="Year" value="${data.year || ''}">
        </div>
    `;
    awardContainer.appendChild(div);
    div.querySelectorAll('input').forEach(el => el.addEventListener('input', updatePreview));
    updatePreview();
}

window.removeField = function(id) {
    const el = document.getElementById(id);
    if (el) { el.remove(); updatePreview(); }
};

function loadDataIntoForm(data) {
    inputName.value = data.personal?.fullName || '';
    inputTitle.value = data.personal?.title || '';
    inputEmail.value = data.personal?.email || '';
    inputPhone.value = data.personal?.phone || '';
    inputLocation.value = data.personal?.location || '';
    inputWebsite.value = data.personal?.website || '';
    inputSummary.value = data.summary || '';
    inputSkills.value = data.skills || '';

    expContainer.innerHTML = '';
    eduContainer.innerHTML = '';
    projContainer.innerHTML = '';
    certContainer.innerHTML = '';
    langContainer.innerHTML = '';
    awardContainer.innerHTML = '';

    (data.experience || []).forEach(exp => addExperienceField(exp));
    (data.education || []).forEach(edu => addEducationField(edu));
    (data.projects || []).forEach(proj => addProjectField(proj));
    (data.certifications || []).forEach(c => addCertField(c));
    (data.languages || []).forEach(l => addLangField(l));
    (data.awards || []).forEach(a => addAwardField(a));

    updatePreview();
}

function collectFormData() {
    const data = {
        personal: {
            fullName: inputName.value.trim(),
            title: inputTitle.value.trim(),
            email: inputEmail.value.trim(),
            phone: inputPhone.value.trim(),
            location: inputLocation.value.trim(),
            website: inputWebsite.value.trim()
        },
        summary: inputSummary.value.trim(),
        skills: inputSkills.value.trim(),
        experience: [],
        education: [],
        projects: [],
        certifications: [],
        languages: [],
        awards: []
    };

    document.querySelectorAll('.exp-row').forEach(row => {
        data.experience.push({
            role: row.querySelector('.exp-role')?.value.trim() || '',
            company: row.querySelector('.exp-company')?.value.trim() || '',
            dates: row.querySelector('.exp-dates')?.value.trim() || '',
            location: row.querySelector('.exp-location')?.value.trim() || '',
            description: row.querySelector('.exp-desc')?.value.trim() || ''
        });
    });

    document.querySelectorAll('.edu-row').forEach(row => {
        data.education.push({
            degree: row.querySelector('.edu-degree')?.value.trim() || '',
            institution: row.querySelector('.edu-inst')?.value.trim() || '',
            year: row.querySelector('.edu-year')?.value.trim() || '',
            score: row.querySelector('.edu-score')?.value.trim() || ''
        });
    });

    document.querySelectorAll('.proj-row').forEach(row => {
        data.projects.push({
            name: row.querySelector('.proj-name')?.value.trim() || '',
            tech: row.querySelector('.proj-tech')?.value.trim() || '',
            link: row.querySelector('.proj-link')?.value.trim() || '',
            description: row.querySelector('.proj-desc')?.value.trim() || ''
        });
    });

    document.querySelectorAll('.cert-row').forEach(row => {
        data.certifications.push({
            name: row.querySelector('.cert-name')?.value.trim() || '',
            issuer: row.querySelector('.cert-issuer')?.value.trim() || '',
            year: row.querySelector('.cert-year')?.value.trim() || ''
        });
    });

    document.querySelectorAll('.lang-row').forEach(row => {
        data.languages.push({
            name: row.querySelector('.lang-name')?.value.trim() || '',
            level: row.querySelector('.lang-level')?.value.trim() || ''
        });
    });

    document.querySelectorAll('.award-row').forEach(row => {
        data.awards.push({
            title: row.querySelector('.award-title')?.value.trim() || '',
            organization: row.querySelector('.award-org')?.value.trim() || '',
            year: row.querySelector('.award-year')?.value.trim() || ''
        });
    });

    return data;
}

function updatePreview() {
    const data = collectFormData();

    // Standard Preview Elements
    const previewName = document.getElementById('preview-name');
    const previewTitle = document.getElementById('preview-title');
    const previewEmail = document.getElementById('preview-email');
    const previewPhone = document.getElementById('preview-phone');
    const previewLocation = document.getElementById('preview-location');
    const previewWebsite = document.getElementById('preview-website');
    const previewSummary = document.getElementById('preview-summary');
    const previewSkillsList = document.getElementById('preview-skills-list');
    const previewExpList = document.getElementById('preview-experience-list');
    const previewEduList = document.getElementById('preview-education-list');
    const previewProjList = document.getElementById('preview-projects-list');
    const previewCertList = document.getElementById('preview-cert-list');
    const previewLangList = document.getElementById('preview-lang-list');
    const previewAwardList = document.getElementById('preview-award-list');

    // Sidebar Preview Elements
    const sbName = document.getElementById('sb-preview-name');
    const sbTitle = document.getElementById('sb-preview-title');
    const sbContact = document.getElementById('sb-preview-contact');
    const sbSkills = document.getElementById('sb-preview-skills');
    const sbEducation = document.getElementById('sb-preview-education');
    const sbLanguages = document.getElementById('sb-preview-languages');
    const sbSummary = document.getElementById('sb-preview-summary');
    const sbExperience = document.getElementById('sb-preview-experience');
    const sbProjects = document.getElementById('sb-preview-projects');
    const sbCertAwards = document.getElementById('sb-preview-cert-awards');

    // Populate Standard
    if (previewName) previewName.textContent = data.personal.fullName || 'Samantha Wright';
    if (previewTitle) previewTitle.textContent = data.personal.title || 'Senior Software Engineer';
    if (previewEmail) previewEmail.innerHTML = `<i class="fa-solid fa-envelope mr-1 text-slate-400"></i> ${data.personal.email || 'email@example.com'}`;
    if (previewPhone) previewPhone.innerHTML = `<i class="fa-solid fa-phone mr-1 text-slate-400"></i> ${data.personal.phone || '+1 000 000 000'}`;
    if (previewLocation) previewLocation.innerHTML = `<i class="fa-solid fa-location-dot mr-1 text-slate-400"></i> ${data.personal.location || 'Location'}`;
    if (previewWebsite) previewWebsite.innerHTML = `<i class="fa-solid fa-globe mr-1 text-slate-400"></i> ${data.personal.website || 'website.com'}`;
    if (previewSummary) previewSummary.textContent = data.summary || 'Summary goes here...';

    // Populate Sidebar
    if (sbName) sbName.textContent = data.personal.fullName || 'Samantha Wright';
    if (sbTitle) sbTitle.textContent = data.personal.title || 'Senior Software Engineer';
    if (sbContact) {
        sbContact.innerHTML = `
            <div><i class="fa-solid fa-envelope mr-1 text-teal-600"></i> ${data.personal.email || 'email@example.com'}</div>
            <div><i class="fa-solid fa-phone mr-1 text-teal-600"></i> ${data.personal.phone || '+1 000 000 000'}</div>
            <div><i class="fa-solid fa-location-dot mr-1 text-teal-600"></i> ${data.personal.location || 'Location'}</div>
            <div><i class="fa-solid fa-globe mr-1 text-teal-600"></i> ${data.personal.website || 'website.com'}</div>
        `;
    }
    if (sbSummary) sbSummary.textContent = data.summary || '';

    // Skills
    if (previewSkillsList) previewSkillsList.innerHTML = '';
    if (sbSkills) sbSkills.innerHTML = '';
    const skills = data.skills ? data.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    skills.forEach(s => {
        if (previewSkillsList) {
            const span = document.createElement('span');
            span.className = 'skill-badge';
            span.textContent = s;
            previewSkillsList.appendChild(span);
        }
        if (sbSkills) {
            const span = document.createElement('span');
            span.className = 'skill-badge text-[10px]';
            span.textContent = s;
            sbSkills.appendChild(span);
        }
    });

    // Experience
    if (previewExpList) previewExpList.innerHTML = '';
    if (sbExperience) sbExperience.innerHTML = '';
    data.experience.forEach(exp => {
        if (!exp.role && !exp.company) return;
        const bullets = exp.description.split('\n').filter(Boolean);
        const bulletsHtml = bullets.map(b => `<li class="text-[11.5px] text-slate-600 leading-relaxed">${b.replace(/^[•\-\*]\s*/, '')}</li>`).join('');

        const item = `
            <div class="pb-2">
                <div class="flex justify-between items-baseline mb-0.5">
                    <span class="font-bold text-slate-900 text-xs">${exp.role} <span class="text-slate-500 font-normal">at ${exp.company}</span></span>
                    <span class="text-[10.5px] font-medium text-slate-500">${exp.dates}</span>
                </div>
                ${bullets.length > 0 ? `<ul class="list-disc pl-4 space-y-0.5 mt-0.5">${bulletsHtml}</ul>` : ''}
            </div>
        `;
        if (previewExpList) previewExpList.innerHTML += item;
        if (sbExperience) sbExperience.innerHTML += item;
    });

    // Projects
    if (previewProjList) previewProjList.innerHTML = '';
    if (sbProjects) sbProjects.innerHTML = '';
    data.projects.forEach(proj => {
        if (!proj.name) return;
        const item = `
            <div class="pb-1.5">
                <div class="flex justify-between items-baseline mb-0.5">
                    <span class="font-bold text-slate-900 text-xs">${proj.name} ${proj.tech ? `<span class="text-teal-600 text-[11px] font-semibold">[${proj.tech}]</span>` : ''}</span>
                    <span class="text-[10px] text-slate-400">${proj.link || ''}</span>
                </div>
                <p class="text-[11.5px] text-slate-600 leading-relaxed">${proj.description}</p>
            </div>
        `;
        if (previewProjList) previewProjList.innerHTML += item;
        if (sbProjects) sbProjects.innerHTML += item;
    });

    // Education
    if (previewEduList) previewEduList.innerHTML = '';
    if (sbEducation) sbEducation.innerHTML = '';
    data.education.forEach(edu => {
        if (!edu.degree && !edu.institution) return;
        const item = `
            <div class="pb-1">
                <div class="font-bold text-slate-900 text-xs">${edu.degree}</div>
                <div class="text-[11px] text-slate-500">${edu.institution} • ${edu.year}</div>
                ${edu.score ? `<div class="text-[10.5px] text-slate-500">${edu.score}</div>` : ''}
            </div>
        `;
        if (previewEduList) previewEduList.innerHTML += item;
        if (sbEducation) sbEducation.innerHTML += item;
    });

    // Certifications
    if (previewCertList) previewCertList.innerHTML = '';
    if (sbCertAwards) sbCertAwards.innerHTML = '';
    data.certifications.forEach(c => {
        if (!c.name) return;
        const item = `<div><strong>${c.name}</strong> <span class="text-slate-500">(${c.issuer || ''} ${c.year || ''})</span></div>`;
        if (previewCertList) previewCertList.innerHTML += item;
        if (sbCertAwards) sbCertAwards.innerHTML += item;
    });

    // Awards
    if (previewAwardList) previewAwardList.innerHTML = '';
    data.awards.forEach(a => {
        if (!a.title) return;
        const item = `<div><strong>${a.title}</strong> <span class="text-slate-500">– ${a.organization || ''} (${a.year || ''})</span></div>`;
        if (previewAwardList) previewAwardList.innerHTML += item;
        if (sbCertAwards) sbCertAwards.innerHTML += item;
    });

    // Languages
    if (previewLangList) previewLangList.innerHTML = '';
    if (sbLanguages) sbLanguages.innerHTML = '';
    data.languages.forEach(l => {
        if (!l.name) return;
        if (previewLangList) {
            previewLangList.innerHTML += `<span class="bg-slate-100 px-2 py-0.5 rounded text-slate-700"><strong>${l.name}</strong> (${l.level || 'Fluent'})</span>`;
        }
        if (sbLanguages) {
            sbLanguages.innerHTML += `<div class="flex justify-between"><span>${l.name}</span> <span class="text-slate-400">${l.level || 'Fluent'}</span></div>`;
        }
    });

    localStorage.setItem('careerCraft_resume', JSON.stringify(data));
}

async function saveResumeToDatabase() {
    const data = collectFormData();
    try {
        const res = await fetch('/api/resumes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            localStorage.setItem('careerCraft_latest_resume_id', result.resume_id);
            alert(`✅ Resume saved to your profile with ID #${result.resume_id}!\nYou can now view and edit it anytime under 'My Saved Resumes'.`);
        }
    } catch (err) {
        alert('Error saving resume to server.');
    }
}
