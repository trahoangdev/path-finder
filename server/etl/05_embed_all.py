"""Generate embeddings (768-dim) for skills, courses, jobs, trajectories.

Primary: OpenAI `text-embedding-3-small` with `dimensions=768` (Matryoshka
truncation).

Fallback: deterministic L2-normalized pseudo-vectors when the OpenAI quota /
rate-limit is hit (HTTP 429 RESOURCE_EXHAUSTED / rate_limit_exceeded). Those
vectors are **not semantically meaningful** — they only satisfy Atlas Vector
Search index shape + let the hackathon demo run. Re-run ETL later (without
`EMBED_FORCE_DETERMINISTIC`) to replace them with real embeddings.

Order: **courses → jobs → skills → trajectory snapshots** so the smaller
collections get real API calls first when quota is tight.

Env:
  OPENAI_API_KEY                — uses real embeddings when present
  OPENAI_EMBEDDING_MODEL        — default `text-embedding-3-small`
  EMBED_FORCE_DETERMINISTIC=1   — skip the API entirely (offline / CI).
"""

from __future__ import annotations

import hashlib
import math
import os
import struct
import time

from openai import OpenAI, RateLimitError
from tqdm import tqdm

from _common import get_db, get_openai_key, log

client: OpenAI | None = None
MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
EMBED_DIM = 768  # must match server/src/schemas/common.ts EMBEDDING_DIM


def get_client() -> OpenAI:
    global client
    if client is None:
        client = OpenAI(api_key=get_openai_key())
    return client


def deterministic_embedding(text: str, dim: int = EMBED_DIM) -> list[float]:
    """L2-normalized 768-d vector from SHA-256 chain. Not semantic — index-shape only."""
    seed = text.encode("utf-8")
    raw = bytearray()
    while len(raw) < dim * 4 + 64:
        seed = hashlib.sha256(seed).digest()
        raw.extend(seed)
    vals: list[float] = []
    for i in range(0, dim * 4, 4):
        vals.append(struct.unpack("<f", raw[i : i + 4])[0])
    vals = vals[:dim]
    s = math.sqrt(sum(v * v for v in vals))
    if s == 0:
        return [1.0 / (dim**0.5)] * dim
    return [v / s for v in vals]


def _is_quota_exhausted(exc: BaseException) -> bool:
    if isinstance(exc, RateLimitError):
        return True
    s = str(exc).lower()
    if "429" in s or "rate_limit" in s or "quota" in s or "insufficient_quota" in s:
        return True
    code = getattr(exc, "status_code", None) or getattr(exc, "code", None)
    return code == 429


