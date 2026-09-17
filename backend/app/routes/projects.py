"""Project routes: list (paginated/filtered/demo), detail, timeline, assessment, metrics, comparison."""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.schemas import (
    ProjectDetail,
    ProjectTimelineResponse,
    PaginatedProjectsResponse,
    PortfolioMetricsResponse,
    CompareProjectsRequest,
    CompareProjectsResponse,
    OfficialPredictionResponse,
    SingleModelResult,
    TrajectoryResponse,
)
from app.services.project_service import (
    list_projects_paginated,
    get_project_detail,
    get_project_timeline,
    get_project_rows,
    get_project_rows_as_of,
    get_portfolio_metrics,
    compare_projects,
)
from app.services.model_service import score_row, classify, OFFICIAL_XGB_FEATURES
from app.services.registry_service import get_model_config, get_official_model_ids
from app.services.feature_service import build_feature_dict, check_data_quality
from app.services.shap_service import compute_shap

router = APIRouter()


@router.get("/projects", tags=["Projects"])
def get_projects(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
    search: Optional[str] = Query(default=None),
    sector: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    sort_by: Optional[str] = Query(default=None),
    sort_dir: str = Query(default="asc"),
    demo: bool = Query(default=False),
):
    """
    Exposes projects with pagination, searching, filtering, and demo toggling.
    Default exposes the entire available project population.
    """
    res = list_projects_paginated(
        page=page,
        page_size=page_size,
        search=search,
        sector=sector,
        state=state,
        status=status,
        sort_by=sort_by,
        sort_dir=sort_dir,
        demo_only=demo,
    )
    # Include both 'items' and 'projects' keys for backwards compatibility
    return {
        "items": res.items,
        "projects": res.items,
        "total": res.total,
        "page": res.page,
        "page_size": res.page_size,
        "total_pages": res.total_pages,
    }


@router.get("/projects/metrics", response_model=PortfolioMetricsResponse, tags=["Projects"])
@router.get("/dashboard/metrics", response_model=PortfolioMetricsResponse, tags=["Projects"])
def get_metrics():
    """Returns dynamic KPI metrics calculated across the active canonical dataset."""
    return get_portfolio_metrics()


@router.post("/projects/compare", response_model=CompareProjectsResponse, tags=["Projects"])
def compare_selected_projects(req: CompareProjectsRequest):
    """Compares multiple infrastructure projects side-by-side with official risk scores."""
    return compare_projects(req.project_ids)


@router.get("/projects/{project_id}", response_model=ProjectDetail, tags=["Projects"])
def get_project(project_id: str):
    project = get_project_detail(project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found.")
    return project


@router.get("/projects/{project_id}/timeline", response_model=ProjectTimelineResponse, tags=["Projects"])
def get_timeline(project_id: str):
    timeline = get_project_timeline(project_id)
    if not timeline:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found.")
    return timeline


@router.get("/projects/{project_id}/trajectory", response_model=TrajectoryResponse, tags=["Projects"])
def get_trajectory_route(project_id: str):
    from app.services.project_service import get_project_trajectory
    trajectory = get_project_trajectory(project_id)
    if not trajectory:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found.")
    return trajectory


@router.get("/projects/{project_id}/assessment", response_model=OfficialPredictionResponse, tags=["Projects"])
def get_assessment(project_id: str, as_of: Optional[str] = Query(default=None)):
    """
    Official risk assessment for a project at a given as-of month.
    Uses only information available at or before as_of. 
    Never reads future rows during prediction.
    If as_of is omitted, automatically resolves to the latest available reporting month.
    """
    if as_of:
        rows = get_project_rows_as_of(project_id, as_of)
        if rows.empty:
            if get_project_rows(project_id).empty:
                raise HTTPException(status_code=404, detail=f"Project {project_id} not found.")
            raise HTTPException(status_code=404, detail=f"No data for project {project_id} at or before {as_of}.")
    else:
        rows_all = get_project_rows(project_id)
        if rows_all.empty:
            raise HTTPException(status_code=404, detail=f"Project {project_id} not found.")
        latest_dt = rows_all["report_month"].max()
        as_of = latest_dt.strftime("%Y-%m-%d")
        rows = rows_all[rows_all["report_month"] <= latest_dt].copy()

    row = rows.sort_values("report_month").iloc[-1]
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

        # SHAP drivers
        try:
            pos_drivers, neg_drivers = compute_shap(
                model_id, feature_dict, OFFICIAL_XGB_FEATURES, n_drivers=5
            )
            top_drivers[target] = pos_drivers[:3] + neg_drivers[:2]
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning("SHAP failed for %s: %s", model_id, exc)

    return OfficialPredictionResponse(
        project_id=project_id,
        as_of=as_of,
        official_predictions=official_predictions,
        top_drivers=top_drivers,
        data_quality_warnings=warnings,
    )


@router.get("/projects/{project_id}/actual-outcome", tags=["Projects"])
def get_actual_outcome_route(project_id: str, as_of: Optional[str] = Query(default=None)):
    """
    Reveal the actual six-month outcomes. SEPARATE from /assessment.
    The predicted_classes must be provided by the client (from a prior /assessment call).
    This endpoint does NOT re-run predictions.
    """
    if as_of:
        rows = get_project_rows_as_of(project_id, as_of)
        if rows.empty:
            raise HTTPException(status_code=404, detail=f"No data for {project_id} at {as_of}.")
    else:
        rows_all = get_project_rows(project_id)
        if rows_all.empty:
            raise HTTPException(status_code=404, detail=f"Project {project_id} not found.")
        latest_dt = rows_all["report_month"].max()
        as_of = latest_dt.strftime("%Y-%m-%d")

    from app.services.outcome_service import get_actual_outcome
    result = get_actual_outcome(project_id, as_of, predicted_classes={})
    return result
