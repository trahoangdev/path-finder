"""Pre-flight: ping MongoDB Atlas + OpenAI. Aborts ETL if either is unreachable."""
from __future__ import annotations

import os
import sys

from _common import get_db, get_openai_key, log


def check_mongo() -> bool:
    try:
        db = get_db()
        result = db.command("ping")
        if result.get("ok") != 1:
            log.error("Mongo ping returned non-ok: %s", result)
            return False
        log.info("[OK] MongoDB Atlas reachable. DB=%s", db.name)
        cols = db.list_collection_names()
        log.info("  Existing collections (%d): %s", len(cols), cols or "[]")
        return True
    except Exception as e:
        log.error("[FAIL] MongoDB ping failed: %s", e)
        return False


def check_openai() -> bool:
    try:
        from openai import OpenAI

        client = OpenAI(api_key=get_openai_key())
        model = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
        res = client.embeddings.create(
            model=model,
            input="connectivity check",
            dimensions=768,
        )
        n = len(res.data[0].embedding) if res.data else 0
        if n != 768:
            log.error("[FAIL] OpenAI returned wrong dim: %d (expected 768)", n)
            return False
        log.info("[OK] OpenAI API reachable. Model=%s  dim=%d", model, n)
        return True
    except Exception as e:
        log.error("[FAIL] OpenAI ping failed: %s", e)
        return False


if __name__ == "__main__":
    ok1 = check_mongo()
    ok2 = check_openai()
    if not (ok1 and ok2):
        log.error("Pre-flight FAILED - fix above before running ETL.")
        sys.exit(1)
    log.info("[OK] Pre-flight passed - safe to run ETL.")
