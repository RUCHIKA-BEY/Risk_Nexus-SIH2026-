"""
FCM (Fuzzy Cognitive Map) simulation service.
Deterministic, bounded, convergence-checked scenario simulator.
FCM NEVER modifies or replaces official XGBoost predictions.
"""
from __future__ import annotations

import json
import logging
import math
from pathlib import Path
from typing import Any, Optional

import numpy as np

from app.schemas import FCMEdge, FCMSimulationResponse
from app.services.feature_service import get_row_as_of
from app.services.project_service import get_project_rows

logger = logging.getLogger(__name__)

FCM_WEIGHTS_PATH = Path(__file__).parent.parent / "fcm" / "fcm_weights.json"

FCM_DISCLAIMER = (
    "Draft expert-weighted scenario simulation; not an official model prediction, calibrated "
    "probability, or causal estimate. Weights and normalisation rules require domain approval."
)

INPUT_NODES = frozenset({
    "physical_progress_gap", "expenditure_progress_gap",
    "reported_delay_pressure", "cost_revision_pressure",
    "schedule_revision_pressure", "forecast_cost_pressure",
})


def _sigmoid(x: float) -> float:
    """Numerically stable sigmoid."""
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    exp_x = math.exp(x)
    return exp_x / (1.0 + exp_x)


def _logit(value: float) -> float:
    """Stable inverse sigmoid for an activation in [0, 1]."""
    clipped = min(max(float(value), 1e-6), 1.0 - 1e-6)
    return math.log(clipped / (1.0 - clipped))


def _load_fcm_config() -> dict[str, Any]:
    with open(FCM_WEIGHTS_PATH) as f:
        return json.load(f)


def _validate_weights(edges: list[dict]) -> None:
    for edge in edges:
        w = edge.get("weight", 0.0)
        if not (-1.0 <= w <= 1.0):
            raise ValueError(f"FCM weight {w} for edge {edge['source']}->{edge['target']} out of range [-1, 1]")


def _build_weight_matrix(nodes: list[str], edges: list[dict]) -> np.ndarray:
    n = len(nodes)
    idx = {name: i for i, name in enumerate(nodes)}
    W = np.zeros((n, n), dtype=float)
    for edge in edges:
        src, tgt = edge["source"], edge["target"]
        w = float(edge["weight"])
        if src not in idx or tgt not in idx:
            raise ValueError(f"Unknown FCM node: {src} or {tgt}")
        W[idx[src], idx[tgt]] = w
    return W


def _derive_baseline_state(
    project_id: str,
    as_of: str,
    nodes: list[str],
) -> dict[str, float]:
    """
    Derive initial node states from project features at as-of.
    All states are normalised to [0, 1].
    """
    rows = get_project_rows(project_id)
    row = get_row_as_of(rows, as_of) if not rows.empty else None

    state: dict[str, float] = {}

    def safe_float(v, default=0.0):
        try:
            return float(v) if v is not None and not math.isnan(float(v)) else default
        except Exception:
            return default

    if row is not None:
        # physical_progress_gap: proportion of progress missing (1 - pct/100, clipped)
        pct = safe_float(row.get("physical_progress_pct"))
        avail = safe_float(row.get("physical_progress_available"))
        state["physical_progress_gap"] = max(0.0, min(1.0, 1.0 - pct / 100.0)) if avail else 0.5

        # expenditure_progress_gap: cumulative_to_original_ratio clipped
        c2o = safe_float(row.get("cumulative_to_original_ratio"), 0.5)
        state["expenditure_progress_gap"] = max(0.0, min(1.0, c2o / 3.0))

        # reported_delay_pressure: delay months normalised
        delay = safe_float(row.get("reported_delay_months"), 0.0)
        state["reported_delay_pressure"] = max(0.0, min(1.0, delay / 60.0))

        # cost_revision_pressure
        n_cost_rev = safe_float(row.get("n_cost_revisions_to_date"), 0.0)
        state["cost_revision_pressure"] = max(0.0, min(1.0, n_cost_rev / 5.0))

        # schedule_revision_pressure
        n_sched_rev = safe_float(row.get("n_schedule_revisions_to_date"), 0.0)
        state["schedule_revision_pressure"] = max(0.0, min(1.0, n_sched_rev / 5.0))

        # forecast_cost_pressure
        f2o = safe_float(row.get("forecast_to_original_ratio"), 1.0)
        state["forecast_cost_pressure"] = max(0.0, min(1.0, (f2o - 1.0) / 2.0))
    else:
        # No data available: use neutral states
        for node in nodes:
            state[node] = 0.5

    # Output nodes: derive from input nodes (they'll be updated by FCM)
    state.setdefault("schedule_pressure", (state.get("reported_delay_pressure", 0.5) + state.get("schedule_revision_pressure", 0.5)) / 2.0)
    state.setdefault("cost_pressure", (state.get("expenditure_progress_gap", 0.5) + state.get("cost_revision_pressure", 0.5)) / 2.0)
    state.setdefault("intervention_priority", (state.get("schedule_pressure", 0.5) + state.get("cost_pressure", 0.5)) / 2.0)

    return {node: state.get(node, 0.5) for node in nodes}


