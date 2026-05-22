"""Generate synthetic Vietnamese / SEA developer career trajectories.

Why synthetic instead of the Stack Overflow Developer Survey?

  1. The official SO survey ZIP is hosted on a rotating Sanity CDN with hashed
     paths; the old static URLs (insights.stackoverflow.com/datasets/...) are
     410/403 and the new ones are fragile to scrape.
  2. SO publishes one INDEPENDENT cross-section per year (no respondent IDs
     across years), so trajectories have to be INFERRED anyway via cohort
     matching — which is statistically weak and produces noisy pivots.
  3. For the hackathon demo we need DETERMINISTIC, RICH pivot data so the
     `$graphLookup` + Vector Search queries return interesting paths every run.

This script generates ~3000 anonymised developer trajectories with explicit
pivot events, calibrated to plausible Vietnam / SEA market conditions
(role mix, skill stacks, USD-equivalent salaries, pivot prevalence).

Seed = 42 → fully reproducible. Re-run any time without external dependencies.

If, in a future iteration, you want to swap in the real SO data, drop the
extracted CSVs into `data/raw/` and write an adapter that emits documents
matching the CareerTrajectoryDoc schema (see `server/src/schemas/trajectory.ts`).
"""

from __future__ import annotations

import hashlib
import random
from datetime import datetime, timezone

from _common import get_db, log

SEED = 42
N_TRAJECTORIES = 3000
PIVOT_RATE = 0.62  # fraction of devs that have at least one pivot in 2020-2025
CURRENT_YEAR = 2025

# ---------------------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------------------

# Each role → (canonical skills, optional secondary skills)
ROLES: dict[str, tuple[list[str], list[str]]] = {
    "Frontend Developer": (
        ["JavaScript", "TypeScript", "React", "HTML", "CSS"],
        ["Next.js", "Vue.js", "Tailwind CSS", "Redux", "Webpack"],
    ),
    "Backend Developer": (
        ["Node.js", "Python", "PostgreSQL", "REST APIs", "Git"],
        ["Java", "Go", "MongoDB", "Redis", "RabbitMQ", "Express.js"],
    ),
    "Full-stack Developer": (
        ["JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL"],
        ["Next.js", "MongoDB", "Tailwind CSS", "Docker", "AWS"],
    ),
    "Mobile Developer": (
        ["Kotlin", "Swift", "REST APIs", "Git"],
        ["React Native", "Flutter", "Dart", "Firebase"],
    ),
    "Data Engineer": (
        ["Python", "SQL", "Apache Spark", "Apache Airflow", "AWS"],
        ["Snowflake", "dbt", "Kafka", "BigQuery", "Databricks"],
    ),
    "Data Scientist": (
        ["Python", "Pandas", "Scikit-learn", "SQL", "Jupyter"],
        ["NumPy", "Matplotlib", "Statsmodels", "PyTorch"],
    ),
    "ML Engineer": (
        ["Python", "PyTorch", "MLflow", "Docker", "AWS"],
        ["TensorFlow", "Hugging Face", "Kubernetes", "Ray", "Weights & Biases"],
    ),
    "AI Engineer": (
        ["Python", "PyTorch", "LangChain", "LLM API", "Vector Databases"],
        ["Hugging Face", "MongoDB Atlas", "Pinecone", "LlamaIndex", "RAG"],
    ),
    "DevOps Engineer": (
        ["Docker", "Kubernetes", "Terraform", "AWS", "Linux"],
        ["Ansible", "GitHub Actions", "Prometheus", "Grafana", "Jenkins"],
    ),
    "Cloud Engineer": (
        ["AWS", "Terraform", "Kubernetes", "Linux", "Docker"],
        ["Azure", "GCP", "CloudFormation", "Helm", "Istio"],
    ),
}

# Plausible pivot patterns: from_role → to_role, key new skills, typical months, salary lift
PIVOT_PATTERNS: list[tuple[str, str, list[str], int, float]] = [
    ("Frontend Developer", "Full-stack Developer", ["Node.js", "PostgreSQL"], 9, 0.18),
    ("Frontend Developer", "Mobile Developer", ["React Native", "Kotlin"], 10, 0.15),
    ("Backend Developer", "Data Engineer", ["Apache Spark", "Apache Airflow"], 14, 0.25),
    ("Backend Developer", "DevOps Engineer", ["Docker", "Kubernetes", "Terraform"], 12, 0.22),
    ("Backend Developer", "AI Engineer", ["LangChain", "LLM API", "Vector Databases", "RAG"], 15, 0.36),
    ("Backend Developer", "ML Engineer", ["PyTorch", "MLflow", "Hugging Face"], 18, 0.40),
    ("Backend Developer", "Cloud Engineer", ["AWS", "Terraform", "Kubernetes"], 12, 0.25),
    ("Full-stack Developer", "AI Engineer", ["LangChain", "LLM API", "Vector Databases"], 15, 0.38),
    ("Full-stack Developer", "DevOps Engineer", ["Kubernetes", "Terraform", "Prometheus"], 11, 0.20),
    ("Data Scientist", "ML Engineer", ["PyTorch", "MLflow", "Docker"], 12, 0.22),
    ("Data Scientist", "AI Engineer", ["LangChain", "LLM API", "RAG"], 14, 0.30),
    ("Data Engineer", "ML Engineer", ["PyTorch", "MLflow"], 14, 0.30),
    ("Data Engineer", "AI Engineer", ["LangChain", "Vector Databases", "RAG"], 16, 0.35),
    ("DevOps Engineer", "Cloud Engineer", ["Azure", "GCP", "Helm"], 8, 0.12),
    ("Mobile Developer", "Full-stack Developer", ["React", "Node.js"], 10, 0.18),
    ("ML Engineer", "AI Engineer", ["LangChain", "LLM API", "RAG"], 9, 0.22),
]

