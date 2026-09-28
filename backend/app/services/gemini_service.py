"""
Gemini AI explanation service.
Implemented ONLY after deterministic model/SHAP/FCM endpoints work.
API key is read from environment only — never from client requests, logs or endpoints.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any, Optional

from app.config import GEMINI_API_KEY, GEMINI_MODEL, GEMINI_TIMEOUT_SECONDS
from app.schemas import GeminiExplainResponse

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """
You are an AI assistant for the SIH26103 PAIMANA infrastructure risk monitoring system.
You receive structured JSON containing official risk scores, SHAP driver summaries, 
FCM scenario changes, historical comparison data, and data-quality warnings.

STRICT RULES:
- Do NOT modify any numeric values. Report them exactly as given.
- Do NOT invent missing facts or data not in the input.
- Do NOT claim causation from SHAP values. State only associations.
- Do NOT present FCM results as official model predictions or calibrated probabilities.
- Risk scores are calibrated model outputs for ranking and alerting, not guarantees.
  Report a score of 0.81 as a "risk score of 0.81", not a guaranteed outcome.
- Clearly distinguish the historical model prediction from the actual observed outcome.
- Return valid JSON only, matching the schema exactly.

Return a JSON object with exactly these fields:
{
  "summary": "2-3 sentence plain-language project risk summary",
  "main_drivers": ["list of up to 5 key factors contributing to the risk assessment"],
  "suggested_actions": ["list of up to 5 specific, actionable monitoring or intervention suggestions"],
  "limitations": ["list key limitations: model score is not a guarantee, SHAP = association not causation, FCM = simulation not prediction, and any missing-data warnings"]
}
"""

FALLBACK_RESPONSE_TEMPLATE = GeminiExplainResponse(
    project_id="",
    as_of="",
    summary="Gemini explanation unavailable. Please review the risk scores, SHAP drivers, and FCM simulation results directly.",
    main_drivers=[
        "Review the official XGBoost risk scores for cost, schedule, and compound risk.",
        "Examine the SHAP driver panel for the top factors influencing this assessment.",
    ],
    suggested_actions=[
        "Inspect the risk trajectory to understand how risk has evolved over time.",
        "Run the draft FCM what-if tool only to inspect modelled scenario changes.",
        "Contact the project monitoring team for a manual review.",
    ],
    limitations=[
        "Gemini AI explanation was unavailable at this time.",
        "Risk scores are calibrated decision-support outputs, not guarantees of outcomes.",
        "SHAP values show model associations, not proven causation.",
    ],
    source="fallback",
)


async def generate_explanation(
    project_id: str,
    as_of: str,
    official_predictions: Optional[dict] = None,
    top_drivers: Optional[dict] = None,
    fcm_changes: Optional[dict] = None,
    historical_comparison: Optional[dict] = None,
    data_quality_warnings: Optional[list] = None,
) -> GeminiExplainResponse:
    """
    Generate a Gemini explanation from already-computed structured results.
    Falls back to a deterministic template if Gemini is unavailable.
    Never sends entire datasets, never returns the API key.
    """
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set; returning fallback explanation.")
        resp = FALLBACK_RESPONSE_TEMPLATE.model_copy()
        resp.project_id = project_id
        resp.as_of = as_of
        return resp

    # Build compact structured payload (never entire datasets)
    payload = {
        "project_id": project_id,
        "as_of": as_of,
        "official_predictions": official_predictions or {},
        "top_risk_drivers": top_drivers or {},
        "fcm_scenario_changes": fcm_changes or {},
        "historical_outcome_comparison": historical_comparison or {},
        "data_quality_warnings": data_quality_warnings or [],
    }

    try:
        import google.generativeai as genai  # type: ignore
        import asyncio

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            system_instruction=SYSTEM_INSTRUCTION,
        )

        prompt = f"Analyse this infrastructure project risk assessment and respond with JSON only:\n{json.dumps(payload, indent=2)}"

        # Run synchronously in thread pool to avoid blocking event loop
        loop = asyncio.get_event_loop()
        response = await asyncio.wait_for(
            loop.run_in_executor(None, lambda: model.generate_content(prompt)),
            timeout=GEMINI_TIMEOUT_SECONDS,
        )

        # Parse JSON response
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]

        data = json.loads(text)
        return GeminiExplainResponse(
            project_id=project_id,
            as_of=as_of,
            summary=str(data.get("summary", "")),
            main_drivers=list(data.get("main_drivers", [])),
            suggested_actions=list(data.get("suggested_actions", [])),
            limitations=list(data.get("limitations", [])),
            source="gemini",
        )

    except Exception as exc:
        logger.warning("Gemini explanation failed: %s. Using fallback.", str(exc)[:200])
        resp = FALLBACK_RESPONSE_TEMPLATE.model_copy()
        resp.project_id = project_id
        resp.as_of = as_of
        return resp
