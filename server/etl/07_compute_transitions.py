"""Pre-compute skill_transitions collection from career_trajectories.

Edges are directed skill -> next_hop where next_hop is the target **role** of
the pivot (as stored in synthetic pivots). Duplicates on the same pair are
merged by summing frequency (required for a unique index on from_skill+to_skill).
"""

from __future__ import annotations

from datetime import datetime, timezone

from _common import get_db, log


def main() -> None:
    db = get_db()

    pipeline = [
        {"$unwind": "$pivots_detected"},
        {"$unwind": "$pivots_detected.skill_added"},
        {
            "$group": {
                "_id": {
                    "from": "$current_role",
                    "to": "$pivots_detected.to_role",
                    "skill": "$pivots_detected.skill_added",
                },
                "frequency": {"$sum": 1},
                "avg_months": {"$avg": "$pivots_detected.months_taken"},
                "median_months": {"$avg": "$pivots_detected.months_taken"},
                "avg_salary_lift_pct": {"$avg": "$pivots_detected.salary_lift_pct"},
            }
        },
        {"$match": {"frequency": {"$gte": 1}}},
        {
            "$project": {
                "_id": 0,
                "from_skill": "$_id.skill",
                "to_skill": "$_id.to",
                "frequency": 1,
                "avg_months": 1,
                "median_months": 1,
                "avg_salary_lift_pct": 1,
            }
        },
        # Merge duplicate (from_skill, to_skill) pairs from different pivot cohorts
        {
            "$group": {
                "_id": {"fs": "$from_skill", "ts": "$to_skill"},
                "frequency": {"$sum": "$frequency"},
                "avg_months": {"$avg": "$avg_months"},
                "median_months": {"$avg": "$median_months"},
                "avg_salary_lift_pct": {"$avg": "$avg_salary_lift_pct"},
            }
        },
        {
            "$project": {
                "_id": 0,
                "from_skill": "$_id.fs",
                "to_skill": "$_id.ts",
                "frequency": 1,
                "avg_months": 1,
                "median_months": 1,
                "avg_salary_lift_pct": 1,
                "role_change_rate": {"$literal": 0.5},
                "sample_size": "$frequency",
                "confidence": {
                    "$switch": {
                        "branches": [
                            {"case": {"$gte": ["$frequency", 100]}, "then": "high"},
                            {"case": {"$gte": ["$frequency", 30]}, "then": "medium"},
                        ],
                        "default": "low",
                    }
                },
                "computed_at": {"$literal": datetime.now(timezone.utc)},
                "source_years": {"$literal": [2023, 2024]},
            }
        },
        {"$out": "skill_transitions"},
    ]

    log.info("Computing skill_transitions via aggregation $out…")
    list(db["career_trajectories"].aggregate(pipeline))
    count = db["skill_transitions"].count_documents({})
    log.info("[OK] skill_transitions populated: %d docs", count)


if __name__ == "__main__":
    main()
