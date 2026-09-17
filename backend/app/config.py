"""
SIH26103 — Backend configuration.
All values read from environment variables or .env file.
"""
from __future__ import annotations
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent  # backend/

MODEL_ARTIFACT_DIR: Path = Path(
    os.getenv("MODEL_ARTIFACT_DIR", str(BASE_DIR / "artifacts" / "deployment_v2"))
)
DEMO_DATA_DIR: Path = Path(
    os.getenv("DEMO_DATA_DIR", str(BASE_DIR / "demo_data"))
)
MODEL_REGISTRY_PATH: Path = MODEL_ARTIFACT_DIR / "model_registry.json"

CANONICAL_DATA_DIR: Path = Path(
    os.getenv(
        "CANONICAL_DATA_DIR",
        str(BASE_DIR.parent.parent / "Phase 6 updated handoff data"),
    )
)
CANONICAL_DATA_PATH: Path = CANONICAL_DATA_DIR / "enhanced_phase6_corrected.csv"

# ── Cloudflare R2 Configuration ───────────────────────────────────────────────
R2_ENDPOINT_URL: str = os.getenv("R2_ENDPOINT_URL", "")
R2_ACCESS_KEY_ID: str = os.getenv("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY: str = os.getenv("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET_NAME: str = os.getenv("R2_BUCKET_NAME", "")
R2_OBJECT_KEY: str = os.getenv("R2_OBJECT_KEY", "")
R2_CACHE_DIR: Path = Path(os.getenv("R2_CACHE_DIR", str(BASE_DIR / ".cache" / "r2_data")))

TVM_DATA_DIR: Path = Path(
    os.getenv(
        "TVM_DATA_DIR",
        str(BASE_DIR.parent.parent / "TVM-20260916T221011Z-1-001" / "TVM"),
    )
)
TVM_DATA_PATH: Path = TVM_DATA_DIR / "tvm_master_CORRECTED.csv"

# ── Security ───────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    if o.strip()
]

# ── Gemini ─────────────────────────────────────────────────────────────────────
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_TIMEOUT_SECONDS: int = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "15"))

# ── Alert / Priority ──────────────────────────────────────────────────────────
SCHEDULE_ALERT_TOP_N: int = int(os.getenv("SCHEDULE_ALERT_TOP_N", "50"))
SCHEDULE_ALERT_TOP_PERCENT: float = float(os.getenv("SCHEDULE_ALERT_TOP_PERCENT", "10.0"))

# ── Misc ───────────────────────────────────────────────────────────────────────
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
REQUEST_MAX_SIZE_BYTES: int = int(os.getenv("REQUEST_MAX_SIZE_BYTES", str(1 * 1024 * 1024)))
