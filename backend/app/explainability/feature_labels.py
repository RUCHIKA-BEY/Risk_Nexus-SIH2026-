"""Human-readable labels for the raw model input features.

Technical names are never changed; this dictionary only maps them to display
labels. Meanings follow feature_dictionary_corrected.csv (Phase 6 handoff).
"""
from __future__ import annotations

FEATURE_LABELS: dict[str, str] = {
    # COMMON (used by all three production XGBoost models)
    "original_cost": "Original approved cost (Rs crore)",
    "planned_duration_months": "Planned duration (months)",
    "cumulative_expenditure": "Cumulative expenditure to date (Rs crore)",
    "cumulative_to_original_ratio": "Expenditure as share of original cost",
    "months_from_original_commissioning": "Months past (+) / before (-) original commissioning date",
    "exp_change_1m": "Expenditure change, last 1 month",
    "exp_change_3m": "Expenditure change, last 3 months",
    "exp_slope_3m": "Expenditure trend (3-month slope)",
    "n_cost_revisions_to_date": "Number of cost revisions to date",
    "n_schedule_revisions_to_date": "Number of schedule revisions to date",
    "sector_std": "Sector",
    "expenditure_available": "Expenditure reported this month",
    "planned_completion_available": "Planned completion date available",
    "sector_available": "Sector recorded",
    # ENHANCED extras (used only by the LR cost benchmark)
    "current_forecast_cost": "Current forecast cost (Rs crore)",
    "forecast_to_original_ratio": "Forecast cost / original cost",
    "reported_delay_months": "Reported delay at T (months)",
    "forecast_change_1m": "Forecast-cost change, last 1 month",
    "forecast_change_3m": "Forecast-cost change, last 3 months",
    "forecast_slope_3m": "Forecast-cost trend (3-month slope)",
    "delay_change_1m": "Reported-delay change, last 1 month",
    "delay_change_3m": "Reported-delay change, last 3 months",
    "delay_slope_3m": "Reported-delay trend (3-month slope)",
    "delay_available": "Delay reported this month",
    "current_anticipated_completion_available": "Anticipated completion date available",
}


def label_for(feature: str) -> str:
    """Return the display label; unknown names fall back to the technical name."""
    return FEATURE_LABELS.get(feature, feature)
