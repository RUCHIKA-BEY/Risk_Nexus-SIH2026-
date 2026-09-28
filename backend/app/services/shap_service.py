"""Local explanations for the frozen production XGBoost models.

The frozen models are calibrated after XGBoost. Native TreeSHAP explains the
XGBoost raw margin before calibration; it must not be added to, or compared
with, the calibrated probability displayed by the dashboard.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
import xgboost as xgb

from app.schemas import SHAPDriver
from app.services.model_service import get_model_bundle
from app.services.registry_service import get_model_config

SHAP_ADDITIVITY_TOLERANCE = 1e-4


def _aggregate_ohe_shap(
    feature_names: list[str],
    shap_values: np.ndarray,
    raw_features: list[str],
) -> dict[str, float]:
    """Aggregate transformed columns (including one-hot columns) to raw fields."""
    aggregated: dict[str, float] = {}
    raw_features_longest_first = sorted(raw_features, key=len, reverse=True)

    for name, value in zip(feature_names, shap_values, strict=True):
        transformed_name = str(name)
        without_prefix = transformed_name.split("__", 1)[-1]

        raw_name = None
        for candidate in raw_features_longest_first:
            if without_prefix == candidate or without_prefix.startswith(candidate + "_"):
                raw_name = candidate
                break

        if raw_name is None and without_prefix.startswith("missingindicator_"):
            missing_name = without_prefix.removeprefix("missingindicator_")
            raw_name = missing_name if missing_name in raw_features else transformed_name
        if raw_name is None:
            raw_name = transformed_name

        aggregated[raw_name] = aggregated.get(raw_name, 0.0) + float(value)
    return aggregated


def _native_tree_contributions(
    booster: Any,
    transformed: Any,
) -> tuple[np.ndarray, float, float]:
    """Return feature contributions, bias and raw margin for one row."""
    matrix = xgb.DMatrix(transformed)
    contributions = np.asarray(booster.predict(matrix, pred_contribs=True))
    margin = float(np.asarray(booster.predict(matrix, output_margin=True)).reshape(-1)[0])

    if contributions.ndim != 2 or contributions.shape[0] != 1:
        raise ValueError(f"Unexpected TreeSHAP contribution shape: {contributions.shape}")

    feature_contributions = contributions[0, :-1]
    bias = float(contributions[0, -1])
    error = abs(float(feature_contributions.sum()) + bias - margin)
    if error > SHAP_ADDITIVITY_TOLERANCE:
        raise ValueError(
            f"TreeSHAP raw-margin additivity check failed: error={error:.6g}"
        )
    return feature_contributions, bias, margin


def compute_shap(
    model_id: str,
    feature_row: dict[str, Any],
    ordered_features: list[str],
    n_drivers: int = 5,
) -> tuple[list[SHAPDriver], list[SHAPDriver]]:
    """Explain one frozen official XGBoost prediction in raw-margin space."""
    cfg = get_model_config(model_id)
    if not cfg.get("official_prediction") or cfg.get("shap_support") != "NativeTreeSHAP":
        raise ValueError(
            f"SHAP is enabled only for frozen official XGBoost models; {model_id} is not eligible"
        )

    bundle = get_model_bundle(model_id)
    bundle_features = list(bundle["features"])
    if list(ordered_features) != bundle_features:
        raise ValueError(f"Feature order does not match frozen bundle for {model_id}")

    row_df = pd.DataFrame(
        [{column: feature_row.get(column, np.nan) for column in bundle_features}]
    )
    preprocessor = bundle["preprocessor"]
    transformed = preprocessor.transform(row_df)

    try:
        transformed_names = list(preprocessor.get_feature_names_out())
    except Exception:
        transformed_names = [f"feature_{i}" for i in range(transformed.shape[1])]

    booster = bundle.get("booster")
    if booster is None:
        estimator = bundle.get("estimator")
        if estimator is None or not hasattr(estimator, "get_booster"):
            raise ValueError(f"No XGBoost booster available for {model_id}")
        booster = estimator.get_booster()
    values, _, _ = _native_tree_contributions(booster, transformed)
    if len(transformed_names) != len(values):
        raise ValueError(
            f"Transformed feature-name count ({len(transformed_names)}) does not match "
            f"TreeSHAP value count ({len(values)})"
        )

    aggregated = _aggregate_ohe_shap(transformed_names, values, bundle_features)
    drivers: list[SHAPDriver] = []
    for feature, value in aggregated.items():
        if value == 0:
            continue
        drivers.append(
            SHAPDriver(
                feature=feature,
                raw_label=feature,
                shap_value=round(value, 6),
                direction="increases_risk" if value > 0 else "decreases_risk",
                feature_value=feature_row.get(feature),
            )
        )

    drivers.sort(key=lambda driver: abs(driver.shap_value), reverse=True)
    positive = [driver for driver in drivers if driver.shap_value > 0][:n_drivers]
    negative = [driver for driver in drivers if driver.shap_value < 0][:n_drivers]
    return positive, negative


SHAP_DISCLAIMER = (
    "TreeSHAP explains the frozen XGBoost signal before probability calibration. "
    "Driver direction and relative strength describe model associations, not causation; "
    "SHAP values are raw-margin contributions and are not percentage-point changes."
)
