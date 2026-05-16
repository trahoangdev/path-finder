"""Load Vietnamese tech job listings into the `jobs` collection.

Two modes:

  1. **Static curated sample** (default, hackathon-ready) — ~20 realistic listings
     calibrated to typical 2025-2026 VN market salaries. Used directly if no
     external sample file is present.

  2. **Live scrape** (stub for future expansion) — drop a JSON file at
     `data/itviec_sample.json` with the same shape as `CURATED_SAMPLE` below
     and this script will load that instead. A real implementation should:

       - Use Playwright headless with realistic user-agent + 2-3s delays
       - Respect robots.txt and rate-limit
       - Parse listing detail pages (title, company, level, salary, skills, JD)
       - Hash by source_url to dedup across runs

Salary scale notes (VND, millions/month — typical ITViec format):
   - junior:  10-20  | mid:    20-40  | senior: 40-80  | lead: 80-150
   - converted to VND raw at insert time? we store millions VND (compact).

The static sample is sufficient to demonstrate the hybrid Vector Search
(filter by level + location + salary_min, then re-rank by embedding) story
for the hackathon judge video.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

from _common import DATA_DIR, get_db, log


def _posted(days_ago: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()


CURATED_SAMPLE: list[dict] = [
    # ---------- AI / ML (premium tier) ----------
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/ai-engineer-vng-1",
        "title": "Senior AI Engineer (LLM + RAG)",
        "company": "VNG Cloud",
        "location": "HCM",
        "level": "senior",
        "salary_min": 40,
        "salary_max": 70,
        "salary_currency": "VND",
        "required_skills": ["Python", "PyTorch", "LangChain", "OpenAI API", "Vector Databases", "MongoDB Atlas"],
        "nice_to_have": ["RAG", "LlamaIndex", "Hugging Face", "Kubernetes"],
        "description": "Lead the GenAI platform team. Design and ship production RAG systems on MongoDB Atlas Vector Search, fine-tune open-source LLMs for Vietnamese customers, and build the evaluation harness that keeps quality high as we scale. You will own a service that answers >100K queries / day.",
        "posted_at": _posted(7),
    },
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/ml-engineer-fpt-software",
        "title": "Machine Learning Engineer (Recommender Systems)",
        "company": "FPT Software",
        "location": "Hanoi",
        "level": "senior",
        "salary_min": 35,
        "salary_max": 60,
        "salary_currency": "VND",
        "required_skills": ["Python", "PyTorch", "MLflow", "Apache Spark", "Kubernetes", "AWS"],
        "nice_to_have": ["MongoDB", "Vector Databases", "Hugging Face", "Ray"],
        "description": "Join the personalisation squad serving a 30M-user fintech super-app. Own the candidate-generation and ranking stack, ship A/B tests weekly, and design the next-gen embedding-based retrieval on top of Vector Search.",
        "posted_at": _posted(3),
    },
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/data-scientist-shopee",
        "title": "Data Scientist (Search & Discovery)",
        "company": "Shopee",
        "location": "HCM",
        "level": "mid",
        "salary_min": 30,
        "salary_max": 50,
        "salary_currency": "VND",
        "required_skills": ["Python", "Pandas", "Scikit-learn", "SQL", "PyTorch"],
        "nice_to_have": ["Apache Spark", "MLflow", "Vector Databases"],
        "description": "Improve product search and recommendation quality for SEA shoppers. Run experiments on click-through and conversion, ship learning-to-rank models, and partner with engineering to productionise via MLflow and SageMaker.",
        "posted_at": _posted(12),
    },
    # ---------- Backend / Full-stack (broad demand) ----------
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/senior-backend-momo",
        "title": "Senior Backend Engineer (Payments)",
        "company": "MoMo",
        "location": "HCM",
        "level": "senior",
        "salary_min": 35,
        "salary_max": 60,
        "salary_currency": "VND",
        "required_skills": ["Go", "PostgreSQL", "Redis", "Kafka", "Kubernetes"],
        "nice_to_have": ["MongoDB", "gRPC", "Prometheus", "Terraform"],
        "description": "Build the next-generation payment-orchestration platform handling 50M+ TPS. Strong Go and distributed-systems background required; we ship to production daily and care deeply about correctness and observability.",
        "posted_at": _posted(5),
    },
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/fullstack-tiki",
        "title": "Full-stack Engineer (TypeScript)",
        "company": "Tiki",
        "location": "HCM",
        "level": "mid",
        "salary_min": 25,
        "salary_max": 42,
        "salary_currency": "VND",
        "required_skills": ["TypeScript", "Next.js", "React", "Node.js", "PostgreSQL"],
        "nice_to_have": ["MongoDB", "Tailwind CSS", "Docker", "GraphQL"],
        "description": "Own end-to-end features for the Tiki seller dashboard, from Postgres schema to React component. Modern Next.js 14 + RSC stack, strong type safety, and a culture of small, frequent shipping.",
        "posted_at": _posted(2),
    },
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/nodejs-backend-techcombank",
        "title": "Backend Engineer (Node.js + MongoDB)",
        "company": "Techcombank",
        "location": "Hanoi",
        "level": "mid",
        "salary_min": 22,
        "salary_max": 38,
        "salary_currency": "VND",
        "required_skills": ["Node.js", "TypeScript", "MongoDB", "Express.js", "REST APIs"],
        "nice_to_have": ["MongoDB Atlas", "Docker", "AWS", "Kafka"],
        "description": "Build microservices that power the bank's open banking and partner APIs. Modern Node.js + TypeScript stack on MongoDB Atlas with strict observability and security requirements.",
        "posted_at": _posted(9),
    },
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/python-backend-vinai",
        "title": "Senior Python Backend Engineer (AI Platform)",
        "company": "VinAI",
        "location": "Hanoi",
        "level": "senior",
        "salary_min": 40,
        "salary_max": 70,
        "salary_currency": "VND",
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker", "Kubernetes"],
        "nice_to_have": ["MongoDB", "PyTorch", "Hugging Face", "Vector Databases"],
        "description": "Build the serving layer for VinAI's foundation models. FastAPI + async Python, GPU autoscaling on Kubernetes, and production gateways for both internal teams and enterprise customers.",
        "posted_at": _posted(4),
    },
    # ---------- DevOps / Cloud ----------
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/devops-vng",
        "title": "Senior DevOps Engineer (Kubernetes + AWS)",
        "company": "VNG",
        "location": "HCM",
        "level": "senior",
        "salary_min": 35,
        "salary_max": 60,
        "salary_currency": "VND",
        "required_skills": ["Kubernetes", "Docker", "Terraform", "AWS", "Linux"],
        "nice_to_have": ["Helm", "Prometheus", "Grafana", "Istio", "GitHub Actions"],
        "description": "Operate the platform that hosts every VNG game and consumer app — multi-region EKS, GitOps via Argo, full observability stack. We are looking for a senior SRE who has carried pagers for 1M+ DAU services.",
        "posted_at": _posted(6),
    },
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/cloud-engineer-grab",
        "title": "Cloud Engineer (AWS)",
        "company": "Grab",
        "location": "HCM",
        "level": "mid",
        "salary_min": 28,
        "salary_max": 48,
        "salary_currency": "VND",
        "required_skills": ["AWS", "Terraform", "Kubernetes", "Linux", "Docker"],
        "nice_to_have": ["Azure", "GCP", "Helm", "Prometheus"],
        "description": "Help platform engineering teams ship safely to Grab's multi-region AWS estate. You will design landing zones, write reusable Terraform modules, and run incident reviews after big outages.",
        "posted_at": _posted(11),
    },
    # ---------- Frontend ----------
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/react-frontend-base-vn",
        "title": "Senior Frontend Engineer (React + Next.js)",
        "company": "Base.vn",
        "location": "Hanoi",
        "level": "senior",
        "salary_min": 28,
        "salary_max": 48,
        "salary_currency": "VND",
        "required_skills": ["TypeScript", "React", "Next.js", "Tailwind CSS", "Redux"],
        "nice_to_have": ["GraphQL", "Vite", "Cypress", "Storybook"],
        "description": "Lead front-end for the Base HR product suite used by 9000+ Vietnamese companies. You will own a design-system migration, drive performance budgets, and mentor two mid-level engineers.",
        "posted_at": _posted(8),
    },
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/junior-frontend-axon",
        "title": "Junior Frontend Engineer",
        "company": "Axon Active",
        "location": "Da Nang",
        "level": "junior",
        "salary_min": 12,
        "salary_max": 22,
        "salary_currency": "VND",
        "required_skills": ["JavaScript", "TypeScript", "React", "HTML", "CSS"],
        "nice_to_have": ["Tailwind CSS", "Redux", "Webpack"],
        "description": "Join our Da Nang office as a graduate hire on the European enterprise products team. You will pair daily with senior engineers, ship to production in week 2, and rotate across 2-3 product squads in your first year.",
        "posted_at": _posted(1),
    },
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/mid-fullstack-kms",
        "title": "Full-stack Engineer (React + .NET)",
        "company": "KMS Technology",
        "location": "HCM",
        "level": "mid",
        "salary_min": 24,
        "salary_max": 40,
        "salary_currency": "VND",
        "required_skills": ["JavaScript", "TypeScript", "React", "C#", ".NET", "PostgreSQL"],
        "nice_to_have": ["AWS", "Docker", "Kubernetes"],
        "description": "Deliver SaaS features for a US-based healthtech client across React + .NET 8. Hybrid HCM office with strong English communication required.",
        "posted_at": _posted(14),
    },
    # ---------- Mobile ----------
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/ios-zalopay",
        "title": "Senior iOS Engineer",
        "company": "ZaloPay",
        "location": "HCM",
        "level": "senior",
        "salary_min": 35,
        "salary_max": 55,
        "salary_currency": "VND",
        "required_skills": ["Swift", "iOS", "Xcode", "REST APIs", "Git"],
        "nice_to_have": ["SwiftUI", "Combine", "Firebase", "Fastlane"],
        "description": "Build a high-trust fintech iOS app used daily by 8M+ Vietnamese users. Strong Swift, attention to performance and security, and a track record shipping App Store features end-to-end.",
        "posted_at": _posted(5),
    },
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/android-momo",
        "title": "Android Engineer (Kotlin + Jetpack Compose)",
        "company": "MoMo",
        "location": "HCM",
        "level": "mid",
        "salary_min": 25,
        "salary_max": 42,
        "salary_currency": "VND",
        "required_skills": ["Kotlin", "Android", "Jetpack Compose", "REST APIs", "Firebase"],
        "nice_to_have": ["Coroutines", "MVVM", "Room"],
        "description": "Ship Jetpack-Compose-first features for MoMo's payment Android app. You will work on the home feed, the QR pay flow, and contribute to our open-source design system.",
        "posted_at": _posted(10),
    },
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/react-native-haravan",
        "title": "React Native Engineer",
        "company": "Haravan",
        "location": "HCM",
        "level": "mid",
        "salary_min": 22,
        "salary_max": 36,
        "salary_currency": "VND",
        "required_skills": ["JavaScript", "TypeScript", "React Native", "REST APIs"],
        "nice_to_have": ["Redux", "Firebase", "Fastlane"],
        "description": "Cross-platform mobile app for SMB merchants. Single codebase shipping iOS + Android weekly, deep native bridges for printers and barcode scanners.",
        "posted_at": _posted(13),
    },
    # ---------- Data Engineering ----------
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/data-engineer-tiki",
        "title": "Senior Data Engineer (Spark + Airflow)",
        "company": "Tiki",
        "location": "HCM",
        "level": "senior",
        "salary_min": 35,
        "salary_max": 58,
        "salary_currency": "VND",
        "required_skills": ["Python", "SQL", "Apache Spark", "Apache Airflow", "AWS"],
        "nice_to_have": ["dbt", "Snowflake", "Kafka", "Databricks"],
        "description": "Own the analytical data platform that powers Tiki's pricing, fraud, and personalisation models. PB-scale Spark on EMR, dbt + Snowflake for warehousing, and Airflow 2.x for orchestration.",
        "posted_at": _posted(6),
    },
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/data-engineer-vingroup",
        "title": "Data Engineer (Mid-level)",
        "company": "Vingroup",
        "location": "Hanoi",
        "level": "mid",
        "salary_min": 25,
        "salary_max": 42,
        "salary_currency": "VND",
        "required_skills": ["Python", "SQL", "Apache Spark", "Apache Airflow", "BigQuery"],
        "nice_to_have": ["dbt", "Kafka", "Databricks", "GCP"],
        "description": "Build the customer-360 data product across Vingroup's retail, hospitality, and EV lines. PySpark on Databricks, BigQuery for serving, and dbt models the analytics teams can self-service.",
        "posted_at": _posted(15),
    },
    # ---------- Junior / Entry-level (for skill-gap demo) ----------
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/junior-backend-haravan",
        "title": "Junior Backend Engineer (Node.js)",
        "company": "Haravan",
        "location": "HCM",
        "level": "junior",
        "salary_min": 14,
        "salary_max": 22,
        "salary_currency": "VND",
        "required_skills": ["JavaScript", "Node.js", "MongoDB", "REST APIs", "Git"],
        "nice_to_have": ["TypeScript", "Express.js", "Docker", "Redis"],
        "description": "Entry-level backend role on the e-commerce platform team. Strong learning culture, monthly mentor pairings, and a clear promotion path to mid-level within 18 months.",
        "posted_at": _posted(3),
    },
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/intern-data-vng",
        "title": "Data / ML Internship",
        "company": "VNG",
        "location": "HCM",
        "level": "intern",
        "salary_min": 6,
        "salary_max": 10,
        "salary_currency": "VND",
        "required_skills": ["Python", "Pandas", "SQL", "Jupyter"],
        "nice_to_have": ["Scikit-learn", "PyTorch", "Apache Spark"],
        "description": "6-month full-time internship working alongside the personalisation and fraud teams. Mentored project ending in a hiring decision.",
        "posted_at": _posted(2),
    },
    {
        "source": "itviec",
        "source_url": "https://itviec.com/jobs/lead-architect-fpt",
        "title": "Tech Lead / Solution Architect (Cloud-native)",
        "company": "FPT Software",
        "location": "Hanoi",
        "level": "lead",
        "salary_min": 60,
        "salary_max": 100,
        "salary_currency": "VND",
        "required_skills": ["AWS", "Kubernetes", "Terraform", "Docker", "MongoDB", "Microservices"],
        "nice_to_have": ["GCP", "Azure", "Kafka", "gRPC"],
        "description": "Lead solutioning for FPT's largest financial-services and healthcare clients. You will define multi-region cloud-native architectures, mentor 5-10 senior engineers, and own the technical proposal for $5M+ engagements.",
        "posted_at": _posted(20),
    },
]


def load() -> list[dict]:
    """Load curated sample. If `data/itviec_sample.json` exists, prefer that.

    The user-overrideable file enables dropping in real scrape output later
    without modifying this script.
    """
    path = DATA_DIR / "itviec_sample.json"
    if path.exists():
        log.info("Loading user-provided sample %s", path)
        return json.loads(path.read_text(encoding="utf-8"))

    log.info("Using built-in curated sample (%d jobs). To override, place JSON at %s",
             len(CURATED_SAMPLE), path)
    return CURATED_SAMPLE


def insert(docs: list[dict]) -> None:
    db = get_db()
    now = datetime.now(timezone.utc)
    for d in docs:
        if isinstance(d.get("posted_at"), str):
            d["posted_at"] = datetime.fromisoformat(d["posted_at"].replace("Z", "+00:00"))
        d.setdefault("scraped_at", now)

    db["jobs"].drop()
    res = db["jobs"].insert_many(docs)
    log.info("✓ Inserted %d jobs", len(res.inserted_ids))

    by_level: dict[str, int] = {}
    for d in docs:
        by_level[d["level"]] = by_level.get(d["level"], 0) + 1
    for lvl, n in sorted(by_level.items()):
        log.info("  level=%-7s %d", lvl, n)


def main() -> None:
    docs = load()
    insert(docs)


if __name__ == "__main__":
    main()
