"""
Pydantic schemas for all API request/response models.
"""
from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator
import re


# ── Shared primitives ───────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str = "2.0.0"
    models_loaded: bool
    official_models: list[str]


class ModelStatusEntry(BaseModel):
    model_id: str
    route: str
    official_prediction: bool
    enabled: bool
    benchmark_only: bool
    threshold: Optional[float] = None
    dashboard_label: Optional[str] = None
    status: Optional[str] = None  # e.g. "rejected_by_ablation"


class ModelsStatusResponse(BaseModel):
    registry_version: str
    models: list[ModelStatusEntry]


# ── Project schemas ─────────────────────────────────────────────────────────────

class ProjectSummary(BaseModel):
    project_id: str
    name: Optional[str] = None
    sector: Optional[str] = None
    state: Optional[str] = None
    agency: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    first_report_month: Optional[str] = None
    last_report_month: Optional[str] = None
    available_months: int = 0
    has_cost_target: bool = False
    has_schedule_target: bool = False
    has_compound_target: bool = False


class ProjectDetail(ProjectSummary):
    original_cost: Optional[float] = None
    sector_std: Optional[str] = None
    agency_std: Optional[str] = None
    state_std: Optional[str] = None


class TimelinePoint(BaseModel):
    report_month: str
    split_a: Optional[str] = None
    cost_eligible: bool = False
    schedule_eligible: bool = False
    compound_eligible: bool = False
    is_demo_eligible: bool = False


class ProjectTimelineResponse(BaseModel):
    project_id: str
    timeline: list[TimelinePoint]


# ── Risk score / prediction schemas ────────────────────────────────────────────

RISK_SCORE_DISCLAIMER = (
    "Risk scores are uncalibrated model outputs and are not literal real-world probabilities. "
    "A score of 0.81 does not mean 81% probability of overrun."
)


class SingleModelResult(BaseModel):
    model_id: str
    target: str
    risk_score: float
    threshold: float
    risk_class: str  # "HIGH" or "LOW"
    official_prediction: bool
    dashboard_label: str


class SHAPDriver(BaseModel):
    feature: str
    raw_label: str
    shap_value: float
    direction: str  # "increases_risk" or "decreases_risk"
    feature_value: Optional[Any] = None


class DataQualityWarning(BaseModel):
    field: str
    issue: str
    severity: str  # "info" | "warning" | "critical"


class OfficialPredictionResponse(BaseModel):
    project_id: str
    as_of: str
    prediction_horizon_months: int = 6
    official_predictions: dict[str, SingleModelResult]
    top_drivers: dict[str, list[SHAPDriver]] = Field(default_factory=dict)
    data_quality_warnings: list[DataQualityWarning] = Field(default_factory=list)
    priority_rank: Optional[int] = None
    requires_immediate_review: Optional[bool] = None
    disclaimer: str = RISK_SCORE_DISCLAIMER


class AnalysisPredictionResponse(BaseModel):
    project_id: str
    as_of: str
    prediction_horizon_months: int = 6
    exploratory_predictions: list[SingleModelResult]
    top_drivers: dict[str, list[SHAPDriver]] = Field(default_factory=dict)
    data_quality_warnings: list[DataQualityWarning] = Field(default_factory=list)
    label: str = "Exploratory feature analysis"
    disclaimer: str = (
        RISK_SCORE_DISCLAIMER
        + " These are exploratory results and must not replace official predictions."
    )


class BenchmarkPredictionResponse(BaseModel):
    project_id: str
    as_of: str
    prediction_horizon_months: int = 6
    benchmark_predictions: list[SingleModelResult]
    top_drivers: dict[str, list[SHAPDriver]] = Field(default_factory=dict)
    data_quality_warnings: list[DataQualityWarning] = Field(default_factory=list)
    label: str = "Original/Legacy CUF Logistic Regression Benchmark"
    panel_tenure_warning: str = (
        "These LR models use 'project_age_months' which measures panel tenure "
        "(months since first observation in the monitoring dataset), NOT true project age."
    )
    disclaimer: str = (
        RISK_SCORE_DISCLAIMER
        + " benchmark_only=true; may_replace_xgboost_predictions=false."
    )


# ── Request schemas for predict endpoints ──────────────────────────────────────

class PredictRequest(BaseModel):
    project_id: str
    as_of: str  # "YYYY-MM-DD" or "YYYY-MM"

    @field_validator("as_of")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if not re.match(r"^\d{4}-\d{2}(-\d{2})?$", v):
            raise ValueError("as_of must be YYYY-MM or YYYY-MM-DD")
        return v

    @field_validator("project_id")
    @classmethod
    def validate_project_id(cls, v: str) -> str:
        if not re.match(r"^[A-Za-z0-9_\-\.]{1,50}$", v):
            raise ValueError("Invalid project_id format")
        return v


# ── Trajectory ─────────────────────────────────────────────────────────────────

class TrajectoryPoint(BaseModel):
    report_month: str
    cost_risk_score: Optional[float] = None
    schedule_risk_score: Optional[float] = None
    compound_risk_score: Optional[float] = None
    cost_risk_class: Optional[str] = None
    schedule_risk_class: Optional[str] = None
    compound_risk_class: Optional[str] = None


class TrajectoryResponse(BaseModel):
    project_id: str
    points: list[TrajectoryPoint]
    disclaimer: str = RISK_SCORE_DISCLAIMER


# ── Actual outcome ─────────────────────────────────────────────────────────────

class OutcomeMatch(BaseModel):
    target: str
    predicted_class: str   # "HIGH" or "LOW"
    actual_event: Optional[int] = None  # 1 or 0 or None if unknown
    match_category: Optional[str] = None  # TP / TN / FP / FN
    explanation: Optional[str] = None


