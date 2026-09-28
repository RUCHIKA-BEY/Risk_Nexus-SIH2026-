"""FCM concepts (nodes) and the construction of their initial states.

Node set, roles and input normalisation rules are copied unchanged from the
existing draft (app/fcm/fcm_weights.json + app/services/fcm_service.py).
They are EXPERT-DEFINED DRAFT assumptions awaiting domain approval
(see FCM_DOMAIN_APPROVAL_TEMPLATE.md). Nothing here is learned from data.

Only the row at reporting month T is read; no target, eligibility, censoring
or split column is used.
"""
from __future__ import annotations

import math
from typing import Any, Mapping

CONCEPTS: dict[str, dict[str, str]] = {
    "physical_progress_gap": {
        "label": "Physical progress gap",
        "role": "input",
        "description": "Share of physical progress not yet achieved at T.",
    },
    "expenditure_progress_gap": {
        "label": "Expenditure pressure",
        "role": "input",
        "description": "Cumulative spend relative to original cost at T.",
    },
    "reported_delay_pressure": {
        "label": "Reported delay pressure",
        "role": "input",
        "description": "Source-reported delay at T.",
    },
    "cost_revision_pressure": {
        "label": "Cost revision pressure",
        "role": "input",
        "description": "Count of cost revisions up to T.",
    },
    "schedule_revision_pressure": {
        "label": "Schedule revision pressure",
        "role": "input",
        "description": "Count of schedule revisions up to T.",
    },
    "forecast_cost_pressure": {
        "label": "Forecast cost pressure",
        "role": "input",
        "description": "Forecast cost above original cost at T.",
    },
    "schedule_pressure": {
        "label": "Schedule pressure",
        "role": "intermediate",
        "description": "Aggregated pressure on the schedule.",
    },
    "cost_pressure": {
        "label": "Cost pressure",
        "role": "intermediate",
        "description": "Aggregated pressure on cost.",
    },
    "intervention_priority": {
        "label": "Intervention priority",
        "role": "output",
        "description": "Overall propagated need for review/intervention.",
    },
}

INPUT_CONCEPTS: tuple[str, ...] = tuple(k for k, v in CONCEPTS.items() if v["role"] == "input")
RISK_CONCEPTS: tuple[str, ...] = ("cost_pressure", "schedule_pressure", "intervention_priority")

# Human-readable statement of each (draft) normalisation rule.
INPUT_NORMALISATION: dict[str, str] = {
    "physical_progress_gap": "clip(1 - physical_progress_pct/100, 0, 1) if physical_progress_available else 0.5",
    "expenditure_progress_gap": "clip(cumulative_to_original_ratio / 3, 0, 1); missing ratio -> 0.5 before scaling",
    "reported_delay_pressure": "clip(reported_delay_months / 60, 0, 1); missing -> 0",
    "cost_revision_pressure": "clip(n_cost_revisions_to_date / 5, 0, 1); missing -> 0",
    "schedule_revision_pressure": "clip(n_schedule_revisions_to_date / 5, 0, 1); missing -> 0",
    "forecast_cost_pressure": "clip((forecast_to_original_ratio - 1) / 2, 0, 1); missing ratio -> 1 before scaling",
    "schedule_pressure": "initial = mean(reported_delay_pressure, schedule_revision_pressure)",
    "cost_pressure": "initial = mean(expenditure_progress_gap, cost_revision_pressure)",
    "intervention_priority": "initial = mean(schedule_pressure, cost_pressure)",
    "no_row_at_T": "every concept = 0.5",
}

SOURCE_COLUMNS: tuple[str, ...] = (
    "physical_progress_pct", "physical_progress_available", "cumulative_to_original_ratio",
    "reported_delay_months", "n_cost_revisions_to_date", "n_schedule_revisions_to_date",
    "forecast_to_original_ratio",
)


def _num(value: Any, default: float) -> float:
    try:
        f = float(value)
    except (TypeError, ValueError):
        return default
    return default if math.isnan(f) else f


def _clip01(x: float) -> float:
    return max(0.0, min(1.0, x))


def initial_state(row: Mapping[str, Any] | None, nodes: list[str]) -> dict[str, float]:
    """Initial activation for every concept, from the row at T (identical to fcm_service)."""
    state: dict[str, float] = {}
    if row is not None:
        pct = _num(row.get("physical_progress_pct"), 0.0)
        avail = _num(row.get("physical_progress_available"), 0.0)
        state["physical_progress_gap"] = _clip01(1.0 - pct / 100.0) if avail else 0.5
        state["expenditure_progress_gap"] = _clip01(_num(row.get("cumulative_to_original_ratio"), 0.5) / 3.0)
        state["reported_delay_pressure"] = _clip01(_num(row.get("reported_delay_months"), 0.0) / 60.0)
        state["cost_revision_pressure"] = _clip01(_num(row.get("n_cost_revisions_to_date"), 0.0) / 5.0)
        state["schedule_revision_pressure"] = _clip01(_num(row.get("n_schedule_revisions_to_date"), 0.0) / 5.0)
        state["forecast_cost_pressure"] = _clip01((_num(row.get("forecast_to_original_ratio"), 1.0) - 1.0) / 2.0)
    else:
        for node in nodes:
            state[node] = 0.5
    state.setdefault("schedule_pressure", (state.get("reported_delay_pressure", 0.5) + state.get("schedule_revision_pressure", 0.5)) / 2.0)
    state.setdefault("cost_pressure", (state.get("expenditure_progress_gap", 0.5) + state.get("cost_revision_pressure", 0.5)) / 2.0)
    state.setdefault("intervention_priority", (state.get("schedule_pressure", 0.5) + state.get("cost_pressure", 0.5)) / 2.0)
    return {node: state.get(node, 0.5) for node in nodes}