# Country distribution (sums to ~1.0)
COUNTRIES: list[tuple[str, float]] = [
    ("Vietnam", 0.70),
    ("Singapore", 0.10),
    ("Thailand", 0.07),
    ("Indonesia", 0.06),
    ("Philippines", 0.04),
    ("Malaysia", 0.03),
]

# USD-equivalent yearly salary ranges by seniority (Vietnam baseline)
SALARY_BANDS: dict[str, tuple[int, int]] = {
    "junior": (6_000, 14_000),
    "mid": (14_000, 28_000),
    "senior": (28_000, 55_000),
    "lead": (55_000, 110_000),
}

# Role multipliers on base salary
ROLE_MULTIPLIER: dict[str, float] = {
    "Frontend Developer": 1.00,
    "Backend Developer": 1.05,
    "Full-stack Developer": 1.05,
    "Mobile Developer": 1.05,
    "Data Engineer": 1.15,
    "Data Scientist": 1.18,
    "ML Engineer": 1.30,
    "AI Engineer": 1.35,
    "DevOps Engineer": 1.15,
    "Cloud Engineer": 1.18,
}

# Country cost-of-living multipliers
COUNTRY_MULTIPLIER: dict[str, float] = {
    "Vietnam": 1.00,
    "Singapore": 1.80,
    "Thailand": 1.10,
    "Indonesia": 0.95,
    "Philippines": 0.90,
    "Malaysia": 1.05,
}

ED_LEVELS = [
    ("Bachelor's degree", 0.60),
    ("Master's degree", 0.20),
    ("Some college, no degree", 0.10),
    ("Associate degree", 0.06),
    ("Self-taught (bootcamp)", 0.04),
]

# Starting-role distribution. We bias toward common entry roles because most
# devs don't START as ML/AI/Cloud Engineers — they pivot INTO those roles.
# Without this weighting, AI Engineer ends up at ~30% of final roles which
# is unrealistically high.
START_ROLE_WEIGHTS: list[tuple[str, float]] = [
    ("Backend Developer", 0.22),
    ("Frontend Developer", 0.20),
    ("Full-stack Developer", 0.18),
    ("Mobile Developer", 0.10),
    ("Data Scientist", 0.08),
    ("DevOps Engineer", 0.07),
    ("Data Engineer", 0.06),
    ("ML Engineer", 0.04),
    ("Cloud Engineer", 0.03),
    ("AI Engineer", 0.02),
]


# ---------------------------------------------------------------------------
# Generators
# ---------------------------------------------------------------------------


def weighted_choice(rng: random.Random, items: list[tuple[str, float]]) -> str:
    r = rng.random()
    acc = 0.0
    for name, weight in items:
        acc += weight
        if r <= acc:
            return name
    return items[-1][0]


def seniority_for(years: int) -> str:
    if years <= 2:
        return "junior"
    if years <= 5:
        return "mid"
    if years <= 9:
        return "senior"
    return "lead"


def compute_salary(rng: random.Random, role: str, years: int, country: str) -> float:
    band = seniority_for(years)
    lo, hi = SALARY_BANDS[band]
    base = rng.uniform(lo, hi)
    salary = base * ROLE_MULTIPLIER.get(role, 1.0) * COUNTRY_MULTIPLIER.get(country, 1.0)
    # ±10% noise for realism
    salary *= rng.uniform(0.90, 1.10)
    return round(salary, -2)  # round to nearest 100 USD


def pick_skills(rng: random.Random, role: str, n_extra: int = 2) -> list[str]:
    core, secondary = ROLES[role]
    skills = list(core)
    extras = rng.sample(secondary, k=min(n_extra, len(secondary)))
    skills.extend(extras)
    return skills


def make_anon_id(seed_str: str) -> str:
    return hashlib.sha1(seed_str.encode()).hexdigest()[:16]


