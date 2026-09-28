"""FCM weight configuration.

Source of truth: app/fcm/fcm_weights.json (unchanged). Its metadata marks the
weights DRAFT_NOT_DOMAIN_APPROVED; they are expert-defined, configurable
assumptions and were not learned from data or derived from SHAP.

Sign convention:
    +w : higher source activation pushes the target concept up
    -w : higher source activation pushes the target concept down (protective)
The current draft contains only positive weights.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from app.fcm.concepts import CONCEPTS

WEIGHTS_PATH = Path(__file__).with_name("fcm_weights.json")


@dataclass(frozen=True)
class FCMConfig:
    nodes: list[str]
    edges: list[dict[str, Any]]
    W: np.ndarray            # W[i, j] = weight of nodes[i] -> nodes[j]
    damping: float
    activation: str
    update_rule: str
    review_status: str
    version: str             # sha256 of the JSON file (first 12 hex chars)


def load_config(path: Path = WEIGHTS_PATH) -> FCMConfig:
    raw = path.read_bytes()
    cfg = json.loads(raw)
    nodes: list[str] = list(cfg["nodes"])
    unknown = [n for n in nodes if n not in CONCEPTS]
    if unknown:
        raise ValueError(f"FCM config has nodes without a concept definition: {unknown}")
    idx = {n: i for i, n in enumerate(nodes)}
    W = np.zeros((len(nodes), len(nodes)))
    seen = set()
    for e in cfg["edges"]:
        s, t, w = e["source"], e["target"], float(e["weight"])
        if s not in idx or t not in idx:
            raise ValueError(f"FCM edge references unknown node: {s} -> {t}")
        if not -1.0 <= w <= 1.0:
            raise ValueError(f"FCM weight {w} for {s} -> {t} is outside [-1, 1]")
        if (s, t) in seen:
            raise ValueError(f"Duplicate FCM edge {s} -> {t}")
        if s == t:
            raise ValueError(f"Self-loop {s} -> {t} is not allowed")
        seen.add((s, t))
        W[idx[s], idx[t]] = w
    meta = cfg.get("metadata", {})
    damping = float(meta.get("damping", 0.5))
    if not 0.0 < damping <= 1.0:
        raise ValueError("FCM damping must be in (0, 1]")
    return FCMConfig(
        nodes=nodes,
        edges=list(cfg["edges"]),
        W=W,
        damping=damping,
        activation=str(meta.get("activation", "sigmoid")),
        update_rule=str(meta.get("update_rule", "")),
        review_status=str(meta.get("review_status", "UNKNOWN")),
        version=hashlib.sha256(raw).hexdigest()[:12],
    )
