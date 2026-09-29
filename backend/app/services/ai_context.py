"""Grounded context builder for the AI explainer.

Collects every fact the explanation may use for one project-month, computed
by the existing frozen services (nothing is re-modelled here):

* the project's own input values, formatted with units;
* how each value compares with same-sector peers (median and percentile);
* official scores, thresholds, base rates and validation precision/recall;
* SHAP drivers for all three targets, with the actual input values;
* FCM baseline (and optional what-if) states and strongest pathways;
* the recent score trend and data-quality gaps;
* glossary entries for every term that appears.

The LLM receives only this compact dict, never the dataset.
"""
from __future__ import annotations

import math
from functools import lru_cache
from typing import Any, Optional

import numpy as np
import pandas as pd

from app.explainability.glossary import GLOSSARY
from app.services import risk_integration_service as ris
from app.services.feature_service import build_feature_dict, check_data_quality
from app.services.model_service import score_row
from app.services.project_service import get_full_df, get_project_rows_as_of
from app.services.registry_service import get_model_config, get_official_model_ids

TARGETS = ("cost", "schedule", "compound")
COMMON_FEATURES = [
    "original_cost", "planned_duration_months", "cumulative_expenditure", "cumulative_to_original_ratio",
    "months_from_original_commissioning", "exp_change_1m", "exp_change_3m", "exp_slope_3m",
    "n_cost_revisions_to_date", "n_schedule_revisions_to_date", "sector_std",
    "expenditure_available", "planned_completion_available", "sector_available",
]
CONTEXT_FIELDS = ["physical_progress_pct", "current_forecast_cost", "forecast_to_original_ratio", "reported_delay_months"]
PEER_FIELDS = [
    "original_cost", "cumulative_expenditure", "cumulative_to_original_ratio", "months_from_original_commissioning",
    "n_cost_revisions_to_date", "n_schedule_revisions_to_date", "exp_change_3m", "physical_progress_pct",
    "forecast_to_original_ratio", "reported_delay_months", "planned_duration_months",
]


# ── formatting ─────────────────────────────────────────────────────────────────

def _missing(v: Any) -> bool:
    if v is None:
        return True
    if isinstance(v, str):
        return v.strip() == "" or v.lower() == "nan"
    try:
        return bool(pd.isna(v))
    except (TypeError, ValueError):
        return False


