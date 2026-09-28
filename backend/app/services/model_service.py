"""
Model service: loads, hashes, caches, and scores all pipeline artifacts.
Models are loaded ONCE during FastAPI lifespan startup.
Only models listed as enabled in model_registry.json are loaded (the six frozen Phase 6 models).
"""
from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path
from typing import Any, Optional

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb

from app.config import MODEL_ARTIFACT_DIR
from app.services.registry_service import get_all_enabled_model_ids, get_model_config

logger = logging.getLogger(__name__)

# ── In-memory model store ──────────────────────────────────────────────────────
_models: dict[str, Any] = {}  # model_id -> frozen Phase 6 model bundle
_loaded = False

# Columns that must NEVER be fed to any model
FORBIDDEN_PREDICTORS = frozenset({
    "cost_event_6m", "schedule_event_6m", "compound_event_6m",
    "cost_eligible_6m", "schedule_eligible_6m", "compound_eligible_6m",
    "cost_censored_6m", "schedule_censored_6m", "compound_censored_6m",
    "split_a", "split_b_temporal", "project_id", "report_month",
    "source", "era", "feature_set",
    "planned_completion_original", "current_anticipated_completion",
})

# Obsolete fields forbidden from official XGBoost models (allowed ONLY in LR benchmarks)
OBSOLETE_TIMELINE_FIELDS = frozenset({
    "project_age_months", "elapsed_planned_ratio", "planned_remaining_months",
})

# The exact corrected COMMON feature set used by every frozen production XGBoost bundle.
OFFICIAL_XGB_FEATURES: list[str] = [
    "original_cost", "planned_duration_months", "cumulative_expenditure",
    "cumulative_to_original_ratio", "months_from_original_commissioning",
    "exp_change_1m", "exp_change_3m", "exp_slope_3m",
    "n_cost_revisions_to_date", "n_schedule_revisions_to_date", "sector_std",
    "expenditure_available", "planned_completion_available", "sector_available",
]


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def load_all_models() -> None:
    """Load and hash-verify all enabled models at startup. Raises on failure."""
    global _models, _loaded
    enabled_ids = get_all_enabled_model_ids()

    for model_id in enabled_ids:
        cfg = get_model_config(model_id)
        artifact_rel = cfg["artifact_path"]  # required; no fallback to old-generation paths
        artifact_path = MODEL_ARTIFACT_DIR / artifact_rel

        if not artifact_path.exists():
            raise FileNotFoundError(f"Model artifact not found: {artifact_path}")

        # SHA-256 verification — mandatory for official models
        expected_hash = cfg.get("model_sha256")
        actual_hash = _sha256_file(artifact_path)
        if expected_hash and actual_hash != expected_hash:
            if cfg.get("official_prediction"):
                raise ValueError(
                    f"HASH MISMATCH for official model {model_id}: "
                    f"expected={expected_hash} got={actual_hash}"
                )
            logger.warning("Hash mismatch for non-official model %s (expected %s got %s)", model_id, expected_hash, actual_hash)

        bundle = joblib.load(artifact_path)
        artifact_format = cfg.get("artifact_format", "frozen_joblib")

        if artifact_format == "portable_xgboost_v1":
            required = {"features", "preprocessor", "calibrator"}
            if not isinstance(bundle, dict) or not required.issubset(bundle):
                raise ValueError(f"{model_id} has an invalid portable support bundle")

            booster_path = MODEL_ARTIFACT_DIR / cfg["booster_path"]
            if not booster_path.exists():
                raise FileNotFoundError(f"Portable booster not found: {booster_path}")
            actual_booster_hash = _sha256_file(booster_path)
            expected_booster_hash = cfg.get("booster_sha256")
            if expected_booster_hash and actual_booster_hash != expected_booster_hash:
                raise ValueError(
                    f"HASH MISMATCH for booster {model_id}: "
                    f"expected={expected_booster_hash} got={actual_booster_hash}"
                )
            booster = xgb.Booster()
            booster.load_model(booster_path)
            bundle["booster"] = booster
        else:
            required = {"features", "preprocessor", "estimator", "calibrator"}
            if not isinstance(bundle, dict) or not required.issubset(bundle):
                raise ValueError(f"{model_id} is not a supported frozen Phase 6 model bundle")
        _models[model_id] = bundle
        logger.info("Loaded %s (hash OK: %s)", model_id, actual_hash[:12])

    # Verify official models are present
    for official_id in ("cost_cuf_xgb", "schedule_cuf_xgb", "compound_cuf_xgb"):
        if official_id not in _models:
            raise RuntimeError(f"Official model {official_id} failed to load")

    _loaded = True
    logger.info("All %d models loaded successfully.", len(_models))


