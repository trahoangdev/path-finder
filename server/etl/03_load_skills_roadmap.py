"""Load skill taxonomy from roadmap.sh public JSON.

roadmap.sh exposes machine-readable role roadmaps at:
  https://roadmap.sh/<role>/json
"""

from __future__ import annotations

from datetime import datetime, timezone

import requests

from _common import get_db, log


ROADMAPS = [
    "frontend",
    "backend",
    "fullstack",
    "devops",
    "ai-engineer",
    "ai-data-scientist",
    "data-analyst",
    "mlops",
    "android",
    "ios",
    "qa",
]

SEED_FALLBACK: list[dict] = [
    {"name": "JavaScript", "category": "language"},
    {"name": "TypeScript", "category": "language"},
    {"name": "Python", "category": "language"},
    {"name": "Java", "category": "language"},
    {"name": "React", "category": "framework"},
    {"name": "Next.js", "category": "framework"},
    {"name": "Node.js", "category": "framework"},
    {"name": "MongoDB", "category": "database"},
    {"name": "PostgreSQL", "category": "database"},
    {"name": "Vector Databases", "category": "concept"},
    {"name": "Docker", "category": "tool"},
    {"name": "Kubernetes", "category": "tool"},
    {"name": "AWS", "category": "cloud"},
    {"name": "MLflow", "category": "tool"},
    {"name": "PyTorch", "category": "framework"},
    {"name": "LangChain", "category": "framework"},
]


def slugify(name: str) -> str:
    return name.lower().replace(" ", "-").replace(".", "").replace("/", "-")


def main() -> None:
    db = get_db()
    skills: dict[str, dict] = {}

    for roadmap in ROADMAPS:
        url = f"https://roadmap.sh/{roadmap}.json"
        try:
            r = requests.get(url, timeout=20)
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            log.warning("Failed to fetch %s: %s", url, e)
            continue
        log.info("Fetched roadmap %s (%d nodes)", roadmap, len(data.get("nodes", [])))
        for node in data.get("nodes", []):
            name = (node.get("data") or {}).get("label") or node.get("data", {}).get("oldId")
            if not name or len(name) > 50:
                continue
            skills[name] = {
                "name": name,
                "slug": slugify(name),
                "category": "concept",
                "description": (node.get("data") or {}).get("description") or name,
                "prerequisites": [],
                "related_skills": [],
                "popularity_rank": 999,
                "is_emerging": False,
                "vn_demand_score": 0.0,
            }

    if not skills:
        log.warning("No skills fetched from roadmap.sh — using fallback seed.")
        for s in SEED_FALLBACK:
            skills[s["name"]] = {
                **s,
                "slug": slugify(s["name"]),
                "description": s["name"],
                "prerequisites": [],
                "related_skills": [],
                "popularity_rank": 999,
                "is_emerging": False,
                "vn_demand_score": 0.0,
            }

    now = datetime.now(timezone.utc)
    for s in skills.values():
        s["computed_at"] = now

    db["skills"].drop()
    res = db["skills"].insert_many(list(skills.values()))
    log.info("Inserted %d skills", len(res.inserted_ids))


if __name__ == "__main__":
    main()