def _num(v: Any) -> Optional[float]:
    if _missing(v):
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _indian(n: float, decimals: int = 2) -> str:
    neg = n < 0
    n = abs(n)
    whole, _, frac = f"{n:.{decimals}f}".partition(".")
    if len(whole) > 3:
        head, tail = whole[:-3], whole[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        whole = ",".join(parts + [tail])
    s = whole + (f".{frac}" if decimals else "")
    return ("-" if neg else "") + s


def fmt_value(key: str, v: Any) -> str:
    if _missing(v):
        return "not reported"
    kind = GLOSSARY.get(key, {}).get("fmt", "text")
    x = _num(v)
    if kind == "crore" and x is not None:
        return f"Rs {_indian(x)} crore"
    if kind == "ratio" and x is not None:
        return f"{x:.2f}x original cost ({x * 100:.0f}% of the original budget)"
    if kind == "pct" and x is not None:
        return f"{x:.1f}%"
    if kind == "months" and x is not None:
        return f"{x:+.0f} months" if key == "months_from_original_commissioning" else f"{x:.0f} months"
    if kind == "count" and x is not None:
        return f"{int(round(x))}"
    if kind == "flag" and x is not None:
        return "yes" if x >= 0.5 else "no"
    return str(v)


# ── cached portfolio statistics ────────────────────────────────────────────────

@lru_cache(maxsize=1)
def base_rates() -> dict[str, float]:
    df = get_full_df()
    out = {}
    for t in TARGETS:
        elig, ev = f"{t}_eligible_6m", f"{t}_event_6m"
        if elig in df.columns and ev in df.columns:
            sub = df[df[elig] == 1][ev].dropna()
            out[t] = float(sub.mean()) if len(sub) else float("nan")
    return out


def _peer_frame(sector: Optional[str], month: pd.Timestamp) -> tuple[pd.DataFrame, str]:
    df = get_full_df()
    if sector:
        same = df[(df["sector_std"] == sector) & (df["report_month"] == month)]
        if len(same) >= 25:
            return same, f"{sector.title()} projects reporting in {month:%b %Y}"
        sec = df[df["sector_std"] == sector]
        if len(sec) >= 25:
            latest = sec.sort_values("report_month").groupby("project_id").tail(1)
            return latest, f"{sector.title()} projects (latest report of each)"
    same = df[df["report_month"] == month]
    return same, f"all projects reporting in {month:%b %Y}"


def _peer_stats(row: pd.Series) -> dict[str, dict[str, Any]]:
    sector = row.get("sector_std")
    sector = sector if isinstance(sector, str) and sector and sector.lower() != "nan" else None
    peers, peer_label = _peer_frame(sector, pd.Timestamp(row["report_month"]))
    stats: dict[str, dict[str, Any]] = {}
    for f in PEER_FIELDS:
        if f not in peers.columns:
            continue
        x = _num(row.get(f))
        col = pd.to_numeric(peers[f], errors="coerce").dropna()
        if x is None or len(col) < 10:
            continue
        med = float(col.median())
        pct = float((col <= x).mean() * 100)
        stats[f] = {
            "peer_group": peer_label,
            "peer_count": int(len(col)),
            "peer_median": med,
            "peer_median_display": fmt_value(f, med),
            "percentile": round(pct, 1),
            "position": (
                "higher than almost all peers" if pct >= 95 else
                "well above most peers" if pct >= 80 else
                "above the typical peer" if pct >= 60 else
                "around the typical peer" if pct >= 40 else
                "below the typical peer" if pct >= 20 else
                "well below most peers"
            ),
        }
    return stats


def _trend(project_id: str, as_of: str, months: int = 6) -> list[dict[str, Any]]:
    rows = get_project_rows_as_of(project_id, as_of).sort_values("report_month").tail(months)
    ids = {get_model_config(m)["target"]: m for m in get_official_model_ids()}
    out = []
    for _, r in rows.iterrows():
        point = {"month": f"{r['report_month']:%Y-%m}"}
        for t, mid in ids.items():
            feats = list(get_model_config(mid)["ordered_raw_input_features"])
            try:
                point[t] = round(float(score_row(mid, build_feature_dict(r, feats))) * 100, 1)
            except Exception:  # noqa: BLE001 - trend is best-effort context
                point[t] = None
        out.append(point)
    return out


# ── main builder ───────────────────────────────────────────────────────────────

def build_context(project_id: str, as_of: Optional[str] = None,
                  fcm_overrides: Optional[dict[str, float]] = None) -> dict[str, Any]:
    if not as_of:
        rows = get_project_rows_as_of(project_id, "2100-01-01")
        if rows.empty:
            raise ris.ProjectMonthNotFound(f"Unknown project {project_id}")
        as_of = f"{rows['report_month'].max():%Y-%m-%d}"
    row = ris.load_row(project_id, as_of)

    peers = _peer_stats(row)
    facts = []
    for f in COMMON_FEATURES + CONTEXT_FIELDS:
        v = row.get(f)
        facts.append({
            "key": f,
            "label": GLOSSARY.get(f, {}).get("label", f),
            "used_by_official_models": f in COMMON_FEATURES,
            "value": None if _missing(v) else (v if isinstance(v, str) else _num(v)),
            "display": fmt_value(f, v),
            "missing": _missing(v),
            "peer": peers.get(f),
        })

    rates = base_rates()
    pred = ris.predict_block(row, "official_production")
    predictions = {}
    for t in TARGETS:
        p = pred[t]
        cfg = get_model_config(p["model_id"])
        vm = cfg.get("validation_metrics") or {}
        br = rates.get(t)
        prob = float(p["probability"])
        predictions[t] = {
            "model_id": p["model_id"],
            "score_points": round(prob * 100, 1),
            "threshold_points": round(float(p["threshold"]) * 100, 1),
            "risk_level": p["risk_level"],
            "points_above_threshold": round((prob - float(p["threshold"])) * 100, 1),
            "base_rate_pct": round(br * 100, 2) if br and not math.isnan(br) else None,
            "times_base_rate": round(prob / br, 1) if br else None,
            "validation": {
                "precision_pct": round(float(vm["precision"]) * 100, 1) if "precision" in vm else None,
                "recall_pct": round(float(vm["recall"]) * 100, 1) if "recall" in vm else None,
                "roc_auc": round(float(vm["roc_auc"]), 3) if "roc_auc" in vm else None,
                "alert_rate_pct": round(float(vm["alert_rate"]) * 100, 1) if "alert_rate" in vm else None,
            },
            "horizon_months": p["horizon_months"],
        }

    exp = ris.explanation_block(row, list(TARGETS), top_n=5)["explanations"]
    drivers = {}
    for t in TARGETS:
        e = exp[t]
        items = []
        for c in e["positive_contributors"] + e["negative_contributors"]:
            items.append({
                "feature": c["feature"],
                "label": GLOSSARY.get(c["feature"], {}).get("label", c["label"]),
                "value_display": fmt_value(c["feature"], c["value"]),
                "value_missing": bool(c["value_missing"]),
                "shap": round(float(c["shap_value"]), 4),
                "effect": "raises risk" if c["shap_value"] > 0 else "lowers risk",
                "strength": (
                    "strong" if abs(c["shap_value"]) >= 1.0 else
                    "moderate" if abs(c["shap_value"]) >= 0.3 else "slight"
                ),
                "peer": peers.get(c["feature"]),
            })
        items.sort(key=lambda d: -abs(d["shap"]))
        drivers[t] = items

    def fcm_summary(res: dict[str, Any]) -> dict[str, Any]:
        return {
            "review_status": res["review_status"],
            "states": {n["concept"]: {"label": n["label"], "role": n["role"],
                                      "state": round(float(n["final_state"]), 3),
                                      "activated": bool(n["activated"])} for n in res["nodes"]},
            "strongest_pathways": [
                {"path": " -> ".join(p.get("path", [])) if isinstance(p.get("path"), list) else str(p.get("path")),
                 "strength": round(float(p["strength"]), 3)}
                for p in res["risk_increasing_pathways"][:3]
            ],
        }

    fcm_base = fcm_summary(ris.fcm_block(row, {}, 3))
    fcm_scn = fcm_summary(ris.fcm_block(row, fcm_overrides, 3)) if fcm_overrides else None

    gaps = [{"field": w.field, "label": GLOSSARY.get(w.field, {}).get("label", w.field), "issue": w.issue}
            for w in check_data_quality(row, is_official_xgb=True)]

    terms = {"risk_score", "threshold", "base_rate", "precision", "recall", "shap_value", "fcm", "as_of_month",
             "cost_event", "schedule_event", "compound_event", "data_quality_warning"}
    for t in TARGETS:
        terms.update(d["feature"] for d in drivers[t])
    terms.update(f for f in fcm_base["states"])
    glossary = {k: GLOSSARY[k] for k in sorted(terms) if k in GLOSSARY}

    return {
        "project": {
            "project_id": project_id,
            "sector": None if _missing(row.get("sector_std")) else str(row.get("sector_std")),
            "state": None if _missing(row.get("state_std")) else str(row.get("state_std")),
            "agency": None if _missing(row.get("agency_std")) else str(row.get("agency_std")),
            "source": None if _missing(row.get("source")) else str(row.get("source")),
            "status": None if _missing(row.get("status")) else str(row.get("status")),
            "as_of_requested": as_of,
            "data_row_month": f"{pd.Timestamp(row['report_month']):%Y-%m}",
        },
        "facts": facts,
        "predictions": predictions,
        "drivers": drivers,
        "fcm_baseline": fcm_base,
        "fcm_scenario": fcm_scn,
        "fcm_overrides": fcm_overrides or {},
        "trend": _trend(project_id, as_of),
        "data_gaps": gaps,
        "glossary": glossary,
    }


def jsonable(obj: Any) -> Any:
    """Make numpy/pandas scalars JSON-serialisable."""
    if isinstance(obj, dict):
        return {k: jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [jsonable(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        f = float(obj)
        return None if math.isnan(f) else f
    if isinstance(obj, float) and math.isnan(obj):
        return None
    if isinstance(obj, (pd.Timestamp,)):
        return obj.isoformat()
    return obj
