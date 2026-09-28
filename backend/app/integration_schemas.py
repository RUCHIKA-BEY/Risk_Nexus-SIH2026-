"""Response schemas for the RiskNexus integration layer (ML + SHAP + FCM).

These schemas are additive: the existing /predict/*, /simulate/fcm and
/projects/* contracts used by the current frontend are unchanged.
Schema stability is enforced by tests/test_integration_layer.py against
tests/snapshots/integration_schemas.json.
"""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

TargetName = Literal["cost", "schedule", "compound"]

ML_DISCLAIMER = (
    "Calibrated 6-month risk probabilities from the frozen Phase 6 XGBoost models. "
    "They support ranking and alerting; they are not guarantees of project outcomes."
)
SHAP_DISCLAIMER = (
    "SHAP values are exact TreeSHAP contributions to the frozen XGBoost raw score (log-odds) "
    "before sigmoid calibration. Direction and ranking carry over to the calibrated probability "
    "because calibration is monotonic increasing, but SHAP values are not probability points. "
    "SHAP describes model associations, not causes."
)
FCM_DISCLAIMER = (
    "Expert-defined DRAFT fuzzy cognitive map (not domain-approved). It is a scenario and "
    "reasoning aid, separate from the ML prediction. Its states are not probabilities and its "
    "pathways do not establish causality."
)


# ── Requests ───────────────────────────────────────────────────────────────────

class RiskRequest(BaseModel):
    project_id: str
    as_of: str = Field(..., description="Reporting month T, 'YYYY-MM' or 'YYYY-MM-DD'. Only rows <= T are used.")


class ExplainRequest(RiskRequest):
    targets: list[TargetName] = Field(default_factory=lambda: ["cost", "schedule", "compound"])
    top_n: int = Field(default=5, ge=1, le=14)


class FCMRequest(RiskRequest):
    scenario_overrides: dict[str, float] = Field(
        default_factory=dict, description="Input-concept overrides in [0, 1]. Output concepts cannot be overridden."
    )
    max_pathways: int = Field(default=5, ge=1, le=20)


class AssessRequest(RiskRequest):
    include_benchmark: bool = True
    include_fcm: bool = True
    scenario_overrides: dict[str, float] = Field(default_factory=dict)
    top_n: int = Field(default=5, ge=1, le=14)


# ── ML ─────────────────────────────────────────────────────────────────────────

class ModelPrediction(BaseModel):
    target: TargetName
    model_id: str
    model_name: Literal["XGBoost", "LogisticRegression"]
    feature_set: Literal["COMMON", "ENHANCED"]
    probability: float
    threshold: float
    risk: bool = Field(..., description="probability >= threshold (threshold is fixed server-side)")
    risk_level: Literal["HIGH", "LOW"]
    official_prediction: bool
    horizon_months: int = 6


class MLBlock(BaseModel):
    role: Literal["official_production", "benchmark_only"]
    cost: ModelPrediction
    schedule: ModelPrediction
    compound: ModelPrediction
    disclaimer: str


# ── SHAP ───────────────────────────────────────────────────────────────────────

class Contributor(BaseModel):
    rank: int = Field(..., description="1 = largest |SHAP| among all raw features for this prediction")
    feature: str
    label: str
    value: Optional[Any] = Field(None, description="Raw input value at T; null means missing (imputed by the frozen preprocessor)")
    value_missing: bool
    shap_value: float
    abs_shap_value: float
    direction: Literal["increasing_risk", "decreasing_risk"]


class TargetExplanation(BaseModel):
    target: TargetName
    model_id: str
    probability: float
    threshold: float
    risk: bool
    expected_value: float = Field(..., description="TreeSHAP base value (log-odds)")
    raw_margin: float = Field(..., description="XGBoost raw output (log-odds) = expected_value + sum(SHAP)")
    shap_sum: float
    additivity_error: float
    positive_contributors: list[Contributor]
    negative_contributors: list[Contributor]


class ExplanationBlock(BaseModel):
    method: str = "XGBoost native TreeSHAP (pred_contribs); identical to shap.TreeExplainer"
    explanations: dict[str, TargetExplanation]
    disclaimer: str = SHAP_DISCLAIMER


# ── FCM ────────────────────────────────────────────────────────────────────────

class FCMNodeState(BaseModel):
    concept: str
    label: str
    role: Literal["input", "intermediate", "output"]
    initial_state: float
    final_state: float
    activated: bool
    clamped: bool


class FCMEdgeState(BaseModel):
    source: str
    target: str
    weight: float
    relationship: Literal["positive", "negative"]
    basis: str
    influence: float = Field(..., description="final_state(source) * weight")


class FCMPathway(BaseModel):
    path: list[str]
    weights: list[float]
    source_state: float
    strength: float = Field(..., description="source_state * product(weights)")
    relationship: Literal["risk_increasing", "protective"]
    ends_at: str


class FCMBlock(BaseModel):
    config_version: str
    review_status: str
    activation_threshold: float
    nodes: list[FCMNodeState]
    edges: list[FCMEdgeState]
    activated_concepts: list[str]
    risk_increasing_pathways: list[FCMPathway]
    protective_pathways: list[FCMPathway]
    pathway_note: Optional[str] = None
    propagated_risk_state: dict[str, float]
    scenario_overrides: dict[str, float]
    iterations: int
    converged: bool
    disclaimer: str = FCM_DISCLAIMER


class FCMGraphResponse(BaseModel):
    config_version: str
    review_status: str
    nodes: list[dict[str, Any]]
    edges: list[FCMEdgeState]
    node_order: list[str]
    weight_matrix: list[list[float]] = Field(..., description="W[i][j] = weight of edge node_order[i] -> node_order[j]")
    update_rule: str
    activation: str
    damping: float
    input_normalisation: dict[str, str]
    disclaimer: str = FCM_DISCLAIMER


# ── Combined responses ────────────────────────────────────────────────────────

class RiskPredictResponse(BaseModel):
    project_id: str
    as_of: str
    data_row_month: str
    ml: MLBlock
    benchmark: Optional[MLBlock] = None


class RiskExplainResponse(BaseModel):
    project_id: str
    as_of: str
    data_row_month: str
    ml: MLBlock
    shap: ExplanationBlock


class RiskFCMResponse(BaseModel):
    project_id: str
    as_of: str
    data_row_month: str
    fcm: FCMBlock


class RiskAssessResponse(BaseModel):
    project_id: str
    as_of: str
    data_row_month: str
    ml: MLBlock
    shap: ExplanationBlock
    fcm: Optional[FCMBlock] = None
    benchmark: Optional[MLBlock] = None
    note: str = "ML, SHAP and FCM are independent layers; the FCM never alters the ML probabilities."


class ModelInfoEntry(BaseModel):
    model_id: str
    target: TargetName
    model_name: Literal["XGBoost", "LogisticRegression"]
    role: Literal["official_production", "benchmark_only"]
    feature_set: Literal["COMMON", "ENHANCED"]
    threshold: float
    selected_config: Optional[str] = None
    selected_C: Optional[float] = None
    ordered_features: list[str]
    artifact_sha256: str
    source_frozen_sha256: Optional[str] = None
    validation_metrics: dict[str, float] = Field(default_factory=dict)


class ModelInfoResponse(BaseModel):
    registry_version: str
    routing_source: str
    production: list[ModelInfoEntry]
    benchmark: list[ModelInfoEntry]
    excluded_legacy_features: list[str]
    dataset: dict[str, Any] = Field(..., description="Loaded scoring dataset: mode, path, sha256, sha256_verified, rows, projects")
    runtime: dict[str, str]
