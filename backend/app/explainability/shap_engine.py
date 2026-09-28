"""SHAP engine for the frozen production XGBoost models.

Uses the exact booster the backend serves (the portable UBJ booster loaded by
model_service, which is bit-identical to the frozen training bundle) and the
frozen, already-fitted preprocessor. Nothing is refitted.

Method: XGBoost native TreeSHAP (``pred_contribs=True``). This is the same
algorithm as ``shap.TreeExplainer(booster)`` with tree_path_dependent
perturbation; the two were verified identical (max difference 0.0), so the
``shap`` package is not a runtime dependency.

SHAP space: raw XGBoost margin (log-odds) BEFORE the sigmoid calibrator.
    raw_margin = expected_value + sum(shap_values)          (checked every call)
    probability = calibrator(sigmoid(raw_margin))          (same as model_service)
The calibrator is a 1-D logistic regression with a positive slope (checked),
so a positive SHAP value always pushes the calibrated probability up.

Aggregation to raw features:
    numeric__<f>                     -> f
    numeric__missingindicator_<f>    -> f   (missingness of f is attributed to f)
    categorical__sector_std_<level>  -> sector_std
"""
from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd
import xgboost as xgb

from app.explainability.feature_labels import label_for
from app.services.model_service import FORBIDDEN_PREDICTORS, get_model_bundle
from app.services.registry_service import get_model_config

ADDITIVITY_TOLERANCE = 1e-4  # float32 booster arithmetic; observed max ~1e-5


class ShapAdditivityError(RuntimeError):
    pass


def _is_missing(value: Any) -> bool:
    if value is None:
        return True
    try:
        return isinstance(value, float) and math.isnan(value)
    except TypeError:
        return False


def _column_to_raw_feature(transformed_names: list[str], raw_features: list[str], categorical: list[str]) -> list[str]:
    mapping: list[str] = []
    for full in transformed_names:
        name = full.split("__", 1)[-1]
        if name.startswith("missingindicator_"):
            raw = name.removeprefix("missingindicator_")
        elif name in raw_features:
            raw = name
        else:
            matches = [c for c in categorical if name.startswith(c + "_")]
            if len(matches) != 1:
                raise ValueError(f"Cannot map transformed column {full!r} to a raw feature")
            raw = matches[0]
        if raw not in raw_features:
            raise ValueError(f"Transformed column {full!r} maps to unknown raw feature {raw!r}")
        mapping.append(raw)
    return mapping


def _categorical_features(preprocessor: Any) -> list[str]:
    cats: list[str] = []
    for name, _, cols in preprocessor.transformers_:
        if name.startswith("cat"):
            cats.extend(list(cols))
    return cats


def explain_row(model_id: str, feature_row: dict[str, Any], top_n: int = 5) -> dict[str, Any]:
    """Explain one prediction of an official XGBoost model.

    ``feature_row`` holds raw features at month T. Only the model's own ordered
    features are read; target/split/identity columns are rejected.
    """
    cfg = get_model_config(model_id)
    if not cfg.get("official_prediction") or cfg.get("shap_support") != "NativeTreeSHAP":
        raise ValueError(f"SHAP is only served for official XGBoost models; {model_id} is not one")

    bundle = get_model_bundle(model_id)
    features: list[str] = list(bundle["features"])
    if features != list(cfg["ordered_raw_input_features"]):
        raise ValueError(f"Registry feature order does not match frozen bundle for {model_id}")
    leaked = set(features) & FORBIDDEN_PREDICTORS
    if leaked:
        raise ValueError(f"Forbidden columns in model features: {sorted(leaked)}")

    row_df = pd.DataFrame([{f: feature_row.get(f, np.nan) for f in features}])
    preprocessor = bundle["preprocessor"]
    transformed = preprocessor.transform(row_df)
    if hasattr(transformed, "toarray"):
        transformed = transformed.toarray()
    names = list(preprocessor.get_feature_names_out())

    booster = bundle.get("booster")
    if booster is None:
        booster = bundle["estimator"].get_booster()
    dm = xgb.DMatrix(transformed)
    contribs = np.asarray(booster.predict(dm, pred_contribs=True))[0]
    margin = float(np.asarray(booster.predict(dm, output_margin=True)).reshape(-1)[0])
    raw_prob = np.asarray(booster.predict(dm)).reshape(-1)
    probability = float(bundle["calibrator"].predict_proba(raw_prob.reshape(-1, 1))[0, 1])

    col_shap, expected_value = contribs[:-1], float(contribs[-1])
    if len(col_shap) != len(names):
        raise ValueError(f"{model_id}: {len(names)} transformed columns but {len(col_shap)} SHAP values")
    shap_sum = float(col_shap.sum())
    additivity_error = abs(expected_value + shap_sum - margin)
    if additivity_error > ADDITIVITY_TOLERANCE:
        raise ShapAdditivityError(f"{model_id}: SHAP additivity error {additivity_error:.3g}")

    raw_of = _column_to_raw_feature(names, features, _categorical_features(preprocessor))
    per_feature = {f: 0.0 for f in features}
    for raw, value in zip(raw_of, col_shap):
        per_feature[raw] += float(value)

    ranked = sorted(per_feature.items(), key=lambda kv: (-abs(kv[1]), kv[0]))
    contributors = []
    for rank, (feat, value) in enumerate(ranked, start=1):
        raw_value = feature_row.get(feat)
        missing = _is_missing(raw_value)
        contributors.append({
            "rank": rank,
            "feature": feat,
            "label": label_for(feat),
            "value": None if missing else raw_value,
            "value_missing": missing,
            "shap_value": value,
            "abs_shap_value": abs(value),
            "direction": "increasing_risk" if value > 0 else "decreasing_risk",
        })

    threshold = float(cfg["threshold"])
    return {
        "target": cfg["target"],
        "model_id": model_id,
        "probability": probability,
        "threshold": threshold,
        "risk": probability >= threshold,
        "expected_value": expected_value,
        "raw_margin": margin,
        "shap_sum": shap_sum,
        "additivity_error": additivity_error,
        "positive_contributors": [c for c in contributors if c["shap_value"] > 0][:top_n],
        "negative_contributors": [c for c in contributors if c["shap_value"] < 0][:top_n],
        "all_contributors": contributors,
    }


def calibrator_is_increasing(model_id: str) -> bool:
    """SHAP direction carries over to the calibrated probability only if this is True."""
    return float(get_model_bundle(model_id)["calibrator"].coef_[0][0]) > 0
