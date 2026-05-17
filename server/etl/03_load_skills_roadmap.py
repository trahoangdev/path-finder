"""Load skill taxonomy + graph edges from roadmap.sh.

Uses the official JSON endpoint:
  https://roadmap.sh/api/v1-official-roadmap/<slug>

Falls back to legacy static JSON when the API returns 404:
  https://roadmap.sh/<slug>.json

Writes:
  - skills — deduped node labels (same shape as before, for Vector Search)
  - roadmap_edges — directed edges (optional graph data for Mongo)
  - vn_demand_score on skills — backfilled from `jobs.required_skills` when jobs exist (ETL 02)
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

import requests

from pymongo import UpdateOne

from _common import get_db, log

# Slugs must match roadmap.sh (hyphenated). `full-stack` replaces broken `fullstack`.
ROADMAP_SLUGS: list[str] = [
    "frontend",
    "backend",
    "full-stack",
    "devops",
    "ai-engineer",
    "ai-data-scientist",
    "data-analyst",
    "mlops",
    "android",
    "ios",
    "qa",
]

SKIP_NODE_TYPES: frozenset[str] = frozenset({"vertical", "horizontal", "section", "legend"})

SKIP_LABEL_RE = re.compile(
    r"checkpoint|continue learning|feel free to skip|starts here|devops starts",
    re.IGNORECASE,
)

API_BASE = "https://roadmap.sh/api/v1-official-roadmap"
LEGACY_SUFFIX = ".json"

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


def roadmap_title_from_payload(data: dict, slug: str) -> str:
    t = data.get("title")
    if isinstance(t, dict):
        return str(t.get("page") or t.get("card") or slug)
    if isinstance(t, str) and t:
        return t
    return slug


def fetch_roadmap(slug: str) -> dict | None:
    url_api = f"{API_BASE}/{slug}"
    try:
        r = requests.get(url_api, timeout=25)
        if r.status_code == 404:
            log.warning("API 404 for %s — trying legacy .json", url_api)
        else:
            r.raise_for_status()
            return r.json()
    except Exception as e:
        log.warning("API fetch failed %s: %s", url_api, e)

    for legacy in (slug, slug.replace("-", "")):
        url_legacy = f"https://roadmap.sh/{legacy}{LEGACY_SUFFIX}"
        try:
            r2 = requests.get(url_legacy, timeout=25)
            r2.raise_for_status()
            log.info("Loaded legacy JSON %s", url_legacy)
            return r2.json()
        except Exception as e2:
            log.warning("Legacy fetch failed %s: %s", url_legacy, e2)
    return None


def clean_label(raw: object) -> str:
    if raw is None:
        return ""
    s = str(raw).strip()
    if len(s) < 2 or len(s) > 120:
        return ""
    if SKIP_LABEL_RE.search(s):
        return ""
    return s


def extract_node_map(nodes: list[dict]) -> dict[str, str]:
    """react-flow id -> display label."""
    out: dict[str, str] = {}
    for node in nodes:
        ntype = node.get("type") or ""
        if ntype in SKIP_NODE_TYPES:
            continue
        nid = node.get("id")
        if not nid:
            continue
        data = node.get("data") or {}
        label = clean_label(data.get("label") or data.get("oldId"))
        if label:
            out[str(nid)] = label
    return out


def backfill_vn_demand_from_jobs(db) -> None:
    """Derive `vn_demand_score` (0..1) from `jobs.required_skills` mention counts.

    Run after ETL 02 so the curated / scraped JDs exist. Skills with no mentions
    stay at 0. Scores are relative: count / max_count across all skill tags.
    """
    coll = db["jobs"]
    if coll.count_documents({}) == 0:
        log.info("vn_demand: jobs empty — vn_demand_score left at 0 for all skills")
        return

    pipeline = [
        {"$unwind": "$required_skills"},
        {"$group": {"_id": "$required_skills", "n": {"$sum": 1}}},
    ]
    rows = list(coll.aggregate(pipeline))
    if not rows:
        return
    max_n = max(r["n"] for r in rows)
    if max_n <= 0:
        return

    by_name: dict[str, float] = {
        str(r["_id"]): float(r["n"]) / float(max_n) for r in rows if r.get("_id")
    }
    ops = [
        UpdateOne({"name": name}, {"$set": {"vn_demand_score": score}})
        for name, score in by_name.items()
    ]
    res = db["skills"].bulk_write(ops, ordered=False)
    log.info(
        "vn_demand: updated %d skills from %d JD skill tags (jobs → 0..1 relative demand)",
        res.modified_count,
        len(by_name),
    )


def main() -> None:
    db = get_db()
    skills: dict[str, dict] = {}
    edge_docs: list[dict] = []
    now = datetime.now(timezone.utc)

    for slug in ROADMAP_SLUGS:
        data = fetch_roadmap(slug)
        if not data:
            log.warning("Skipping roadmap slug %s (no data)", slug)
            continue

        title = roadmap_title_from_payload(data, slug)
        nodes = data.get("nodes") or []
        edges = data.get("edges") or []
        id_to_label = extract_node_map(nodes if isinstance(nodes, list) else [])

        log.info("Fetched roadmap %s — %d nodes, %d edges, %d labeled", slug, len(nodes), len(edges), len(id_to_label))

        for label in id_to_label.values():
            skills[label] = {
                "name": label,
                "slug": slugify(label),
                "category": "concept",
                "description": label,
                "prerequisites": [],
                "related_skills": [],
                "popularity_rank": 999,
                "is_emerging": False,
                "vn_demand_score": 0.0,
            }

        if not isinstance(edges, list):
            continue
        for e in edges:
            src = e.get("source")
            tgt = e.get("target")
            if not src or not tgt:
                continue
            fl = id_to_label.get(str(src), "")
            tl = id_to_label.get(str(tgt), "")
            if not fl or not tl:
                continue
            edge_docs.append(
                {
                    "roadmap_slug": slug,
                    "roadmap_title": title,
                    "source_node_id": str(src),
                    "target_node_id": str(tgt),
                    "from_label": fl,
                    "to_label": tl,
                    "computed_at": now,
                }
            )

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

    for s in skills.values():
        s["computed_at"] = now

    db["skills"].drop()
    ins = db["skills"].insert_many(list(skills.values()))
    log.info("Inserted %d skills", len(ins.inserted_ids))

    backfill_vn_demand_from_jobs(db)

    db["roadmap_edges"].drop()
    if edge_docs:
        ins_e = db["roadmap_edges"].insert_many(edge_docs)
        log.info("Inserted %d roadmap_edges across %d slugs", len(ins_e.inserted_ids), len(ROADMAP_SLUGS))
    else:
        log.warning("No roadmap edges inserted — `skills` still loaded; `roadmap_edges` empty.")


if __name__ == "__main__":
    main()
