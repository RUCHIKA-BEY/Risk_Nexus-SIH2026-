"""
Script to select demo projects from the frozen Split-A test partition.
Selects:
  - At least one cost True Positive
  - At least one schedule True Positive
  - At least one compound True Positive
  - Optionally one True Negative
  - Optionally one model error (FP or FN) for transparency

Outputs: backend/demo_data/demo_projects.json and demo_data/demo_rows.csv

Usage:
    python scripts/select_demo_projects.py \\
        --data-dir "/path/to/Phase 6 updated handoff data" \\
        --model-dir backend/artifacts/deployment_v2 \\
        --out backend/demo_data

NOTE: This script runs against the live models to reproduce actual scores.
"""
from __future__ import annotations

import argparse
import json
import sys
import hashlib
from pathlib import Path

import numpy as np
import pandas as pd
import joblib

# ── Constants ──────────────────────────────────────────────────────────────────
OFFICIAL_XGB_FEATURES = [
    "original_cost", "current_forecast_cost", "cumulative_expenditure",
    "cumulative_to_original_ratio", "forecast_to_original_ratio",
    "physical_progress_pct", "physical_progress_available",
    "planned_duration_months", "reported_delay_months",
    "exp_change_1m", "progress_change_1m", "progress_rate",
    "n_cost_revisions_to_date", "n_schedule_revisions_to_date",
    "planned_completion_available", "months_from_original_commissioning",
    "sector_std",
]
THRESHOLDS = {"cost_cuf_xgb": 0.88, "schedule_cuf_xgb": 0.63, "compound_cuf_xgb": 0.885}
TARGETS = {"cost_cuf_xgb": "cost_event_6m", "schedule_cuf_xgb": "schedule_event_6m", "compound_cuf_xgb": "compound_event_6m"}
ELIGIBLE = {"cost_cuf_xgb": "cost_eligible_6m", "schedule_cuf_xgb": "schedule_eligible_6m", "compound_cuf_xgb": "compound_eligible_6m"}


def classify(score, threshold):
    return "HIGH" if score >= threshold else "LOW"


