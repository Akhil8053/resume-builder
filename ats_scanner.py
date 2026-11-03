import re
from typing import Dict, List, Set, Any

COMMON_TECH_KEYWORDS = {
    # Programming Languages
    'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'ruby', 'go', 'golang', 'rust', 'php', 'swift', 'kotlin',
    # Frontend
    'react', 'vue', 'angular', 'html', 'html5', 'css', 'css3', 'tailwind', 'tailwind css', 'bootstrap', 'next.js', 'redux',
    # Backend & Frameworks
    'node.js', 'nodejs', 'express', 'flask', 'django', 'fastapi', 'spring', 'spring boot', 'laravel', 'asp.net',
    # Databases & Caching
    'sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'mongodb', 'redis', 'cassandra', 'dynamodb', 'oracle',
    # DevOps, Cloud & Tools
    'docker', 'kubernetes', 'k8s', 'aws', 'azure', 'gcp', 'google cloud', 'git', 'github', 'gitlab', 'ci/cd', 'jenkins', 'linux',
    # Concepts & Architecture
    'rest', 'restful', 'rest apis', 'api', 'apis', 'graphql', 'microservices', 'mvc', 'oop', 'agile', 'scrum', 'unit testing',
    # Data & AI
    'pandas', 'numpy', 'scipy', 'machine learning', 'data analysis', 'power bi', 'tableau', 'deep learning', 'tensorflow', 'pytorch'
}

def clean_text(text: str) -> str:
    if not text:
        return ""
    return text.lower()

def extract_keywords(text: str) -> Set[str]:
    cleaned = clean_text(text)
    found = set()
    for kw in COMMON_TECH_KEYWORDS:
        # Match as whole word / phrase
        pattern = r'\b' + re.escape(kw) + r'\b'
        if re.search(pattern, cleaned):
            found.add(kw)
    return found

def analyze_ats_match(resume_text: str, job_text: str) -> Dict[str, Any]:
    job_keywords = extract_keywords(job_text)
    resume_keywords = extract_keywords(resume_text)

    if not job_keywords:
        # Fallback if no specific tech keywords identified
        return {
            'score': 100,
            'rating': 'Good Match',
            'matched': list(resume_keywords)[:6],
            'missing': [],
            'recommendation': 'The job description has flexible requirements. Your profile looks competitive!'
        }

    matched = job_keywords.intersection(resume_keywords)
    missing = job_keywords.difference(resume_keywords)

    score = int((len(matched) / len(job_keywords)) * 100)

    if score >= 75:
        rating = 'Strong Match'
        color = 'emerald'
    elif score >= 50:
        rating = 'Moderate Match'
        color = 'amber'
    else:
        rating = 'Low Match'
        color = 'rose'

    if missing:
        missing_sample = ", ".join(sorted(list(missing))[:3])
        recommendation = f"Consider incorporating key terms like '{missing_sample}' into your skills and project bullets to increase your ATS compatibility."
    else:
        recommendation = "Outstanding! Your profile covers all critical core competencies requested for this role."

    return {
        'score': score,
        'rating': rating,
        'color': color,
        'total_job_keywords': len(job_keywords),
        'matched_count': len(matched),
        'matched': sorted(list(matched)),
        'missing': sorted(list(missing)),
        'recommendation': recommendation
    }
