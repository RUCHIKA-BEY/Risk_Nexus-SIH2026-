"""Analytics routes: portfolio distributions, sector stats, cost and progress breakdowns."""
from fastapi import APIRouter
from app.schemas import AnalyticsOverviewResponse
from app.services.project_service import get_analytics_overview

router = APIRouter()


@router.get("/analytics/overview", response_model=AnalyticsOverviewResponse, tags=["Analytics"])
def get_overview():
    """Returns aggregated distributions and portfolio trends calculated from live data."""
    return get_analytics_overview()
