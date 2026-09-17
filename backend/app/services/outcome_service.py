"""
Outcome service: returns the actual six-month outcomes for a project at a given as-of date.
Outcomes are stored in the frozen Split-A test labels and are only revealed on explicit request.
The actual-outcome endpoint is SEPARATE from the prediction endpoint.
"""
from __future__ import annotations

import logging
from typing import Optional

import pandas as pd

from app.schemas import ActualOutcomeResponse, OutcomeMatch
from app.services.project_service import get_project_rows

logger = logging.getLogger(__name__)

THRESHOLDS = {
    "cost_cuf_xgb": 0.88,
    "schedule_cuf_xgb": 0.63,
    "compound_cuf_xgb": 0.885,
}

TARGETS = {
    "cost": "cost_event_6m",
    "schedule": "schedule_event_6m",
    "compound": "compound_event_6m",
}

ELIGIBLE = {
    "cost": "cost_eligible_6m",
    "schedule": "schedule_eligible_6m",
    "compound": "compound_eligible_6m",
}


def _match_category(predicted_class: str, actual_event: Optional[int]) -> Optional[str]:
    if actual_event is None:
        return None
    if predicted_class == "HIGH" and actual_event == 1:
        return "TP"
    if predicted_class == "LOW" and actual_event == 0:
        return "TN"
    if predicted_class == "HIGH" and actual_event == 0:
        return "FP"
    return "FN"


def _match_explanation(match_cat: Optional[str], target: str) -> str:
    explanations = {
        "TP": f"True Positive: the model predicted HIGH {target} risk, and a {target} adverse event did occur within 6 months.",
        "TN": f"True Negative: the model predicted LOW {target} risk, and no adverse event occurred within 6 months.",
        "FP": f"False Positive: the model predicted HIGH {target} risk, but no adverse event occurred within 6 months.",
        "FN": f"False Negative: the model predicted LOW {target} risk, but a {target} adverse event did occur within 6 months.",
    }
    return explanations.get(match_cat, "Outcome comparison unavailable.")


def get_actual_outcome(
    project_id: str,
    as_of: str,
    predicted_classes: dict[str, str],  # {target: "HIGH"/"LOW"}
) -> ActualOutcomeResponse:
    """
    Return the actual six-month outcomes for a project at as_of.
    predicted_classes is from the official prediction for this project/as-of.
    The outcomes are read from the FROZEN Split-A labels.
    """
    rows = get_project_rows(project_id)
    if rows.empty:
        return ActualOutcomeResponse(
            project_id=project_id,
            as_of=as_of,
            outcomes=[],
            eligible=False,
            note="Project not found in demo dataset.",
        )

    as_of_dt = pd.to_datetime(as_of)
    row = rows[rows["report_month"] == as_of_dt]
    if row.empty:
        # Use the closest row at or before as_of
        prior = rows[rows["report_month"] <= as_of_dt]
        if prior.empty:
            return ActualOutcomeResponse(
                project_id=project_id,
                as_of=as_of,
                outcomes=[],
                eligible=False,
                note=f"No data found at or before {as_of}.",
            )
        row = prior.iloc[[-1]]

    r = row.iloc[0]
    outcomes: list[OutcomeMatch] = []
    any_eligible = False

    for target, target_col in TARGETS.items():
        elig_col = ELIGIBLE[target]
        is_eligible = int(r.get(elig_col, 0)) == 1 if elig_col in rows.columns else False

        if not is_eligible:
            outcomes.append(OutcomeMatch(
                target=target,
                predicted_class=predicted_classes.get(target, "LOW"),
                actual_event=None,
                match_category=None,
                explanation=f"This row is not in the eligible {target} population for Split-A (censored or not applicable).",
            ))
            continue

        any_eligible = True
        actual = None
        if target_col in rows.columns:
            raw = r.get(target_col)
            if raw is not None and not (hasattr(raw, "__float__") and pd.isna(float(raw))):
                actual = int(float(raw))

        pred_class = predicted_classes.get(target, "LOW")
        match_cat = _match_category(pred_class, actual)
        outcomes.append(OutcomeMatch(
            target=target,
            predicted_class=pred_class,
            actual_event=actual,
            match_category=match_cat,
            explanation=_match_explanation(match_cat, target),
        ))

    return ActualOutcomeResponse(
        project_id=project_id,
        as_of=as_of,
        outcomes=outcomes,
        eligible=any_eligible,
    )
