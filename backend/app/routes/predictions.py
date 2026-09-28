"""
Prediction routes: official, analysis (exploratory), and benchmark (LR).
POST /api/v1/predict/official
POST /api/v1/predict/analysis
POST /api/v1/predict/benchmark
"""
from __future__ import annotations
import logging
from fastapi import APIRouter, HTTPException

from app.schemas import (
    PredictRequest,
    OfficialPredictionResponse,
    AnalysisPredictionResponse,
    BenchmarkPredictionResponse,
    SingleModelResult,
)
from app.services.registry_service import (
    get_official_model_ids,
    get_analysis_model_ids,
    get_benchmark_model_ids,
    get_model_config,
)
from app.services.model_service import score_row, classify, OFFICIAL_XGB_FEATURES
from app.services.feature_service import (
    build_feature_dict, check_data_quality,
    apply_e3_feature, apply_e4_feature,
)
from app.services.project_service import get_project_rows_as_of, get_project_rows
from app.services.shap_service import compute_shap

logger = logging.getLogger(__name__)
router = APIRouter()

def _get_project_row_data(project_id: str, as_of: str):
    rows = get_project_rows_as_of(project_id, as_of)
    if rows.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No data for project {project_id} at or before {as_of}."
        )
    return rows.sort_values("report_month").iloc[-1], rows


@router.post("/predict/official", response_model=OfficialPredictionResponse, tags=["Predictions"])
def predict_official(req: PredictRequest):
    """
    Frozen corrected Phase 6 XGBoost predictions. No benchmark or exploratory model is involved.
    """
    row, prior_rows = _get_project_row_data(req.project_id, req.as_of)
    feature_dict = build_feature_dict(row, OFFICIAL_XGB_FEATURES)
    warnings = check_data_quality(row, is_official_xgb=True)
    official_predictions: dict[str, SingleModelResult] = {}
    top_drivers: dict = {}

    for model_id in get_official_model_ids():
        cfg = get_model_config(model_id)
        threshold = cfg["threshold"]
        score = score_row(model_id, feature_dict)
        risk_class = classify(score, threshold)
        target = cfg["target"]

        official_predictions[target] = SingleModelResult(
            model_id=model_id,
            target=target,
            risk_score=round(score, 6),
            threshold=threshold,
            risk_class=risk_class,
            official_prediction=True,
            dashboard_label=cfg.get("dashboard_label", "Official XGBoost risk"),
        )

        # SHAP
        try:
            pos_d, neg_d = compute_shap(model_id, feature_dict, OFFICIAL_XGB_FEATURES, n_drivers=5)
            top_drivers[target] = pos_d[:3] + neg_d[:2]
        except Exception as exc:
            logger.warning("SHAP failed for %s: %s", model_id, exc)

    return OfficialPredictionResponse(
        project_id=req.project_id,
        as_of=req.as_of,
        official_predictions=official_predictions,
        top_drivers=top_drivers,
        data_quality_warnings=warnings,
    )


@router.post("/predict/analysis", response_model=AnalysisPredictionResponse, tags=["Predictions"])
def predict_analysis(req: PredictRequest):
    """
    Exploratory analysis route. The frozen Phase 6 registry has NO analysis models
    (analysis_route is empty), so this returns an empty list. Kept for the existing frontend.
    official_prediction=false. Must not replace or be blended with official results.
    """
    row, prior_rows = _get_project_row_data(req.project_id, req.as_of)
    feature_dict = build_feature_dict(row, OFFICIAL_XGB_FEATURES)
    warnings = check_data_quality(row, is_official_xgb=True)

    # Compute E3/E4 features from history
    e3_val = apply_e3_feature(prior_rows.iloc[:-1] if len(prior_rows) > 1 else prior_rows[0:0], row)
    e4_val = apply_e4_feature(prior_rows.iloc[:-1] if len(prior_rows) > 1 else prior_rows[0:0], row)

    exploratory_predictions: list[SingleModelResult] = []
    top_drivers: dict = {}

    for model_id in get_analysis_model_ids():
        cfg = get_model_config(model_id)
        threshold = cfg["threshold"]
        ordered_features = cfg.get("ordered_raw_input_features", OFFICIAL_XGB_FEATURES)
        feat_dict = dict(feature_dict)

        # Add experiment-specific features
        fe = cfg.get("feature_engineering")
        if fe == "E3" and e3_val is not None:
            feat_dict["Schedule_Slippage_Velocity_T"] = e3_val
        elif fe == "E4" and e4_val is not None:
            feat_dict["Cost_Escalation_Velocity_T"] = e4_val
        elif fe == "E1":
            # E1 requires TVM features — not available without TVM dataset
            # Mark as unavailable in this demo
            exploratory_predictions.append(
                SingleModelResult(
                    model_id=model_id,
                    target=cfg["target"],
                    risk_score=0.0,
                    threshold=threshold,
                    risk_class="UNAVAILABLE",
                    official_prediction=False,
                    dashboard_label="Exploratory feature analysis (TVM features not available in demo)",
                )
            )
            continue

        score = score_row(model_id, feat_dict)
        risk_class = classify(score, threshold)

        exploratory_predictions.append(
            SingleModelResult(
                model_id=model_id,
                target=cfg["target"],
                risk_score=round(score, 6),
                threshold=threshold,
                risk_class=risk_class,
                official_prediction=False,
                dashboard_label=cfg.get("dashboard_label", "Exploratory feature analysis"),
            )
        )

        try:
            pos_d, neg_d = compute_shap(model_id, feat_dict, ordered_features, n_drivers=3)
            top_drivers[model_id] = pos_d + neg_d
        except Exception as exc:
            logger.warning("SHAP failed for %s: %s", model_id, exc)

    return AnalysisPredictionResponse(
        project_id=req.project_id,
        as_of=req.as_of,
        exploratory_predictions=exploratory_predictions,
        top_drivers=top_drivers,
        data_quality_warnings=warnings,
    )


@router.post("/predict/benchmark", response_model=BenchmarkPredictionResponse, tags=["Predictions"])
def predict_benchmark(req: PredictRequest):
    """
    Frozen corrected Phase 6 LR benchmark predictions.
    benchmark_only=true; may_replace_xgboost_predictions=false.
    """
    row, _ = _get_project_row_data(req.project_id, req.as_of)
    feature_dict = build_feature_dict(row, get_model_config("cost_cuf_lr")["ordered_raw_input_features"])
    warnings = check_data_quality(row, is_official_xgb=False)

    benchmark_predictions: list[SingleModelResult] = []
    top_drivers: dict = {}

    for model_id in get_benchmark_model_ids():
        cfg = get_model_config(model_id)
        threshold = cfg["threshold"]
        ordered_features = cfg["ordered_raw_input_features"]

        try:
            score = score_row(model_id, feature_dict)
        except Exception as exc:
            logger.warning("Benchmark score failed for %s: %s", model_id, exc)
            continue

        risk_class = classify(score, threshold)

        benchmark_predictions.append(
            SingleModelResult(
                model_id=model_id,
                target=cfg["target"],
                risk_score=round(score, 6),
                threshold=threshold,
                risk_class=risk_class,
                official_prediction=False,
                dashboard_label=cfg.get("dashboard_label", "Original/Legacy CUF Logistic Regression Benchmark"),
            )
        )

        # LR stays a benchmark. Defensible LinearSHAP requires a frozen,
        # representative background set, which is not part of this handoff.

    return BenchmarkPredictionResponse(
        project_id=req.project_id,
        as_of=req.as_of,
        benchmark_predictions=benchmark_predictions,
        top_drivers=top_drivers,
        data_quality_warnings=warnings,
    )
