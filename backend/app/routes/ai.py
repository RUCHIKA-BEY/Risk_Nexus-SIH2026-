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
    All weights are expert-defined and stored in backend/app/fcm/fcm_weights.json.
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
