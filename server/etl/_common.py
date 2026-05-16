"""Shared utilities for ETL scripts."""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.database import Database
from rich.console import Console
from rich.logging import RichHandler

# Windows PowerShell defaults to cp1252 and Rich's legacy Windows renderer
# bypasses stdout — force UTF-8 + disable legacy Windows mode so log lines
# with ✓ / em-dash / Vietnamese diacritics never crash with UnicodeEncodeError.
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


# Load `../.env` (server root)
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

console = Console(legacy_windows=False, force_terminal=True)
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(message)s",
    datefmt="[%X]",
    handlers=[RichHandler(console=console, rich_tracebacks=True, show_path=False)],
)
log = logging.getLogger("etl")

DATA_DIR = ROOT.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_db() -> Database:
    uri = os.getenv("MONGODB_URI")
    db_name = os.getenv("MONGODB_DB", "pathfinder")
    if not uri:
        raise RuntimeError("MONGODB_URI is not set. Set it in server/.env or shell.")
    client: MongoClient[dict[str, Any]] = MongoClient(uri)
    return client[db_name]


def get_openai_key() -> str:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY is not set.")
    return key
