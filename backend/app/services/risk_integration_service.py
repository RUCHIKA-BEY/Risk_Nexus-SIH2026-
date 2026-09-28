"""Integration layer: frozen XGBoost prediction, LR benchmark, SHAP and FCM.

Routing and thresholds are read from model_registry.json only. They match
XGBOOST_BASELINE_FREEZE_MANIFEST.json / LR_BASELINE_FREEZE_MANIFEST.json
(confirmed by the project owner on 2026-09-27) and are never computed or
altered here.
"""
from __future__ import annotations

import platform
from typing import Any

import joblib
import numpy as np
import pandas as pd
import sklearn
import xgboost

from app.explainability.shap_engine import explain_row
from app.fcm import engine as fcm_engine
from app.fcm.concepts import CONCEPTS, INPUT_NORMALISATION, SOURCE_COLUMNS
from app.fcm.weights import load_config
from app.integration_schemas import ML_DISCLAIMER
from app.services.feature_service import build_feature_dict
from app.services.model_service import FORBIDDEN_PREDICTORS, OBSOLETE_TIMELINE_FIELDS, score_row
from app.services.project_service import get_dataset_info, get_project_rows_as_of
from app.services.registry_service import (
    get_benchmark_model_ids,
    get_model_config,
    get_official_model_ids,
    registry_version,
)

TARGETS = ("cost", "schedule", "compound")
ROUTING_SOURCE = (
    "XGBOOST_BASELINE_FREEZE_MANIFEST.json and LR_BASELINE_FREEZE_MANIFEST.json (2026-09-24); "
    "confirmed authoritative by the project owner on 2026-09-27"
)


class ProjectMonthNotFound(LookupError):
    pass


def load_row(project_id: str, as_of: str) -> pd.Series:
    """Latest row with report_month <= as_of. Never reads a later row."""
    rows = get_project_rows_as_of(project_id, as_of)
    if rows.empty:
        raise ProjectMonthNotFound(f"No data for project {project_id} at or before {as_of}")
    return rows.sort_values("report_month").iloc[-1]


def model_features(model_id: str) -> list[str]:
    features = list(get_model_config(model_id)["ordered_raw_input_features"])
    leaked = set(features) & FORBIDDEN_PREDICTORS
    if leaked:
        raise ValueError(f"{model_id} lists forbidden columns as features: {sorted(leaked)}")
    return features


def _model_name(model_id: str) -> str:
    return "XGBoost" if model_id.endswith("_xgb") else "LogisticRegression"


def _ids_by_target(ids: list[str]) -> dict[str, str]:
    by_target = {get_model_config(m)["target"]: m for m in ids}
    if set(by_target) != set(TARGETS) or len(by_target) != len(ids):
        raise RuntimeError(f"Registry route must map exactly one model to each of {TARGETS}; got {ids}")
    return by_target


def predict_block(row: pd.Series, role: str) -> dict[str, Any]:
    ids = get_official_model_ids() if role == "official_production" else get_benchmark_model_ids()
    block: dict[str, Any] = {"role": role, "disclaimer": ML_DISCLAIMER}
    for target, model_id in _ids_by_target(ids).items():
        cfg = get_model_config(model_id)
        official = bool(cfg.get("official_prediction"))
        if official != (role == "official_production"):
            raise RuntimeError(f"{model_id} official flag does not match route {role}")
        features = model_features(model_id)
        if official and set(features) & OBSOLETE_TIMELINE_FIELDS:
            raise RuntimeError(f"{model_id} uses excluded legacy timeline features")
        probability = float(score_row(model_id, build_feature_dict(row, features)))
        threshold = float(cfg["threshold"])
        risk = probability >= threshold
        block[target] = {
            "target": target,
            "model_id": model_id,
            "model_name": _model_name(model_id),
            "feature_set": cfg["feature_set"],
            "probability": probability,
            "threshold": threshold,
            "risk": risk,
            "risk_level": "HIGH" if risk else "LOW",
            "official_prediction": official,
            "horizon_months": int(cfg.get("prediction_horizon_months", 6)),
        }
    return block


def explanation_block(row: pd.Series, targets: list[str], top_n: int) -> dict[str, Any]:
    by_target = _ids_by_target(get_official_model_ids())
    explanations = {}
    for target in targets:
        model_id = by_target[target]
        exp = explain_row(model_id, build_feature_dict(row, model_features(model_id)), top_n=top_n)
        exp.pop("all_contributors")
        explanations[target] = exp
    return {"explanations": explanations}


def fcm_block(row: pd.Series | None, overrides: dict[str, float], max_pathways: int) -> dict[str, Any]:
    fcm_row = None
    if row is not None:
        fcm_row = {c: row.get(c) for c in SOURCE_COLUMNS}
    return fcm_engine.reason(fcm_row, overrides, max_pathways=max_pathways)


def fcm_graph() -> dict[str, Any]:
    cfg = load_config()
    return {
        "config_version": cfg.version,
        "review_status": cfg.review_status,
        "nodes": [{"concept": n, **CONCEPTS[n]} for n in cfg.nodes],
        "edges": [{
            "source": e["source"], "target": e["target"], "weight": float(e["weight"]),
            "relationship": "positive" if float(e["weight"]) >= 0 else "negative",
            "basis": e.get("basis", ""), "influence": 0.0,
        } for e in cfg.edges],
        "node_order": cfg.nodes,
        "weight_matrix": cfg.W.tolist(),
        "update_rule": cfg.update_rule,
        "activation": cfg.activation,
        "damping": cfg.damping,
        "input_normalisation": INPUT_NORMALISATION,
    }


def model_info() -> dict[str, Any]:
    def entry(model_id: str, role: str) -> dict[str, Any]:
        cfg = get_model_config(model_id)
        return {
            "model_id": model_id,
            "target": cfg["target"],
            "model_name": _model_name(model_id),
            "role": role,
            "feature_set": cfg["feature_set"],
            "threshold": float(cfg["threshold"]),
            "selected_config": cfg.get("selected_config"),
            "selected_C": cfg.get("selected_C"),
            "ordered_features": model_features(model_id),
            "artifact_sha256": cfg.get("model_sha256", ""),
            "source_frozen_sha256": cfg.get("source_frozen_sha256"),
            "validation_metrics": {k: float(v) for k, v in (cfg.get("validation_metrics") or {}).items()},
        }
    return {
        "registry_version": registry_version(),
        "routing_source": ROUTING_SOURCE,
        "production": [entry(m, "official_production") for m in get_official_model_ids()],
        "benchmark": [entry(m, "benchmark_only") for m in get_benchmark_model_ids()],
        "excluded_legacy_features": sorted(OBSOLETE_TIMELINE_FIELDS),
        "dataset": get_dataset_info(),
        "runtime": {
            "python": platform.python_version(),
            "scikit_learn": sklearn.__version__,
            "xgboost": xgboost.__version__,
            "joblib": joblib.__version__,
            "numpy": np.__version__,
            "pandas": pd.__version__,
        },
    }


def row_month(row: pd.Series) -> str:
    return pd.Timestamp(row["report_month"]).strftime("%Y-%m-%d")
