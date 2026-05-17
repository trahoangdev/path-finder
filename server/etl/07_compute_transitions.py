"""Pre-compute a traversable skill graph from career trajectories.

Each pivot becomes a real chain:

    from_role -> first learned skill -> ... -> last learned skill -> to_role

That gives `$graphLookup` an actual multi-hop graph to traverse at runtime,
while the final `skill_to_role` edge preserves the evidence shape used by gap
analysis (`skill -> target role`).
"""

from __future__ import annotations

from datetime import datetime, timezone

from _common import get_db, log


def main() -> None:
    db = get_db()

    pipeline = [
        {"$unwind": "$pivots_detected"},
        {
            "$match": {
                "pivots_detected.skill_added.0": {"$exists": True},
            }
        },
        {
            "$project": {
                "pivot": "$pivots_detected",
                "skill_count": {"$size": "$pivots_detected.skill_added"},
            }
        },
        {
            "$project": {
                "edges": {
                    "$concatArrays": [
                        [
                            {
                                "from_skill": "$pivot.from_role",
                                "to_skill": {"$arrayElemAt": ["$pivot.skill_added", 0]},
                                "edge_kind": "role_to_skill",
                                "from_node_type": "role",
                                "to_node_type": "skill",
                                "source_role": "$pivot.from_role",
                                "target_role": "$pivot.to_role",
                                "months": {
                                    "$divide": [
                                        "$pivot.months_taken",
                                        {"$add": ["$skill_count", 1]},
                                    ]
                                },
                                "salary_lift_pct": 0,
                            }
                        ],
                        {
                            "$map": {
                                "input": {
                                    "$range": [
                                        0,
                                        {"$max": [{"$subtract": ["$skill_count", 1]}, 0]},
                                    ]
                                },
                                "as": "idx",
                                "in": {
                                    "from_skill": {
                                        "$arrayElemAt": [
                                            "$pivot.skill_added",
                                            "$$idx",
                                        ]
                                    },
                                    "to_skill": {
                                        "$arrayElemAt": [
                                            "$pivot.skill_added",
                                            {"$add": ["$$idx", 1]},
                                        ]
                                    },
                                    "edge_kind": "skill_to_skill",
                                    "from_node_type": "skill",
                                    "to_node_type": "skill",
                                    "source_role": "$pivot.from_role",
                                    "target_role": "$pivot.to_role",
                                    "months": {
                                        "$divide": [
                                            "$pivot.months_taken",
                                            {"$add": ["$skill_count", 1]},
                                        ]
                                    },
                                    "salary_lift_pct": 0,
                                },
                            }
                        },
                        [
                            {
                                "from_skill": {
                                    "$arrayElemAt": [
                                        "$pivot.skill_added",
                                        {"$subtract": ["$skill_count", 1]},
                                    ]
                                },
                                "to_skill": "$pivot.to_role",
                                "edge_kind": "skill_to_role",
                                "from_node_type": "skill",
                                "to_node_type": "role",
                                "source_role": "$pivot.from_role",
                                "target_role": "$pivot.to_role",
                                "months": {
                                    "$divide": [
                                        "$pivot.months_taken",
                                        {"$add": ["$skill_count", 1]},
                                    ]
                                },
                                "salary_lift_pct": "$pivot.salary_lift_pct",
                            }
                        ],
                    ]
                }
            }
        },
        {"$unwind": "$edges"},
        {
            "$group": {
                "_id": {
                    "from": "$edges.from_skill",
                    "to": "$edges.to_skill",
                    "kind": "$edges.edge_kind",
                    "from_type": "$edges.from_node_type",
                    "to_type": "$edges.to_node_type",
                },
                "frequency": {"$sum": 1},
                "avg_months": {"$avg": "$edges.months"},
                "median_months": {"$avg": "$edges.months"},
                "avg_salary_lift_pct": {"$avg": "$edges.salary_lift_pct"},
                "source_roles": {"$addToSet": "$edges.source_role"},
                "target_roles": {"$addToSet": "$edges.target_role"},
            }
        },
        {
            "$project": {
                "_id": 0,
                "from_skill": "$_id.from",
                "to_skill": "$_id.to",
                "edge_kind": "$_id.kind",
                "from_node_type": "$_id.from_type",
                "to_node_type": "$_id.to_type",
                "source_roles": 1,
                "target_roles": 1,
                "frequency": 1,
                "avg_months": 1,
                "median_months": 1,
                "avg_salary_lift_pct": 1,
                "role_change_rate": {
                    "$cond": [
                        {"$eq": ["$_id.kind", "skill_to_role"]},
                        1,
                        0,
                    ]
                },
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

    log.info("Computing traversable skill_transitions graph via aggregation $out...")
    list(db["career_trajectories"].aggregate(pipeline))
    count = db["skill_transitions"].count_documents({})
    kinds = list(
        db["skill_transitions"].aggregate(
            [
                {"$group": {"_id": "$edge_kind", "count": {"$sum": 1}}},
                {"$sort": {"_id": 1}},
            ]
        )
    )
    log.info("[OK] skill_transitions populated: %d docs", count)
    for row in kinds:
        log.info("  %-14s %4d", row["_id"], row["count"])


if __name__ == "__main__":
    main()
