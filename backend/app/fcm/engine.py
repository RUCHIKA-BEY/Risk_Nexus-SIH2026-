"""Deterministic FCM propagation and pathway analysis.

Update rule (unchanged from the existing draft, fcm_weights.json metadata):
    anchor_i       = logit(A0_i)                         (A0 clipped to [1e-6, 1-1e-6])
    candidate_i    = sigmoid(anchor_i + sum_j W[j, i] * A_j)
    A_next         = (1 - damping) * A + damping * candidate
    input concepts are clamped to A0 at every step; all states clipped to [0, 1]
Termination: max |A_next - A| < tolerance (default 1e-6) or max_iterations (default 50).

A concept is "activated" when its final state is strictly above 0.5, the
sigmoid midpoint (0.5 is also the neutral value used when an input is absent).

Pathway strength (for explanation only, not a probability):
    strength(path) = final_state(path[0]) * prod(edge weights along the path)
    Paths are simple (no repeated concept), start at an input concept and end at
    a risk concept (cost_pressure, schedule_pressure, intervention_priority).
    strength > 0 -> risk-increasing, strength < 0 -> protective.

There is no randomness anywhere; identical inputs give identical outputs.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Mapping

import numpy as np

from app.fcm.concepts import CONCEPTS, INPUT_CONCEPTS, RISK_CONCEPTS, initial_state
from app.fcm.weights import FCMConfig, load_config

DEFAULT_ACTIVATION_THRESHOLD = 0.5


def _sigmoid(x: float) -> float:
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    e = math.exp(x)
    return e / (1.0 + e)


def _logit(v: float) -> float:
    c = min(max(float(v), 1e-6), 1.0 - 1e-6)
    return math.log(c / (1.0 - c))


@dataclass
class PropagationResult:
    initial: dict[str, float]
    final: dict[str, float]
    iterations: int
    converged: bool


def propagate(
    config: FCMConfig,
    initial: Mapping[str, float],
    clamped: set[str] | frozenset[str] = frozenset(INPUT_CONCEPTS),
    max_iterations: int = 50,
    tolerance: float = 1e-6,
) -> PropagationResult:
    nodes, W, d = config.nodes, config.W, config.damping
    A0 = np.array([float(initial[n]) for n in nodes])
    if np.any((A0 < 0) | (A0 > 1)):
        raise ValueError("Initial FCM states must be in [0, 1]")
    anchor = np.array([_logit(v) for v in A0])
    mask = np.array([n in clamped for n in nodes])
    A = A0.copy()
    converged, step = False, 0
    for step in range(max_iterations):
        candidate = np.array([_sigmoid(anchor[i] + float(W[:, i].T @ A)) for i in range(len(nodes))])
        A_next = (1.0 - d) * A + d * candidate
        A_next[mask] = A0[mask]
        A_next = np.clip(A_next, 0.0, 1.0)
        delta = float(np.max(np.abs(A_next - A)))
        A = A_next
        if delta < tolerance:
            converged = True
            break
    return PropagationResult(
        initial={n: float(v) for n, v in zip(nodes, A0)},
        final={n: float(v) for n, v in zip(nodes, A)},
        iterations=step + 1,
        converged=converged,
    )


def enumerate_pathways(config: FCMConfig, states: Mapping[str, float]) -> list[dict[str, Any]]:
    idx = {n: i for i, n in enumerate(config.nodes)}
    out_edges: dict[str, list[tuple[str, float]]] = {n: [] for n in config.nodes}
    for e in config.edges:
        out_edges[e["source"]].append((e["target"], float(e["weight"])))
    for n in out_edges:  # deterministic traversal order
        out_edges[n].sort(key=lambda t: idx[t[0]])

    paths: list[dict[str, Any]] = []

    def walk(path: list[str], weights: list[float]) -> None:
        here = path[-1]
        if len(path) > 1 and here in RISK_CONCEPTS:
            src = states[path[0]]
            strength = src * math.prod(weights)
            paths.append({
                "path": list(path),
                "weights": list(weights),
                "source_state": src,
                "strength": strength,
                "relationship": "risk_increasing" if strength >= 0 else "protective",
                "ends_at": here,
            })
        for nxt, w in out_edges[here]:
            if nxt not in path:
                walk(path + [nxt], weights + [w])

    for start in config.nodes:
        if start in INPUT_CONCEPTS:
            walk([start], [])
    paths.sort(key=lambda p: (-abs(p["strength"]), p["path"]))
    return paths


def reason(
    row: Mapping[str, Any] | None,
    scenario_overrides: Mapping[str, float] | None = None,
    max_pathways: int = 5,
    activation_threshold: float = DEFAULT_ACTIVATION_THRESHOLD,
    config: FCMConfig | None = None,
) -> dict[str, Any]:
    """Full FCM reasoning for one project-month (optionally with a scenario)."""
    config = config or load_config()
    init = initial_state(row, config.nodes)
    overrides: dict[str, float] = {}
    for node, value in (scenario_overrides or {}).items():
        if node not in CONCEPTS:
            raise ValueError(f"Unknown FCM concept: {node}")
        if node not in INPUT_CONCEPTS:
            raise ValueError(f"Only input concepts can be overridden, not {node}")
        overrides[node] = max(0.0, min(1.0, float(value)))
    init.update(overrides)

    result = propagate(config, init)
    final = result.final
    pathways = enumerate_pathways(config, final)
    positive = [p for p in pathways if p["strength"] > 0][:max_pathways]
    protective = [p for p in pathways if p["strength"] < 0][:max_pathways]
    note = None
    if not any(float(e["weight"]) < 0 for e in config.edges):
        note = "The current draft weight set has no negative edges, so no protective pathway can exist."

    nodes = [{
        "concept": n,
        "label": CONCEPTS[n]["label"],
        "role": CONCEPTS[n]["role"],
        "initial_state": result.initial[n],
        "final_state": final[n],
        "activated": final[n] > activation_threshold,
        "clamped": n in INPUT_CONCEPTS,
    } for n in config.nodes]
    edges = [{
        "source": e["source"],
        "target": e["target"],
        "weight": float(e["weight"]),
        "relationship": "positive" if float(e["weight"]) >= 0 else "negative",
        "basis": e.get("basis", ""),
        "influence": final[e["source"]] * float(e["weight"]),
    } for e in config.edges]

    return {
        "config_version": config.version,
        "review_status": config.review_status,
        "activation_threshold": activation_threshold,
        "nodes": nodes,
        "edges": edges,
        "activated_concepts": [n["concept"] for n in nodes if n["activated"]],
        "risk_increasing_pathways": positive,
        "protective_pathways": protective,
        "pathway_note": note,
        "propagated_risk_state": {c: final[c] for c in RISK_CONCEPTS},
        "scenario_overrides": overrides,
        "iterations": result.iterations,
        "converged": result.converged,
    }