class ActualOutcomeResponse(BaseModel):
    project_id: str
    as_of: str
    horizon_months: int = 6
    outcomes: list[OutcomeMatch]
    eligible: bool
    note: str = (
        "Outcomes are derived from frozen Split-A test labels. "
        "They represent what actually occurred in the 6 months after the as-of date."
    )


# ── FCM schemas ────────────────────────────────────────────────────────────────

class FCMNodeInput(BaseModel):
    physical_progress_gap: Optional[float] = None
    expenditure_progress_gap: Optional[float] = None
    reported_delay_pressure: Optional[float] = None
    cost_revision_pressure: Optional[float] = None
    schedule_revision_pressure: Optional[float] = None
    forecast_cost_pressure: Optional[float] = None


class FCMSimulationRequest(BaseModel):
    project_id: str
    as_of: str
    scenario_overrides: Optional[dict[str, float]] = Field(default_factory=dict)
    iterations: int = Field(default=50, ge=1, le=500)
    convergence_tolerance: float = Field(default=1e-6, ge=1e-10, le=1e-2)

    @field_validator("scenario_overrides")
    @classmethod
    def validate_overrides(cls, v: dict) -> dict:
        for key, val in (v or {}).items():
            if not isinstance(val, (int, float)):
                raise ValueError(f"Scenario value for {key} must be numeric")
            if not (0.0 <= float(val) <= 1.0):
                raise ValueError(f"Scenario value for {key} must be in [0, 1]")
        return v


class FCMEdge(BaseModel):
    source: str
    target: str
    weight: float
    basis: str


class FCMSimulationResponse(BaseModel):
    project_id: str
    as_of: str
    baseline: dict[str, float]
    scenario: dict[str, float]
    changes: dict[str, float]
    edges: list[FCMEdge]
    iterations_to_convergence: int
    converged: bool
    disclaimer: str = (
        "Expert-weighted scenario simulation; not an official model prediction or causal estimate. "
        "FCM outputs must never be presented as calibrated probabilities."
    )


# ── Gemini / AI explanation schemas ────────────────────────────────────────────

class GeminiExplainRequest(BaseModel):
    project_id: str
    as_of: str
    official_predictions: Optional[dict] = None
    top_drivers: Optional[dict] = None
    fcm_changes: Optional[dict] = None
    historical_comparison: Optional[dict] = None
    data_quality_warnings: Optional[list] = None


class GeminiExplainResponse(BaseModel):
    project_id: str
    as_of: str
    summary: str
    main_drivers: list[str]
    suggested_actions: list[str]
    limitations: list[str]
    source: str = "gemini"  # or "fallback"
    disclaimer: str = (
        "This explanation is AI-generated. Risk scores are model outputs, not calibrated probabilities. "
        "SHAP values show model associations, not proven causation. "
        "FCM outputs are scenario simulations, not official predictions."
    )


# ── Full-Stack Dynamic API Schemas ─────────────────────────────────────────────

class PaginatedProjectsResponse(BaseModel):
    items: list[ProjectSummary]
    total: int
    page: int
    page_size: int
    total_pages: int


class PortfolioMetricsResponse(BaseModel):
    total_projects: int
    total_budget: float
    total_expenditure: float
    ongoing_count: int
    completed_count: int
    high_risk_schedule_count: int
    high_risk_cost_count: int
    high_risk_compound_count: int
    sectors_count: int
    states_count: int
    active_escalations: int = 0


class SectorWiseData(BaseModel):
    sector: str
    project_count: int
    original_cost: float
    revised_cost: float
    expenditure: float


class StateWiseData(BaseModel):
    state: str
    project_count: int
    original_cost: float
    high_risk_count: int


class AnalyticsOverviewResponse(BaseModel):
    total_projects: int
    total_observations: int
    sector_distribution: list[SectorWiseData]
    state_distribution: list[StateWiseData]
    status_distribution: dict[str, int]
    risk_distribution: dict[str, int]
    cost_overview: list[dict]
    progress_distribution: list[dict]


class OperationalPriorityItem(BaseModel):
    project_id: str
    sector: Optional[str] = None
    state: Optional[str] = None
    status: Optional[str] = None
    as_of: Optional[str] = None
    schedule_risk_score: float
    schedule_threshold: float = 0.63
    priority_rank: int
    requires_immediate_review: bool
    cost_risk_score: Optional[float] = None
    compound_risk_score: Optional[float] = None


class OperationalPriorityResponse(BaseModel):
    items: list[OperationalPriorityItem]
    total_flagged: int
    top_n_capacity: int
    top_pct_capacity: float
    disclaimer: str = RISK_SCORE_DISCLAIMER


class CompareProjectsRequest(BaseModel):
    project_ids: list[str]


class CompareProjectItem(BaseModel):
    project_id: str
    name: Optional[str] = None
    sector: Optional[str] = None
    state: Optional[str] = None
    status: Optional[str] = None
    as_of: Optional[str] = None
    original_cost: Optional[float] = None
    current_forecast_cost: Optional[float] = None
    cumulative_expenditure: Optional[float] = None
    physical_progress_pct: Optional[float] = None
    reported_delay_months: Optional[float] = None
    cost_risk_score: Optional[float] = None
    schedule_risk_score: Optional[float] = None
    compound_risk_score: Optional[float] = None
    cost_risk_class: Optional[str] = None
    schedule_risk_class: Optional[str] = None
    compound_risk_class: Optional[str] = None


class CompareProjectsResponse(BaseModel):
    projects: list[CompareProjectItem]
    disclaimer: str = RISK_SCORE_DISCLAIMER
