"""
Feature service: validates, assembles, and derives features
for a single project at a given as-of date.

Key invariant: only data from rows with report_month <= as_of is used.
No future-row look-ahead. No target columns are exposed.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import numpy as np
import pandas as pd

from app.schemas import DataQualityWarning
from app.services.model_service import FORBIDDEN_PREDICTORS, OFFICIAL_XGB_FEATURES

logger = logging.getLogger(__name__)

# Required for a meaningful official prediction (not all must be present, but warn when missing)
IMPORTANT_NUMERIC = [
    "original_cost", "current_forecast_cost", "cumulative_expenditure",
    "planned_duration_months",
]
IMPORTANT_CATEGORICAL = ["sector_std"]


def get_row_as_of(
    project_df: pd.DataFrame,
    as_of: str,
) -> Optional[pd.Series]:
    """
    Return the project's data row at exactly report_month == as_of.
    If not found, return the most recent row before as_of.
    Never uses any row after as_of.
    """
    as_of_dt = pd.to_datetime(as_of)
    eligible = project_df[project_df["report_month"] <= as_of_dt]
    if eligible.empty:
        return None
    return eligible.sort_values("report_month").iloc[-1]


def get_prior_rows(
    project_df: pd.DataFrame,
    as_of: str,
) -> pd.DataFrame:
    """All rows strictly before as_of, sorted chronologically. No future data."""
    as_of_dt = pd.to_datetime(as_of)
    return project_df[project_df["report_month"] < as_of_dt].sort_values("report_month")


def build_feature_dict(
    row: pd.Series,
    features: list[str],
) -> dict[str, Any]:
    """
    Extract the requested features from a row.
    Forbidden predictor columns are stripped.
    """
    result: dict[str, Any] = {}
    for col in features:
        if col in FORBIDDEN_PREDICTORS:
            continue
        val = row.get(col, np.nan)
        # Convert numpy types to Python scalars for JSON serialisability
        if pd.isna(val) if not isinstance(val, str) else False:
            result[col] = None
        elif isinstance(val, (np.integer,)):
            result[col] = int(val)
        elif isinstance(val, (np.floating,)):
            result[col] = float(val)
        else:
            result[col] = val
    return result


def check_data_quality(
    row: pd.Series,
    is_official_xgb: bool = True,
) -> list[DataQualityWarning]:
    warnings: list[DataQualityWarning] = []

    for field in IMPORTANT_NUMERIC:
        val = row.get(field)
        if pd.isna(val) if not isinstance(val, str) else False:
            warnings.append(DataQualityWarning(
                field=field,
                issue=f"{field} is missing; imputed with training-set median.",
                severity="warning",
            ))

    sector = row.get("sector_std")
    if pd.isna(sector) if not isinstance(sector, str) else (not sector or sector == "nan"):
        warnings.append(DataQualityWarning(
            field="sector_std",
            issue="sector_std is missing; one-hot encoding will use the 'unknown'/'infrequent' bucket.",
            severity="info",
        ))

    phys = row.get("physical_progress_pct")
    phys_avail = row.get("physical_progress_available", 0)
    if not phys_avail or (pd.isna(phys) if not isinstance(phys, str) else False):
        warnings.append(DataQualityWarning(
            field="physical_progress_pct",
            issue="physical_progress_pct unavailable at this reporting month.",
            severity="info",
        ))

    return warnings


def apply_e3_feature(prior_rows: pd.DataFrame, current_row: pd.Series) -> float | None:
    """Compute Schedule_Slippage_Velocity_T = delay[T] - delay[T-1]."""
    if prior_rows.empty:
        return None
    prev = prior_rows.iloc[-1]
    curr_delay = pd.to_numeric(current_row.get("reported_delay_months"), errors="coerce")
    prev_delay = pd.to_numeric(prev.get("reported_delay_months"), errors="coerce")
    if pd.isna(curr_delay) or pd.isna(prev_delay):
        return None
    return float(curr_delay - prev_delay)


def apply_e4_feature(prior_rows: pd.DataFrame, current_row: pd.Series) -> float | None:
    """Compute Cost_Escalation_Velocity_T = escalation[T] - escalation[T-1]."""
    if prior_rows.empty:
        return None

    def escalation(r):
        oc = pd.to_numeric(r.get("original_cost"), errors="coerce")
        fc = pd.to_numeric(r.get("current_forecast_cost"), errors="coerce")
        if pd.isna(oc) or pd.isna(fc) or oc <= 0:
            return np.nan
        return (fc - oc) / oc

    curr_e = escalation(current_row)
    prev_e = escalation(prior_rows.iloc[-1])
    if pd.isna(curr_e) or pd.isna(prev_e):
        return None
    return float(curr_e - prev_e)
