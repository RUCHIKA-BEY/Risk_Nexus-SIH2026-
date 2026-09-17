"""
Risk trajectory route: computes official risk scores for all eligible
historical months of a project, using only data available at each T.
"""
from __future__ import annotations

import logging

import pandas as pd
from fastapi import APIRouter, HTTPException

from app.schemas import TrajectoryResponse, TrajectoryPoint
from app.services.project_service import get_project_rows
from app.services.model_service import score_row, classify, OFFICIAL_XGB_FEATURES
from app.services.feature_service import build_feature_dict
from app.services.registry_service import get_official_model_ids, get_model_config

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/projects/{project_id}/trajectory", response_model=TrajectoryResponse, tags=["Trajectory"])
def get_risk_trajectory(project_id: str):
    """
    Compute the full risk trajectory for a project.
    Each point uses only data available at or before that reporting month (no look-ahead).
    """
    rows = get_project_rows(project_id)
    if rows.empty:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found.")

    points: list[TrajectoryPoint] = []
    official_ids = get_official_model_ids()

    for idx, (_, row) in enumerate(rows.sort_values("report_month").iterrows()):
        # Only use rows up to and including this report_month (anti-leakage)
        as_of = row["report_month"]
        prior_rows = rows[rows["report_month"] <= as_of]

        current_row = prior_rows.iloc[-1]
        feature_dict = build_feature_dict(current_row, OFFICIAL_XGB_FEATURES)

        point_data: dict = {
            "report_month": as_of.strftime("%Y-%m-%d"),
        }

        for model_id in official_ids:
            cfg = get_model_config(model_id)
            threshold = cfg["threshold"]
            target = cfg["target"]
            try:
                score = score_row(model_id, feature_dict)
                risk_class = classify(score, threshold)
                point_data[f"{target}_risk_score"] = round(score, 6)
                point_data[f"{target}_risk_class"] = risk_class
            except Exception as exc:
                logger.warning("Trajectory score failed month=%s model=%s: %s", as_of, model_id, exc)
                point_data[f"{target}_risk_score"] = None
                point_data[f"{target}_risk_class"] = None

        points.append(TrajectoryPoint(**point_data))

    return TrajectoryResponse(project_id=project_id, points=points)
