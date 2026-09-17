"""Health and model status routes."""
from fastapi import APIRouter
from app.schemas import HealthResponse, ModelStatusEntry, ModelsStatusResponse
from app.services.registry_service import get_registry, registry_version, get_official_model_ids
from app.services.model_service import is_loaded

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["System"])
def health_check():
    return HealthResponse(
        status="ok",
        version="2.0.0",
        models_loaded=is_loaded(),
        official_models=get_official_model_ids(),
    )


@router.get("/models/status", response_model=ModelsStatusResponse, tags=["System"])
def models_status():
    registry = get_registry()
    entries = []
    for model_id, cfg in registry["models"].items():
        entries.append(
            ModelStatusEntry(
                model_id=model_id,
                route=cfg.get("route", "unknown"),
                official_prediction=cfg.get("official_prediction", False),
                enabled=cfg.get("enabled", False),
                benchmark_only=cfg.get("benchmark_only", False),
                threshold=cfg.get("threshold"),
                dashboard_label=cfg.get("dashboard_label"),
                status=cfg.get("status"),
            )
        )
    return ModelsStatusResponse(
        registry_version=registry_version(),
        models=entries,
    )