def build_trajectory(rng: random.Random, idx: int) -> dict:
    country = weighted_choice(rng, COUNTRIES)
    ed_level = weighted_choice(rng, ED_LEVELS)
    total_years = rng.randint(1, 14)
    start_year = max(2020, CURRENT_YEAR - total_years - rng.randint(0, 2))

    # Starting role: weighted toward "entry" roles. AI/ML/Cloud are rarely
    # starting points — they're usually pivoted into (which is exactly the
    # demand pattern we want our recommender to capture).
    start_role = weighted_choice(rng, START_ROLE_WEIGHTS)

    snapshots: list[dict] = []
    pivots: list[dict] = []

    # Snapshot 0: entry-level state
    yrs0 = max(1, total_years - rng.randint(2, 4))
    skills_have_0 = pick_skills(rng, start_role, n_extra=1)
    snapshots.append(
        {
            "estimated_year": start_year,
            "role": start_role,
            "skills_have": skills_have_0,
            "skills_want": rng.sample(skills_have_0, k=min(2, len(skills_have_0))),
        }
    )

    current_role = start_role
    has_pivot = rng.random() < PIVOT_RATE
    if has_pivot:
        # 1 pivot for most, 2 pivots for ~25% of those with pivots
        n_pivots = 1 if rng.random() > 0.25 else 2
        cumulative_skills = set(skills_have_0)
        salary_prev = compute_salary(rng, current_role, yrs0, country)

        for _ in range(n_pivots):
            candidates = [p for p in PIVOT_PATTERNS if p[0] == current_role]
            if not candidates:
                break
            from_role, to_role, key_skills, base_months, base_lift = rng.choice(candidates)
            months = max(3, int(base_months * rng.uniform(0.7, 1.4)))
            lift = round(base_lift * rng.uniform(0.7, 1.3), 3)

            cumulative_skills.update(key_skills)
            # Also pick 1-2 extra new skills from the to_role
            cumulative_skills.update(rng.sample(ROLES[to_role][0], k=2))

            pivot_year = snapshots[-1]["estimated_year"] + max(1, months // 12)
            if pivot_year > CURRENT_YEAR:
                break

            skills_after = sorted(cumulative_skills)
            snapshots.append(
                {
                    "estimated_year": pivot_year,
                    "role": to_role,
                    "skills_have": skills_after,
                    "skills_want": rng.sample(ROLES[to_role][1], k=2),
                }
            )

            pivots.append(
                {
                    "from_role": from_role,
                    "to_role": to_role,
                    "skill_added": key_skills,
                    "months_taken": float(months),
                    "salary_lift_pct": lift,
                }
            )

            current_role = to_role
            salary_prev = salary_prev * (1 + lift)

    # Final snapshot at CURRENT_YEAR (if last snapshot year < current)
    if snapshots[-1]["estimated_year"] < CURRENT_YEAR:
        current_skills = sorted(set(snapshots[-1]["skills_have"]) | set(pick_skills(rng, current_role, 1)))
        snapshots.append(
            {
                "estimated_year": CURRENT_YEAR,
                "role": current_role,
                "skills_have": current_skills,
                "skills_want": rng.sample(ROLES[current_role][1], k=2),
            }
        )

    final_salary = compute_salary(rng, current_role, total_years, country)

    return {
        "anon_id": make_anon_id(f"synthvn-{SEED}-{idx}"),
        "source": "synthetic_vn",
        "country": country,
        "current_role": current_role,
        "total_years_exp": total_years,
        "comp_total_usd": final_salary,
        "ed_level": ed_level,
        "snapshots": snapshots,
        "pivots_detected": pivots,
        # `generated_at` and `generator_seed` are added in main() so this
        # function stays pure and the determinism test passes.
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    rng = random.Random(SEED)
    log.info("Generating %d synthetic trajectories (seed=%d)…", N_TRAJECTORIES, SEED)

    docs = [build_trajectory(rng, i) for i in range(N_TRAJECTORIES)]
    now = datetime.now(timezone.utc)
    for d in docs:
        d["generated_at"] = now
        d["generator_seed"] = SEED
    pivot_count = sum(1 for d in docs if d["pivots_detected"])
    role_dist: dict[str, int] = {}
    for d in docs:
        role_dist[d["current_role"]] = role_dist.get(d["current_role"], 0) + 1

    log.info("Generated %d trajectories (%d with pivots, %.0f%%)", len(docs), pivot_count, 100 * pivot_count / len(docs))
    log.info("Role distribution (final role):")
    for role, cnt in sorted(role_dist.items(), key=lambda kv: -kv[1]):
        log.info("  %-25s %4d  (%.1f%%)", role, cnt, 100 * cnt / len(docs))

    db = get_db()
    db["career_trajectories"].drop()
    res = db["career_trajectories"].insert_many(docs)
    log.info("✓ Inserted %d career_trajectories", len(res.inserted_ids))


if __name__ == "__main__":
    main()