def is_loaded() -> bool:
    return _loaded


def get_pipeline(model_id: str) -> Any:
    if model_id not in _models:
        raise KeyError(f"Model {model_id} not loaded. Check enabled status.")
    return _models[model_id]


def get_model_bundle(model_id: str) -> dict[str, Any]:
    """Return a frozen bundle containing features, preprocessing, estimator and calibrator."""
    bundle = get_pipeline(model_id)
    if not isinstance(bundle, dict):
        raise TypeError(f"{model_id} is not a frozen model bundle")
    return bundle


def score_row(model_id: str, feature_row: dict[str, Any]) -> float:
    """
    Score a single feature row through the pipeline.
    Returns predict_proba[:, 1] (probability of positive class).
    Input is validated: forbidden and obsolete columns are removed before scoring.
    """
    cfg = get_model_config(model_id)
    is_official_xgb = cfg.get("official_prediction", False)

    # Guard: remove forbidden predictors
    clean = {k: v for k, v in feature_row.items() if k not in FORBIDDEN_PREDICTORS}

    # Guard: remove obsolete timeline features from XGB official models
    if is_official_xgb:
        for field in OBSOLETE_TIMELINE_FIELDS:
            clean.pop(field, None)

    # Build DataFrame with correct column order
    ordered_features = cfg.get("ordered_raw_input_features", [])
    row_df = pd.DataFrame([{col: clean.get(col, np.nan) for col in ordered_features}])

    bundle = get_model_bundle(model_id)
    transformed = bundle["preprocessor"].transform(row_df)
    if "booster" in bundle:
        raw = bundle["booster"].predict(xgb.DMatrix(transformed))
    else:
        raw = bundle["estimator"].predict_proba(transformed)[:, 1]
    prob = float(bundle["calibrator"].predict_proba(raw.reshape(-1, 1))[0, 1])
    return prob


def classify(risk_score: float, threshold: float) -> str:
    return "HIGH" if risk_score >= threshold else "LOW"


def score_dataframe(model_id: str, df: pd.DataFrame) -> np.ndarray:
    """
    Score a DataFrame of rows through the pipeline.
    Returns array of predict_proba[:, 1] values.
    """
    cfg = get_model_config(model_id)
    is_official_xgb = cfg.get("official_prediction", False)

    clean_df = df.drop(columns=[c for c in FORBIDDEN_PREDICTORS if c in df.columns], errors="ignore")
    if is_official_xgb:
        clean_df = clean_df.drop(columns=[c for c in OBSOLETE_TIMELINE_FIELDS if c in clean_df.columns], errors="ignore")

    ordered_features = cfg.get("ordered_raw_input_features", [])
    input_df = pd.DataFrame({col: clean_df.get(col, pd.Series([np.nan] * len(clean_df))) for col in ordered_features})
    input_df = input_df.reset_index(drop=True)

    bundle = get_model_bundle(model_id)
    transformed = bundle["preprocessor"].transform(input_df)
    if "booster" in bundle:
        raw = bundle["booster"].predict(xgb.DMatrix(transformed))
    else:
        raw = bundle["estimator"].predict_proba(transformed)[:, 1]
    probs = bundle["calibrator"].predict_proba(raw.reshape(-1, 1))[:, 1]
    return probs