def match_category(predicted_class, actual_event):
    if actual_event is None:
        return None
    if predicted_class == "HIGH" and actual_event == 1:
        return "TP"
    if predicted_class == "LOW" and actual_event == 0:
        return "TN"
    if predicted_class == "HIGH" and actual_event == 0:
        return "FP"
    return "FN"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--model-dir", default="backend/artifacts/deployment_v2")
    parser.add_argument("--out", default="backend/demo_data")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    model_dir = Path(args.model_dir)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    print("Loading enhanced dataset...")
    df = pd.read_csv(data_dir / "enhanced_phase6_corrected.csv", low_memory=False)
    df["report_month"] = pd.to_datetime(df["report_month"])
    df["project_id"] = df["project_id"].astype(str).str.strip()

    # Load official models
    print("Loading official models...")
    pipelines = {}
    for mid in THRESHOLDS:
        path = model_dir / "models" / mid / "model.joblib"
        pipelines[mid] = joblib.load(path)
        print(f"  Loaded {mid}")

    # Filter to Split-A test rows, eligible for at least one target
    test_df = df[df["split_a"] == "test"].copy()
    print(f"Test set: {len(test_df)} rows, {test_df['project_id'].nunique()} projects")

    # Score all test rows for all three official models
    for mid, pipeline in pipelines.items():
        feat_df = test_df[OFFICIAL_XGB_FEATURES].copy()
        test_df[f"score_{mid}"] = pipeline.predict_proba(feat_df)[:, 1]
        thr = THRESHOLDS[mid]
        test_df[f"class_{mid}"] = test_df[f"score_{mid}"].apply(lambda s: classify(s, thr))
        target_col = TARGETS[mid]
        elig_col = ELIGIBLE[mid]
        eligible_mask = test_df[elig_col] == 1
        test_df[f"match_{mid}"] = None
        test_df.loc[eligible_mask, f"match_{mid}"] = test_df.loc[eligible_mask].apply(
            lambda r: match_category(r[f"class_{mid}"], r[target_col]), axis=1
        )

    # Find demo candidates
    demo_rows = []
    selected_projects = set()

    def pick_project(mask, label, mid, preferred_match):
        candidates = test_df[mask & test_df["project_id"].isin(selected_projects if not selected_projects else set()).__invert__()].copy()
        # Prefer rows that have at least 3 prior rows in the dataset
        prior_counts = df.groupby("project_id").size()
        candidates = candidates[candidates["project_id"].isin(prior_counts[prior_counts >= 3].index)]
        if candidates.empty:
            candidates = test_df[mask].copy()
        if candidates.empty:
            print(f"  WARNING: No candidates for {label}")
            return
        # Pick the project with highest |score - threshold| for reliability
        thr = THRESHOLDS[mid]
        candidates["margin"] = (candidates[f"score_{mid}"] - thr).abs()
        best = candidates.nlargest(1, "margin").iloc[0]
        pid = best["project_id"]
        # Get all rows for this project from the full dataset (for trajectory)
        proj_all = df[df["project_id"] == pid].copy()
        # Select the specific test row as the "as-of" demonstration point
        demo_row = best.copy()
        selected_projects.add(pid)
        demo_rows.append({
            "demo_label": label,
            "target_model": mid,
            "match_category": preferred_match,
            "project_id": pid,
            "as_of": demo_row["report_month"].strftime("%Y-%m-%d"),
            "score_cost": float(demo_row["score_cost_cuf_xgb"]),
            "score_schedule": float(demo_row["score_schedule_cuf_xgb"]),
            "score_compound": float(demo_row["score_compound_cuf_xgb"]),
            "class_cost": demo_row["class_cost_cuf_xgb"],
            "class_schedule": demo_row["class_schedule_cuf_xgb"],
            "class_compound": demo_row["class_compound_cuf_xgb"],
            "actual_cost_event": int(demo_row["cost_event_6m"]) if demo_row["cost_eligible_6m"] == 1 else None,
            "actual_schedule_event": int(demo_row["schedule_event_6m"]) if demo_row["schedule_eligible_6m"] == 1 else None,
            "actual_compound_event": int(demo_row["compound_event_6m"]) if demo_row["compound_eligible_6m"] == 1 else None,
            "sector_std": str(demo_row.get("sector_std", "")),
            "state_std": str(demo_row.get("state_std", "")),
            "source": str(demo_row.get("source", "")),
            "n_panel_rows": int(len(proj_all)),
            "split_a": str(demo_row.get("split_a", "")),
        })
        print(f"  {label}: project={pid}, as_of={demo_row['report_month'].date()}, match={preferred_match}")

    print("\nSelecting demo projects...")

    # Cost True Positive
    cost_tp = (test_df["cost_eligible_6m"] == 1) & (test_df["match_cost_cuf_xgb"] == "TP")
    pick_project(cost_tp, "Cost True Positive", "cost_cuf_xgb", "TP")

    # Schedule True Positive
    sched_tp = (test_df["schedule_eligible_6m"] == 1) & (test_df["match_schedule_cuf_xgb"] == "TP")
    pick_project(sched_tp, "Schedule True Positive", "schedule_cuf_xgb", "TP")

    # Compound True Positive
    comp_tp = (test_df["compound_eligible_6m"] == 1) & (test_df["match_compound_cuf_xgb"] == "TP")
    pick_project(comp_tp, "Compound True Positive", "compound_cuf_xgb", "TP")

    # True Negative (cost)
    cost_tn = (test_df["cost_eligible_6m"] == 1) & (test_df["match_cost_cuf_xgb"] == "TN")
    pick_project(cost_tn, "Cost True Negative", "cost_cuf_xgb", "TN")

    # False Positive (model error, for transparency)
    cost_fp = (test_df["cost_eligible_6m"] == 1) & (test_df["match_cost_cuf_xgb"] == "FP")
    pick_project(cost_fp, "Cost False Positive (Model Error)", "cost_cuf_xgb", "FP")

    # Save demo projects manifest
    manifest_path = out_dir / "demo_projects.json"
    with open(manifest_path, "w") as f:
        json.dump({"demo_projects": demo_rows}, f, indent=2, default=str)
    print(f"\nSaved {len(demo_rows)} demo projects to {manifest_path}")

    # Build compact demo rows CSV (all rows for selected projects, with feature values)
    all_demo_pids = {d["project_id"] for d in demo_rows}
    demo_full = df[df["project_id"].isin(all_demo_pids)].copy()

    # Add risk scores for all rows
    for mid, pipeline in pipelines.items():
        feat_df = demo_full[OFFICIAL_XGB_FEATURES].copy()
        demo_full[f"score_{mid}"] = pipeline.predict_proba(feat_df)[:, 1]

    demo_out = out_dir / "demo_rows.csv"
    demo_full.to_csv(demo_out, index=False)
    print(f"Saved {len(demo_full)} demo rows to {demo_out}")
    print("\nDone.")


if __name__ == "__main__":
    main()
