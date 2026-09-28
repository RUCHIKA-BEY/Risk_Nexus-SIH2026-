"""
SIH26103 — FastAPI Backend: main application entry point.

Startup sequence:
1. Load model registry and validate routing invariants.
2. Load and hash-verify all enabled model pipelines (once, not per-request).
3. Load demo dataset.
4. Mount all routers under /api/v1.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import ALLOWED_ORIGINS, LOG_LEVEL, REQUEST_MAX_SIZE_BYTES
from app.services.registry_service import load_registry
from app.services.model_service import load_all_models
from app.services.project_service import load_demo_data

# Routes
from app.routes.health import router as health_router
from app.routes.projects import router as projects_router
from app.routes.predictions import router as predictions_router
from app.routes.simulations import router as simulations_router
from app.routes.ai import router as ai_router
from app.routes.analytics import router as analytics_router
from app.routes.actions import router as actions_router
from app.routes.risk import router as risk_router

logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger(__name__)

API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load registry, models, and demo data. Shutdown: nothing required."""
    logger.info("=== SIH26103 Backend Startup ===")
    logger.info("Step 1: Loading model registry...")
    load_registry()

    logger.info("Step 2: Loading and hash-verifying model pipelines...")
    load_all_models()

    logger.info("Step 3: Loading canonical dataset...")
    # Fails loudly (DatasetConfigurationError) if the dataset is missing or altered.
    load_demo_data()

    logger.info("=== Startup complete. Official models: cost_cuf_xgb, schedule_cuf_xgb, compound_cuf_xgb ===")
    yield
    logger.info("=== SIH26103 Backend Shutdown ===")


app = FastAPI(
    title="SIH26103 — PAIMANA Risk Monitoring API",
    description=(
        "Official infrastructure project risk monitoring API. "
        "Production models: cost_cuf_xgb, schedule_cuf_xgb, compound_cuf_xgb. "
        "Risk scores are calibrated model outputs for ranking and alerting, not guarantees of outcomes."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


# ── Request size guard ─────────────────────────────────────────────────────────
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    if request.headers.get("content-length"):
        content_length = int(request.headers["content-length"])
        if content_length > REQUEST_MAX_SIZE_BYTES:
            return JSONResponse(
                status_code=413,
                content={"detail": f"Request body too large (max {REQUEST_MAX_SIZE_BYTES} bytes)"},
            )
    return await call_next(request)


# ── Exception handlers ─────────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", str(exc), exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Check server logs."},
    )


# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(health_router, prefix=API_PREFIX)
app.include_router(projects_router, prefix=API_PREFIX)
app.include_router(predictions_router, prefix=API_PREFIX)
app.include_router(simulations_router, prefix=API_PREFIX)
app.include_router(ai_router, prefix=API_PREFIX)
app.include_router(analytics_router, prefix=API_PREFIX)
app.include_router(actions_router, prefix=API_PREFIX)
app.include_router(risk_router, prefix=API_PREFIX)


@app.get("/", tags=["Root"])
def root():
    return {
        "name": "SIH26103 PAIMANA Risk Monitoring API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": f"{API_PREFIX}/health",
        "official_models": ["cost_cuf_xgb", "schedule_cuf_xgb", "compound_cuf_xgb"],
        "disclaimer": "Risk scores are calibrated model outputs for ranking and alerting, not guarantees of outcomes.",
    }
