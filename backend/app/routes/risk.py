"""Integration-layer routes (additive; existing routes are unchanged).

GET  /api/v1/model-info      routing, thresholds, feature order, hashes, runtime
POST /api/v1/risk/predict    official XGBoost predictions (+ optional LR benchmark)
POST /api/v1/risk/explain    XGBoost predictions + TreeSHAP contributors
POST /api/v1/risk/fcm        FCM reasoning / scenario for a project-month
GET  /api/v1/fcm/graph       FCM concepts, edges and weight matrix
POST /api/v1/risk/assess     ML + SHAP + FCM (+ benchmark) in one response
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.integration_schemas import (
    AssessRequest,
    ExplainRequest,
    FCMGraphResponse,
    FCMRequest,
    ModelInfoResponse,
    RiskAssessResponse,
    RiskExplainResponse,
    RiskFCMResponse,
    RiskPredictResponse,
    RiskRequest,
)
from app.services import risk_integration_service as svc

router = APIRouter()


def _row(req: RiskRequest):
    try:
        return svc.load_row(req.project_id, req.as_of)
    except svc.ProjectMonthNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/model-info", response_model=ModelInfoResponse, tags=["Integration"])
def model_info():
    return svc.model_info()


@router.post("/risk/predict", response_model=RiskPredictResponse, tags=["Integration"])
def risk_predict(req: RiskRequest, include_benchmark: bool = Query(False)):
    row = _row(req)
    return {
        "project_id": req.project_id,
        "as_of": req.as_of,
        "data_row_month": svc.row_month(row),
        "ml": svc.predict_block(row, "official_production"),
        "benchmark": svc.predict_block(row, "benchmark_only") if include_benchmark else None,
    }


@router.post("/risk/explain", response_model=RiskExplainResponse, tags=["Integration"])
def risk_explain(req: ExplainRequest):
    row = _row(req)
    return {
        "project_id": req.project_id,
        "as_of": req.as_of,
        "data_row_month": svc.row_month(row),
        "ml": svc.predict_block(row, "official_production"),
        "shap": svc.explanation_block(row, list(dict.fromkeys(req.targets)), req.top_n),
    }


@router.post("/risk/fcm", response_model=RiskFCMResponse, tags=["Integration"])
def risk_fcm(req: FCMRequest):
    row = _row(req)
    try:
        fcm = svc.fcm_block(row, req.scenario_overrides, req.max_pathways)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return {"project_id": req.project_id, "as_of": req.as_of, "data_row_month": svc.row_month(row), "fcm": fcm}


@router.get("/fcm/graph", response_model=FCMGraphResponse, tags=["Integration"])
def fcm_graph():
    return svc.fcm_graph()


@router.post("/risk/assess", response_model=RiskAssessResponse, tags=["Integration"])
def risk_assess(req: AssessRequest):
    row = _row(req)
    try:
        fcm = svc.fcm_block(row, req.scenario_overrides, 5) if req.include_fcm else None
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return {
        "project_id": req.project_id,
        "as_of": req.as_of,
        "data_row_month": svc.row_month(row),
        "ml": svc.predict_block(row, "official_production"),
        "shap": svc.explanation_block(row, list(svc.TARGETS), req.top_n),
        "fcm": fcm,
        "benchmark": svc.predict_block(row, "benchmark_only") if req.include_benchmark else None,
    }