def _run_fcm(
    initial_state: dict[str, float],
    nodes: list[str],
    W: np.ndarray,
    iterations: int,
    convergence_tolerance: float,
    frozen_nodes: Optional[set[str]] = None,
    damping: float = 0.5,
) -> tuple[dict[str, float], int, bool]:
    """
    Run an anchored, damped FCM iteration.

    Candidate endogenous state = sigmoid(logit(initial state) + W.T @ state).
    Damping reduces oscillation, and frozen exogenous nodes remain fixed throughout.
    """
    if not (0.0 < damping <= 1.0):
        raise ValueError("FCM damping must be in (0, 1]")
    frozen_nodes = frozen_nodes or set()
    A = np.array([initial_state[n] for n in nodes], dtype=float)
    anchor = np.array([_logit(initial_state[n]) for n in nodes], dtype=float)
    frozen_mask = np.array([n in frozen_nodes for n in nodes])

    converged = False
    for step in range(iterations):
        candidate = np.array([
            _sigmoid(anchor[i] + float(W[:, i].T @ A))
            for i in range(len(nodes))
        ])
        A_next = (1.0 - damping) * A + damping * candidate
        # Clamp frozen nodes
        A_next[frozen_mask] = np.array([initial_state[n] for n in nodes])[frozen_mask]
        # Clamp all to [0, 1]
        A_next = np.clip(A_next, 0.0, 1.0)

        delta = np.max(np.abs(A_next - A))
        A = A_next
        if delta < convergence_tolerance:
            converged = True
            break

    final = {nodes[i]: round(float(A[i]), 6) for i in range(len(nodes))}
    return final, step + 1, converged


def run_fcm_simulation(
    project_id: str,
    as_of: str,
    scenario_overrides: dict[str, float],
    iterations: int = 50,
    convergence_tolerance: float = 1e-6,
) -> FCMSimulationResponse:
    cfg = _load_fcm_config()
    nodes: list[str] = cfg["nodes"]
    edges: list[dict] = cfg["edges"]

    _validate_weights(edges)
    W = _build_weight_matrix(nodes, edges)

    # Derive baseline state from project data
    baseline_init = _derive_baseline_state(project_id, as_of, nodes)

    damping = float(cfg.get("metadata", {}).get("damping", 0.5))

    # Project measurements are exogenous and must not drift during propagation.
    baseline_state, baseline_iters, baseline_conv = _run_fcm(
        baseline_init, nodes, W, iterations, convergence_tolerance,
        frozen_nodes=set(INPUT_NODES), damping=damping,
    )

    # Apply scenario overrides (input nodes only, clamped to [0,1])
    scenario_init = dict(baseline_init)
    for node, val in (scenario_overrides or {}).items():
        if node not in nodes:
            raise ValueError(f"Unknown FCM node: {node}")
        if node not in INPUT_NODES:
            raise ValueError(f"FCM output node cannot be directly overridden: {node}")
        scenario_init[node] = float(max(0.0, min(1.0, val)))

    # Every exogenous input is clamped in both baseline and scenario runs.
    scenario_state, scenario_iters, scenario_conv = _run_fcm(
        scenario_init, nodes, W, iterations, convergence_tolerance,
        frozen_nodes=set(INPUT_NODES), damping=damping,
    )

    # Compute changes
    changes = {
        node: round(scenario_state[node] - baseline_state[node], 6)
        for node in nodes
    }

    fcm_edges = [
        FCMEdge(
            source=e["source"],
            target=e["target"],
            weight=float(e["weight"]),
            basis=e.get("basis", "expert-defined"),
        )
        for e in edges
    ]

    return FCMSimulationResponse(
        project_id=project_id,
        as_of=as_of,
        baseline=baseline_state,
        scenario=scenario_state,
        changes=changes,
        edges=fcm_edges,
        iterations_to_convergence=max(baseline_iters, scenario_iters),
        converged=baseline_conv and scenario_conv,
        disclaimer=FCM_DISCLAIMER,
    )
