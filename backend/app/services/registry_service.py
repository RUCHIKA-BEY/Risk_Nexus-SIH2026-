"""
Registry service: loads model_registry.json, validates it, and exposes
typed accessors. Loaded once at startup.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from app.config import MODEL_ARTIFACT_DIR

logger = logging.getLogger(__name__)

_registry: dict[str, Any] = {}
_loaded = False


def load_registry() -> None:
    global _registry, _loaded
    registry_path = MODEL_ARTIFACT_DIR / "model_registry.json"
    if not registry_path.exists():
        raise FileNotFoundError(f"model_registry.json not found at {registry_path}")
    with open(registry_path) as f:
        _registry = json.load(f)
    _validate_registry()
    _loaded = True
    logger.info("Model registry loaded. Version: %s", _registry.get("registry_version"))


def _validate_registry() -> None:
    """Enforce routing invariants from the spec."""
    models = _registry.get("models", {})

    # schedule_e3_xgb must be disabled
    e3 = models.get("schedule_e3_xgb", {})
    assert not e3.get("enabled", True), "schedule_e3_xgb must have enabled=false"
    assert e3.get("status") == "rejected_by_ablation", "schedule_e3_xgb must be rejected_by_ablation"

    # Official production models
    official = [m for m in models.values() if m.get("official_prediction")]
    official_ids = {m["model_id"] for m in official}
    required = {"cost_cuf_xgb", "schedule_cuf_xgb", "compound_cuf_xgb"}
    assert official_ids == required, f"Official models must be exactly {required}, got {official_ids}"

    # LR benchmarks
    for lr_id in ("cost_cuf_lr", "schedule_cuf_lr", "compound_cuf_lr"):
        lr = models.get(lr_id, {})
        assert lr.get("benchmark_only"), f"{lr_id} must have benchmark_only=true"
        assert not lr.get("official_prediction"), f"{lr_id} must have official_prediction=false"
        assert not lr.get("may_replace_xgboost_predictions", True), f"{lr_id} may_replace_xgboost_predictions must be false"

    # No averaging
    rules = _registry.get("routing_rules", {})
    assert not rules.get("average_official_and_exploratory", True), "average_official_and_exploratory must be false"
    assert not rules.get("lr_may_replace_xgboost", True), "lr_may_replace_xgboost must be false"


def get_registry() -> dict[str, Any]:
    if not _loaded:
        raise RuntimeError("Registry not loaded. Call load_registry() at startup.")
    return _registry


def get_model_config(model_id: str) -> dict[str, Any]:
    cfg = get_registry()["models"].get(model_id)
    if cfg is None:
        raise KeyError(f"Unknown model_id: {model_id}")
    return cfg


def get_official_model_ids() -> list[str]:
    return get_registry().get("official_production_route", [])


def get_analysis_model_ids() -> list[str]:
    return get_registry().get("analysis_route", [])


def get_benchmark_model_ids() -> list[str]:
    return get_registry().get("benchmark_route", [])


def get_all_enabled_model_ids() -> list[str]:
    return [
        mid for mid, cfg in get_registry()["models"].items()
        if cfg.get("enabled", False)
    ]


def registry_version() -> str:
    return get_registry().get("registry_version", "unknown")
