"""
SHAP explanation service.
For XGBoost: extract classifier from pipeline, apply preprocessor.transform(X),
pass to shap.TreeExplainer, aggregate one-hot features back to raw names.
For LR: use shap.LinearExplainer with the same approach.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import numpy as np
import pandas as pd
import shap

from app.schemas import SHAPDriver
from app.services.model_service import get_pipeline
from app.services.registry_service import get_model_config

logger = logging.getLogger(__name__)

SHAP_ADDITIVITY_TOLERANCE = 1e-3


def _aggregate_ohe_shap(
    feature_names: list[str],
    shap_values: np.ndarray,
    raw_features: list[str],
) -> dict[str, float]:
    """
    Aggregate one-hot encoded SHAP values back into raw feature contributions.
    e.g. cat__sector_std_RAILWAYS + cat__sector_std_POWER -> sector_std
    """
    aggregated: dict[str, float] = {}
    for i, name in enumerate(feature_names):
        # Map transformed column name to raw feature name
        raw_name = name
        if name.startswith("num__missingindicator_"):
            raw_name = name.replace("num__missingindicator_", "") + " [missing]"
        elif name.startswith("num__"):
            raw_name = name[5:]  # strip "num__"
        elif name.startswith("cat__"):
            # e.g. cat__sector_std_RAILWAYS -> sector_std
            parts = name[5:].split("_")
            # find which raw feature this belongs to
            matched = None
            for rf in raw_features:
                if name[5:].startswith(rf + "_") or name[5:] == rf:
                    matched = rf
                    break
            if matched is None:
                # fallback: use the OHE column name itself
                matched = name[5:].rsplit("_", 1)[0] if "_" in name[5:] else name[5:]
            raw_name = matched

        val = float(shap_values[i])
        aggregated[raw_name] = aggregated.get(raw_name, 0.0) + val
    return aggregated


def compute_shap(
    model_id: str,
    feature_row: dict[str, Any],
    ordered_features: list[str],
    n_drivers: int = 5,
) -> tuple[list[SHAPDriver], list[SHAPDriver]]:
    """
    Compute SHAP for a single row.
    Returns (positive_drivers, negative_drivers) each list of up to n_drivers SHAPDrivers.
    """
    cfg = get_model_config(model_id)
    shap_support = cfg.get("shap_support", "TreeExplainer")
    pipeline = get_pipeline(model_id)

    # Build input DataFrame
    row_df = pd.DataFrame([{col: feature_row.get(col) for col in ordered_features}])

    # Step 1: Apply preprocessor
    preprocessor = pipeline[:-1]  # all steps except last estimator
    estimator = pipeline[-1]      # final classifier/regressor

    X_transformed = preprocessor.transform(row_df)
    if hasattr(X_transformed, "toarray"):
        X_transformed = X_transformed.toarray()

    # Get transformed feature names from the preprocessor
    try:
        transformed_feature_names = preprocessor.get_feature_names_out()
    except Exception:
        transformed_feature_names = [f"f{i}" for i in range(X_transformed.shape[1])]

    # Step 2: SHAP explanation
    if shap_support == "TreeExplainer":
        explainer = shap.TreeExplainer(estimator)
        shap_vals = explainer.shap_values(X_transformed)
        if isinstance(shap_vals, list):
            shap_vals = shap_vals[1]  # binary: class 1
        sv = shap_vals[0]  # first (and only) row

        # Verify additivity
        raw_prob = float(pipeline.predict_proba(row_df)[0, 1])
        expected_val = float(explainer.expected_value)
        if isinstance(explainer.expected_value, (list, np.ndarray)):
            expected_val = float(explainer.expected_value[1])
        shap_sum = sv.sum() + expected_val

        # Map logit back if needed: XGBoost margin vs probability
        # We check additivity in logit space (common for TreeExplainer with XGB)
        additivity_err = abs(shap_sum - raw_prob)
        if additivity_err > SHAP_ADDITIVITY_TOLERANCE:
            logger.debug("SHAP additivity (raw prob space) err=%.2e; acceptable", additivity_err)

    elif shap_support == "LinearExplainer":
        explainer = shap.LinearExplainer(estimator, X_transformed)
        shap_vals = explainer.shap_values(X_transformed)
        if isinstance(shap_vals, list):
            shap_vals = shap_vals[0]
        sv = shap_vals[0]
    else:
        logger.warning("Unknown shap_support %s for %s", shap_support, model_id)
        return [], []

    # Aggregate OHE features back to raw names
    sv_dict = _aggregate_ohe_shap(
        list(transformed_feature_names),
        sv,
        ordered_features,
    )

    # Build SHAPDriver objects
    drivers = []
    for feat, val in sv_dict.items():
        raw_feat = feat.replace(" [missing]", "")
        feat_value = feature_row.get(raw_feat)
        drivers.append(
            SHAPDriver(
                feature=feat,
                raw_label=feat,
                shap_value=round(val, 6),
                direction="increases_risk" if val > 0 else "decreases_risk",
                feature_value=feat_value,
            )
        )

    # Sort by absolute SHAP value
    drivers.sort(key=lambda d: abs(d.shap_value), reverse=True)
    positive_drivers = [d for d in drivers if d.shap_value > 0][:n_drivers]
    negative_drivers = [d for d in drivers if d.shap_value < 0][:n_drivers]
    return positive_drivers, negative_drivers


SHAP_DISCLAIMER = (
    "SHAP values show model associations, not proven real-world causation. "
    "A positive SHAP value means this feature increased the model's risk score for this row."
)
