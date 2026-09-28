"""
SIH26103 — Backend configuration.

Values come from environment variables or backend/.env. An UNSET or EMPTY
variable always means "use the default below"; an empty line in .env can
therefore never redirect the backend to the working directory.

Environment variables (all optional; defaults are correct for this package):
    MODEL_ARTIFACT_DIR       default backend/artifacts/deployment_v2
    CANONICAL_DATA_DIR       default backend/data/phase6
    VERIFY_DATASET_SHA256    default true  (dataset must match the frozen hash)
    ALLOW_DEMO_DATA          default false (true = explicit dev-only fallback)
    DEMO_DATA_DIR            default backend/demo_data
    SUPABASE_URL             default empty  \
    SUPABASE_SERVICE_ROLE_KEY default empty  | used only when the local canonical CSV is
    SUPABASE_BUCKET          default empty  | missing: it is downloaded once at startup
    SUPABASE_OBJECT_PATH     default empty  /  from Supabase Storage into DATASET_CACHE_DIR
    DATASET_CACHE_DIR        default backend/.dataset_cache
    DATASET_DOWNLOAD_TIMEOUT_SECONDS default 120
    TVM_DATA_DIR             default <repo parent>/TVM-.../TVM (disabled analysis route only)
    ALLOWED_ORIGINS          default http://localhost:5173,http://localhost:3000
    GEMINI_API_KEY           default empty -> /ai/explain uses its template fallback
    GEMINI_MODEL             default gemini-1.5-flash
    GEMINI_TIMEOUT_SECONDS   default 15
    SCHEDULE_ALERT_TOP_N     default 50
    SCHEDULE_ALERT_TOP_PERCENT default 10.0
    LOG_LEVEL                default INFO
    REQUEST_MAX_SIZE_BYTES   default 1048576
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
load_dotenv(BASE_DIR / ".env")


def _env_str(name: str, default: str) -> str:
    value = os.getenv(name)
    return value.strip() if value is not None and value.strip() else default


def _env_path(name: str, default: Path) -> Path:
    value = os.getenv(name)
    return Path(value.strip()) if value is not None and value.strip() else default


def _env_int(name: str, default: int) -> int:
    return int(_env_str(name, str(default)))


def _env_float(name: str, default: float) -> float:
    return float(_env_str(name, str(default)))


def _env_bool(name: str, default: bool) -> bool:
    return _env_str(name, "true" if default else "false").lower() in {"1", "true", "yes", "on"}


# ── Paths ──────────────────────────────────────────────────────────────────────
MODEL_ARTIFACT_DIR: Path = _env_path("MODEL_ARTIFACT_DIR", BASE_DIR / "artifacts" / "deployment_v2")
MODEL_REGISTRY_PATH: Path = MODEL_ARTIFACT_DIR / "model_registry.json"
DEMO_DATA_DIR: Path = _env_path("DEMO_DATA_DIR", BASE_DIR / "demo_data")

# Canonical scoring dataset (Phase 6 corrected ENHANCED file, bundled with the package).
CANONICAL_DATA_DIR: Path = _env_path("CANONICAL_DATA_DIR", BASE_DIR / "data" / "phase6")
CANONICAL_DATA_FILENAME = "enhanced_phase6_corrected.csv"
CANONICAL_DATA_PATH: Path = CANONICAL_DATA_DIR / CANONICAL_DATA_FILENAME
# SHA-256 recorded in XGBOOST_/LR_BASELINE_FREEZE_MANIFEST.json ("enhanced").
CANONICAL_DATA_SHA256 = "e2aa83f3835b1f3b21633715cdc0441ac10a174a2e6832f623c00f464305458c"
VERIFY_DATASET_SHA256: bool = _env_bool("VERIFY_DATASET_SHA256", True)
ALLOW_DEMO_DATA: bool = _env_bool("ALLOW_DEMO_DATA", False)

# ── Supabase Storage (remote source for the canonical dataset) ────────────────
# Server-side only. The service-role key is never logged, returned or sent to the frontend.
SUPABASE_URL: str = _env_str("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY: str = _env_str("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_BUCKET: str = _env_str("SUPABASE_BUCKET", "")
SUPABASE_OBJECT_PATH: str = _env_str("SUPABASE_OBJECT_PATH", "")
# Local cache for the downloaded dataset (ephemeral on Render; re-downloaded after a restart).
DATASET_CACHE_DIR: Path = _env_path("DATASET_CACHE_DIR", BASE_DIR / ".dataset_cache")
DATASET_DOWNLOAD_TIMEOUT_SECONDS: float = _env_float("DATASET_DOWNLOAD_TIMEOUT_SECONDS", 120.0)

TVM_DATA_DIR: Path = _env_path("TVM_DATA_DIR", BASE_DIR.parent.parent / "TVM-20260916T221011Z-1-001" / "TVM")
TVM_DATA_PATH: Path = TVM_DATA_DIR / "tvm_master_CORRECTED.csv"

# ── Security ───────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS: list[str] = [
    o.strip()
    for o in _env_str("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    if o.strip()
]

# ── Gemini ─────────────────────────────────────────────────────────────────────
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL: str = _env_str("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_TIMEOUT_SECONDS: int = _env_int("GEMINI_TIMEOUT_SECONDS", 15)

# ── Alert / Priority ──────────────────────────────────────────────────────────
SCHEDULE_ALERT_TOP_N: int = _env_int("SCHEDULE_ALERT_TOP_N", 50)
SCHEDULE_ALERT_TOP_PERCENT: float = _env_float("SCHEDULE_ALERT_TOP_PERCENT", 10.0)

# ── Misc ───────────────────────────────────────────────────────────────────────
LOG_LEVEL: str = _env_str("LOG_LEVEL", "INFO")
REQUEST_MAX_SIZE_BYTES: int = _env_int("REQUEST_MAX_SIZE_BYTES", 1 * 1024 * 1024)
