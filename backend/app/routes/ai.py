"""
AI and FCM routes.
POST /api/v1/simulate/fcm  — FCM what-if scenario simulator
POST /api/v1/ai/explain    — Gemini plain-language explanation
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas import FCMSimulationRequest, FCMSimulationResponse, GeminiExplainRequest, GeminiExplainResponse
from app.services.fcm_service import run_fcm_simulation
from app.services.gemini_service import generate_explanation

router = APIRouter()


@router.post("/simulate/fcm", response_model=FCMSimulationResponse, tags=["FCM"])
def fcm_simulate(req: FCMSimulationRequest):
    """
    Run a Fuzzy Cognitive Map scenario simulation.
    FCM is a SCENARIO SIMULATOR only — it never modifies or replaces official XGBoost predictions.
    Current weights are a clearly labelled draft stored in backend/app/fcm/fcm_weights.json
    and must be domain-approved before any operational interpretation.
    """
    try:
        result = run_fcm_simulation(
            project_id=req.project_id,
            as_of=req.as_of,
            scenario_overrides=req.scenario_overrides or {},
            iterations=req.iterations,
            convergence_tolerance=req.convergence_tolerance,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"FCM simulation error: {exc}")


@router.post("/ai/explain", response_model=GeminiExplainResponse, tags=["AI"])
async def ai_explain(req: GeminiExplainRequest):
    """
    Generate a plain-language Gemini explanation from already-computed results.
    The API key is read from the backend environment only — never from client requests.
    Falls back to a deterministic template if Gemini is unavailable.
    """
    result = await generate_explanation(
        project_id=req.project_id,
        as_of=req.as_of,
        official_predictions=req.official_predictions,
        top_drivers=req.top_drivers,
        fcm_changes=req.fcm_changes,
        historical_comparison=req.historical_comparison,
        data_quality_warnings=req.data_quality_warnings,
    )
    return result


# ── Deep AI explanation, REX assistant and glossary (AI upgrade) ───────────────
from app.explainability.glossary import glossary_list  # noqa: E402
from app.services.ai_explainer_service import (  # noqa: E402
    AskRequest, AskResponse, DeepExplanationRequest, DeepExplanationResponse, ask, deep_explanation,
)
from app.services.risk_integration_service import ProjectMonthNotFound  # noqa: E402


@router.post("/ai/explain/deep", response_model=DeepExplanationResponse, tags=["AI"])
async def ai_explain_deep(req: DeepExplanationRequest):
    """Term-by-term explanation grounded on the project's own values, peer comparison,
    base rates, SHAP drivers, FCM and trend. Uses Gemini when GEMINI_API_KEY is set,
    otherwise a deterministic rule-based explainer with the same output shape."""
    try:
        return await deep_explanation(req)
    except ProjectMonthNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/ai/ask", response_model=AskResponse, tags=["AI"])
async def ai_ask(req: AskRequest):
    """REX assistant: answers questions about terms, pages and (optionally) a specific project."""
    return await ask(req)


@router.get("/ai/glossary", tags=["AI"])
def ai_glossary():
    """Every term shown in the dashboard with its exact meaning, used by the (i) tooltips."""
    return {"terms": glossary_list()}