def embed_batch_api(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    res = get_client().embeddings.create(
        model=MODEL,
        input=texts,
        dimensions=EMBED_DIM,
    )
    return [list(d.embedding) for d in res.data]


def embed_one_api(text: str) -> list[float]:
    res = get_client().embeddings.create(
        model=MODEL,
        input=text,
        dimensions=EMBED_DIM,
    )
    if not res.data or not res.data[0].embedding:
        raise RuntimeError("OpenAI returned empty embedding")
    return list(res.data[0].embedding)


def embed_texts(
    label: str,
    texts: list[str],
    api_available: list[bool],
) -> list[list[float]]:
    vectors: list[list[float]] = []

    if not api_available[0]:
        return [deterministic_embedding(t) for t in texts]

    try:
        vectors = embed_batch_api(texts)
    except BaseException as e:
        if _is_quota_exhausted(e):
            log.warning(
                "[%s] OpenAI embed quota hit (%s) — "
                "switching to deterministic vectors for the REST of this ETL run.",
                label,
                type(e).__name__,
            )
            api_available[0] = False
            vectors = [deterministic_embedding(t) for t in texts]
        else:
            log.warning("[%s] batch failed (%s); trying per-item API then deterministic", label, e)
            for t in texts:
                if not api_available[0]:
                    vectors.append(deterministic_embedding(t))
                    continue
                try:
                    vectors.append(embed_one_api(t))
                except BaseException as ee:
                    if _is_quota_exhausted(ee):
                        log.warning("[%s] quota exhausted mid-row — deterministic from here on.", label)
                        api_available[0] = False
                        vectors.append(deterministic_embedding(t))
                    else:
                        log.warning("[%s] single embed failed: %s; using deterministic", label, ee)
                        vectors.append(deterministic_embedding(t))

    if len(vectors) != len(texts):
        raise RuntimeError(f"vector count mismatch: {len(vectors)} vs {len(texts)}")

    return vectors


def embed_collection(
    name: str,
    text_field: str,
    batch_size: int = 16,
    pause_sec: float = 0.25,
    api_available: list[bool] | None = None,
) -> None:
    """Mutates api_available[0] to False when OpenAI quota is hit."""
    flag = api_available if api_available is not None else [True]
    db = get_db()
    coll = db[name]
    cursor = coll.find({"description_embedding": {"$exists": False}}, {text_field: 1})
    docs = list(cursor)
    log.info("[%s] %d docs need embedding", name, len(docs))
    if not docs:
        return

    force_det = os.getenv("EMBED_FORCE_DETERMINISTIC", "").lower() in ("1", "true", "yes")
    if force_det:
        log.warning("[%s] EMBED_FORCE_DETERMINISTIC=1 — using hash vectors only", name)
        flag[0] = False

    for i in tqdm(range(0, len(docs), batch_size), desc=name):
        batch = docs[i : i + batch_size]
        texts = [d.get(text_field) or "" for d in batch]
        vectors = embed_texts(name, texts, flag)

        for d, v in zip(batch, vectors):
            if len(v) != EMBED_DIM:
                log.warning("[%s] wrong dim %d, re-hash", name, len(v))
                v = deterministic_embedding(d.get(text_field) or "")
            coll.update_one(
                {"_id": d["_id"]},
                {"$set": {"description_embedding": v}},
            )
        time.sleep(pause_sec)


def snapshot_embedding_text(doc: dict, snapshot: dict) -> str:
    skills_have = ", ".join(snapshot.get("skills_have") or [])
    skills_want = ", ".join(snapshot.get("skills_want") or [])
    return "\n".join(
        [
            f"Role: {snapshot.get('role') or doc.get('current_role') or ''}",
            f"Year: {snapshot.get('estimated_year') or ''}",
            f"Country: {doc.get('country') or ''}",
            f"Experience years: {doc.get('total_years_exp') or ''}",
            f"Skills have: {skills_have}",
            f"Skills want: {skills_want}",
        ]
    )


def embed_trajectory_snapshots(
    batch_size: int = 64,
    pause_sec: float = 0.25,
    api_available: list[bool] | None = None,
) -> None:
    """Populate career_trajectories.snapshots[].cv_embedding."""
    flag = api_available if api_available is not None else [True]
    db = get_db()
    coll = db["career_trajectories"]
    cursor = coll.find(
        {"snapshots": {"$elemMatch": {"cv_embedding": {"$exists": False}}}},
        {"snapshots": 1, "current_role": 1, "country": 1, "total_years_exp": 1},
    )
    docs = list(cursor)

    pending: list[tuple[dict, int, str]] = []
    for doc in docs:
        for idx, snapshot in enumerate(doc.get("snapshots") or []):
            if "cv_embedding" not in snapshot:
                pending.append((doc, idx, snapshot_embedding_text(doc, snapshot)))

    log.info("[career_trajectories.snapshots] %d snapshots need embedding", len(pending))
    if not pending:
        return

    force_det = os.getenv("EMBED_FORCE_DETERMINISTIC", "").lower() in ("1", "true", "yes")
    if force_det:
        log.warning("[career_trajectories.snapshots] EMBED_FORCE_DETERMINISTIC=1 — using hash vectors only")
        flag[0] = False

    for i in tqdm(range(0, len(pending), batch_size), desc="trajectory snapshots"):
        batch = pending[i : i + batch_size]
        texts = [item[2] for item in batch]
        vectors = embed_texts("career_trajectories.snapshots", texts, flag)

        updates: dict[object, dict[str, list[float]]] = {}
        for (doc, idx, text), vector in zip(batch, vectors):
            if len(vector) != EMBED_DIM:
                log.warning("[career_trajectories.snapshots] wrong dim %d, re-hash", len(vector))
                vector = deterministic_embedding(text)
            doc_id = doc["_id"]
            updates.setdefault(doc_id, {})[f"snapshots.{idx}.cv_embedding"] = vector

        for doc_id, fields in updates.items():
            coll.update_one({"_id": doc_id}, {"$set": fields})
        time.sleep(pause_sec)


def wipe_existing_embeddings() -> None:
    """Remove old (Gemini-era) embeddings so they get re-embedded with OpenAI.

    Triggered via `WIPE_EXISTING_EMBEDDINGS=1`. This is intentional and
    required when switching embedding providers because cosine similarity
    across different embedding spaces is meaningless.
    """
    db = get_db()
    for name in ("courses", "jobs", "skills"):
        res = db[name].update_many(
            {"description_embedding": {"$exists": True}},
            {"$unset": {"description_embedding": ""}},
        )
        log.info("[%s] cleared %d existing embeddings", name, res.modified_count)
    res = db["career_trajectories"].update_many(
        {"snapshots.cv_embedding": {"$exists": True}},
        {"$unset": {"snapshots.$[].cv_embedding": ""}},
    )
    log.info("[career_trajectories.snapshots] cleared %d existing embeddings", res.modified_count)


def main() -> None:
    if os.getenv("WIPE_EXISTING_EMBEDDINGS", "").lower() in ("1", "true", "yes"):
        log.warning("WIPE_EXISTING_EMBEDDINGS=1 — clearing existing description_embedding fields")
        wipe_existing_embeddings()

    force = os.getenv("EMBED_FORCE_DETERMINISTIC", "").lower() in ("1", "true", "yes")
    has_openai_key = bool(os.getenv("OPENAI_API_KEY"))
    api_ok = [not force and has_openai_key]
    if not force and not has_openai_key:
        log.warning("OPENAI_API_KEY is not set — using deterministic hash vectors for this ETL run")

    # Smaller collections first so real embeddings land on courses/jobs if quota is tight
    embed_collection("courses", "description", api_available=api_ok)
    embed_collection("jobs", "description", api_available=api_ok)
    embed_collection("skills", "description", api_available=api_ok)
    embed_trajectory_snapshots(api_available=api_ok)

    if api_ok[0]:
        log.info("[OK] Embeddings complete (OpenAI API, model=%s)", MODEL)
    else:
        log.warning(
            "[OK] Embeddings complete — part or all used deterministic hash vectors. "
            "Re-run later (unset EMBED_FORCE_DETERMINISTIC) to refresh with OpenAI."
        )


if __name__ == "__main__":
    main()
