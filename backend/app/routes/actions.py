"""Actions routes: operational review queue and priority alerts."""
from fastapi import APIRouter, Query
from app.config import SCHEDULE_ALERT_TOP_N, SCHEDULE_ALERT_TOP_PERCENT
from app.schemas import OperationalPriorityResponse
from app.services.project_service import get_operational_priority_queue

router = APIRouter()


@router.get("/actions/priority-queue", response_model=OperationalPriorityResponse, tags=["Actions"])
def get_priority_queue(
    top_n: int = Query(default=SCHEDULE_ALERT_TOP_N, ge=1, le=500),
    top_pct: float = Query(default=SCHEDULE_ALERT_TOP_PERCENT, ge=0.1, le=100.0),
):
    """
    Operational priority review queue:
    Ranks projects within the active observation partition by schedule risk score.
    Separates statistical risk class (schedule_risk_score >= registry threshold of schedule_cuf_xgb (0.20) -> HIGH)
    from administrative review capacity.
    """
    return get_operational_priority_queue(top_n=top_n, top_pct=top_pct)
