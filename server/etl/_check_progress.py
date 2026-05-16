"""Quick: how many docs have embeddings so far?"""
from _common import get_db, log

db = get_db()
for col in ("skills", "courses", "jobs"):
    total = db[col].count_documents({})
    with_emb = db[col].count_documents({"description_embedding": {"$exists": True}})
    log.info("%-10s  %5d / %5d  (%.1f%%)", col, with_emb, total, 100 * with_emb / max(1, total))
