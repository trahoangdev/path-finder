"""Create regular indexes and Atlas Vector Search indexes.

NOTE: Atlas Vector Search indexes require Atlas (not local Mongo) and use the
`SearchIndexes` API exposed via `coll.create_search_index(...)`. PyMongo 4.7+
supports passing `type="vectorSearch"` directly via `SearchIndexModel`.

If your Mongo cluster doesn't support `create_search_index` programmatically,
copy the JSON spec below into the Atlas UI → "Atlas Vector Search" tab manually
(NOT the "Atlas Search" tab — that one is Lucene-based and uses a different
schema).

Schema reference — every vectorSearch index needs explicit `vector` and
`filter` field declarations so $vectorSearch can use the `filter` operator:

    {
      "fields": [
        {"type": "vector", "path": "<path>", "numDimensions": 768, "similarity": "cosine"},
        {"type": "filter", "path": "<filter_path_1>"},
        {"type": "filter", "path": "<filter_path_2>"}
      ]
    }
"""

from __future__ import annotations

import os
import time
from typing import Any

from pymongo.operations import SearchIndexModel

from _common import get_db, log

EMBED_DIM = 768

# (collection, env_var_name, default_index_name, vector_path, filter_paths)
#
# Order matters: Atlas M0 (Free) and M2/M5 allow at most 3 Atlas Search
# indexes per cluster. Indexes earlier in this list are created first; if you
# hit the quota, the trailing ones are skipped with a warning. The 3 indexes
# that are actively queried by the server today are skills / courses /
# trajectories — `jobs` is reserved for a future feature and is intentionally
# placed last so it gets dropped first on small clusters.
VECTOR_INDEX_SPECS: list[tuple[str, str, str, str, list[str]]] = [
    (
        "skills",
        "VECTOR_INDEX_SKILLS",
        "vec_skills_desc",
        "description_embedding",
        ["category", "is_emerging"],
    ),
    (
        "courses",
        "VECTOR_INDEX_COURSES",
        "vec_courses_desc",
        "description_embedding",
        ["price_usd", "is_mongodb_official"],
    ),
    (
        "career_trajectories",
        "VECTOR_INDEX_TRAJECTORIES",
        "vec_trajectory_snapshot",
        "snapshots.cv_embedding",
        ["country"],
    ),
    (
        "jobs",
        "VECTOR_INDEX_JOBS",
        "vec_jobs_desc",
        "description_embedding",
        ["level", "location"],
    ),
]


def regular_indexes() -> None:
    db = get_db()

    db["skills"].create_index("name", unique=True)
    db["skills"].create_index("category")
    db["skills"].create_index("popularity_rank")

    db["jobs"].create_index("required_skills")
    db["jobs"].create_index([("level", 1), ("location", 1)])
    db["jobs"].create_index("salary_min")

    db["courses"].create_index("skills_taught")
    db["courses"].create_index([("provider", 1), ("level", 1)])

    db["career_trajectories"].create_index([("country", 1), ("total_years_exp", 1)])
    db["career_trajectories"].create_index("current_role")
    db["career_trajectories"].create_index("snapshots.skills_have")
    db["career_trajectories"].create_index(
        [("pivots_detected.from_role", 1), ("pivots_detected.to_role", 1)]
    )

    db["skill_transitions"].create_index(
        [("from_skill", 1), ("to_skill", 1)], unique=True
    )
    db["skill_transitions"].create_index([("from_skill", 1), ("frequency", -1)])
    db["skill_transitions"].create_index(
        [("to_skill", 1), ("edge_kind", 1), ("frequency", -1)]
    )

    db["roadmap_edges"].create_index([("roadmap_slug", 1), ("source_node_id", 1)])
    db["roadmap_edges"].create_index("roadmap_slug")

    db["users"].create_index("ttl_expires_at", expireAfterSeconds=0)

    log.info("✓ Regular indexes created")


def _build_definition(vector_path: str, filter_paths: list[str]) -> dict[str, Any]:
    fields: list[dict[str, Any]] = [
        {
            "type": "vector",
            "path": vector_path,
            "numDimensions": EMBED_DIM,
            "similarity": "cosine",
        }
    ]
    for fp in filter_paths:
        fields.append({"type": "filter", "path": fp})
    return {"fields": fields}


def _existing_index(coll: Any, name: str) -> dict[str, Any] | None:
    try:
        for idx in coll.list_search_indexes():
            if idx.get("name") == name:
                return idx
    except Exception as e:
        log.warning("  list_search_indexes failed on %s: %s", coll.name, e)
    return None


def _drop_and_wait(coll: Any, name: str, timeout_s: int = 120) -> None:
    log.info("  dropping existing index %s on %s …", name, coll.name)
    try:
        coll.drop_search_index(name)
    except Exception as e:
        log.warning("  drop_search_index failed (will try create anyway): %s", e)
        return
    # Wait until Atlas reports the index gone
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if _existing_index(coll, name) is None:
            return
        time.sleep(2)
    log.warning("  timed out waiting for %s drop to propagate", name)


def _wait_ready(coll: Any, name: str, timeout_s: int = 300) -> bool:
    deadline = time.time() + timeout_s
    last_status = None
    while time.time() < deadline:
        idx = _existing_index(coll, name)
        status = (idx or {}).get("status") or (idx or {}).get("queryable")
        if status != last_status:
            log.info("  [%s] status=%s", name, status)
            last_status = status
        # Atlas reports `queryable: true` and/or `status: READY` once usable
        if idx and (idx.get("queryable") is True or idx.get("status") == "READY"):
            return True
        time.sleep(3)
    return False


def vector_indexes() -> None:
    db = get_db()
    for coll_name, env_key, default_name, vector_path, filter_paths in VECTOR_INDEX_SPECS:
        idx_name = os.getenv(env_key, default_name)
        coll = db[coll_name]
        definition = _build_definition(vector_path, filter_paths)

        existing = _existing_index(coll, idx_name)
        if existing is not None:
            # Different type or missing filter fields → must drop+recreate.
            # `vectorSearch` type indexes can't be `update_search_index`'d to
            # change field shape; the cleanest path is drop & recreate.
            existing_fields = existing.get("latestDefinition", {}).get("fields") or \
                              existing.get("definition", {}).get("fields")
            if existing_fields == definition["fields"] and existing.get("type") == "vectorSearch":
                log.info("✓ Vector index %s on %s already up-to-date", idx_name, coll_name)
                continue
            _drop_and_wait(coll, idx_name)

        try:
            model = SearchIndexModel(
                definition=definition,
                name=idx_name,
                type="vectorSearch",
            )
            coll.create_search_index(model=model)
            log.info("✓ Vector index %s created on %s (filters: %s)",
                     idx_name, coll_name, ", ".join(filter_paths) or "<none>")
        except Exception as e:
            log.warning(
                "Could not auto-create %s on %s (%s).\n"
                "  Create manually in Atlas UI → 'Atlas Vector Search' tab with "
                "type='vectorSearch' and JSON:\n%s",
                idx_name, coll_name, e, definition,
            )
            continue

        # Block briefly so the user knows when the index is queryable
        if _wait_ready(coll, idx_name, timeout_s=180):
            log.info("✓ %s is READY on %s", idx_name, coll_name)
        else:
            log.warning("%s on %s is still building — check Atlas UI", idx_name, coll_name)


def main() -> None:
    regular_indexes()
    vector_indexes()


if __name__ == "__main__":
    main()
