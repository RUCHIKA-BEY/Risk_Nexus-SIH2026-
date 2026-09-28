"""Tests for the ML + SHAP + FCM integration layer.

Uses the bundled dataset backend/data/phase6/enhanced_phase6_corrected.csv
(or CANONICAL_DATA_DIR). A missing dataset fails the suite. Run from backend/:

    python -m pytest tests/

To refresh the schema snapshot after an INTENTIONAL contract change:
    UPDATE_SCHEMA_SNAPSHOT=1 python -m pytest tests/test_integration_layer.py -k schema_snapshot
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import pytest

from app.config import CANONICAL_DATA_PATH, MODEL_ARTIFACT_DIR
from app.services.model_service import FORBIDDEN_PREDICTORS, OBSOLETE_TIMELINE_FIELDS

HERE = Path(__file__).parent
FIXTURES = HERE / "fixtures"
SNAPSHOT = HERE / "snapshots" / "integration_schemas.json"
ARTIFACTS = MODEL_ARTIFACT_DIR.parent

OFFICIAL = {  # model_id: (target, feature_set, threshold) — XGBOOST_BASELINE_FREEZE_MANIFEST.json
    "cost_cuf_xgb": ("cost", "COMMON", 0.25),
    "schedule_cuf_xgb": ("schedule", "COMMON", 0.20),
    "compound_cuf_xgb": ("compound", "COMMON", 0.20),
}
BENCHMARK = {  # model_id: (target, feature_set, threshold, C) — LR_BASELINE_FREEZE_MANIFEST.json
    "cost_cuf_lr": ("cost", "ENHANCED", 0.25, 0.1),
    "schedule_cuf_lr": ("schedule", "COMMON", 0.20, 100.0),
    "compound_cuf_lr": ("compound", "COMMON", 0.20, 1.0),
}
FROZEN_FILE_SHA256 = {  # byte-identical to the original frozen baseline archives
    "cost_cuf_xgb": "1d260c90e541790464ccb1d5310e11d2207dcc81f53ab24402ca87d714891370",
    "schedule_cuf_xgb": "78e3873290b57d72572bcf4c739b3cede630153551c07d9900350769e0652198",
    "compound_cuf_xgb": "351a5bd75f76b5df178b972c19e1dfef6345b4029dbf077f8882d88e1fe58b68",
    "cost_cuf_lr": "85bf848f985081189b44310be7c80885401ce65d0c9bf011354d91ae3a401836",
    "schedule_cuf_lr": "41e3e7bfff283d0d847b6316fbd2a214be1ba3c17ecb8aa1418a87f59aad90a8",
    "compound_cuf_lr": "31ad2fdf2167d02f54d645a5ffc79485555178e87695b1f6ff79b7c7a22a08ee",
}
FCM_WEIGHTS_SHA256 = "2ecb7359ecf3a37d1f18c5cdbe8e0a73e2a33cb51c66efb5194fa80a66655db3"
TARGET_LIKE = {c for c in FORBIDDEN_PREDICTORS if c.endswith(("_event_6m", "_eligible_6m", "_censored_6m"))}
VALIDATION_FILES = {
    "cost_cuf_xgb": "xgboost__cost_event_6m__COMMON_predictions.csv",
    "schedule_cuf_xgb": "xgboost__schedule_event_6m__COMMON_predictions.csv",
    "compound_cuf_xgb": "xgboost__compound_event_6m__COMMON_predictions.csv",
    "cost_cuf_lr": "lr__cost_event_6m__ENHANCED_predictions.csv",
    "schedule_cuf_lr": "lr__schedule_event_6m__COMMON_predictions.csv",
    "compound_cuf_lr": "lr__compound_event_6m__COMMON_predictions.csv",
}

# Required data is never optional: a missing dataset FAILS the suite (no skips).
if not CANONICAL_DATA_PATH.exists():
    pytest.fail(
        f"Required canonical dataset missing at {CANONICAL_DATA_PATH}. "
        "It ships at backend/data/phase6/enhanced_phase6_corrected.csv.",
        pytrace=False,
    )


def test_canonical_dataset_bundled_and_loaded():
    from app.config import CANONICAL_DATA_SHA256
    from app.services.project_service import get_dataset_info
    info = get_dataset_info()
    assert info["mode"] == "canonical"
    assert info["sha256_verified"] is True and info["sha256"] == CANONICAL_DATA_SHA256
    assert Path(info["path"]).resolve() == CANONICAL_DATA_PATH.resolve()
    assert info["rows"] == 65047 and info["projects"] == 13497


def test_missing_dataset_fails_loudly(monkeypatch, tmp_path):
    from app.services import project_service
    monkeypatch.setattr(project_service, "CANONICAL_DATA_PATH", tmp_path / "absent.csv")
    monkeypatch.setattr(project_service, "DATASET_CACHE_DIR", tmp_path / "cache")
    monkeypatch.setattr(project_service, "ALLOW_DEMO_DATA", False)
    for name in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_BUCKET", "SUPABASE_OBJECT_PATH"):
        monkeypatch.setattr(project_service, name, "")
    with pytest.raises(project_service.DatasetConfigurationError, match="Canonical dataset not found"):
        project_service.load_demo_data()


def test_altered_dataset_fails_loudly(monkeypatch, tmp_path):
    from app.services import project_service
    bad = tmp_path / "enhanced_phase6_corrected.csv"
    bad.write_text("project_id,report_month\nX,2024-01-01\n")
    monkeypatch.setattr(project_service, "CANONICAL_DATA_PATH", bad)
    with pytest.raises(project_service.DatasetConfigurationError, match="SHA-256"):
        project_service.load_demo_data()


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


@pytest.fixture(scope="module", autouse=True)
def _startup():
    from app.services.model_service import load_all_models
    from app.services.project_service import load_demo_data
    from app.services.registry_service import load_registry
    load_registry()
    load_all_models()
    load_demo_data()


@pytest.fixture(scope="module")
def data() -> pd.DataFrame:
    return pd.read_csv(CANONICAL_DATA_PATH, low_memory=False, dtype={"project_id": str})


@pytest.fixture(scope="module")
def sample_rows(data) -> pd.DataFrame:
    """Deterministic mix of eligible and non-eligible rows, incl. missing sector_std."""
    parts = [
        data[data["cost_eligible_6m"].eq(1)].sample(120, random_state=11),
        data[data["sector_std"].isna()].sample(60, random_state=12),
        data.sample(120, random_state=13),
    ]
    return pd.concat(parts).drop_duplicates(["project_id", "report_month"]).reset_index(drop=True)


@pytest.fixture(scope="module")
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as c:
        yield c


def _feature_row(row: pd.Series, model_id: str) -> dict:
    from app.services.feature_service import build_feature_dict
    from app.services.risk_integration_service import model_features
    return build_feature_dict(row, model_features(model_id))


# ── 1. Frozen model predictions remain unchanged ──────────────────────────────

@pytest.mark.parametrize("model_id", list(FROZEN_FILE_SHA256))
def test_frozen_files_unchanged(model_id):
    assert _sha(ARTIFACTS / "frozen_phase6_v1" / "models" / f"{model_id}.joblib") == FROZEN_FILE_SHA256[model_id]


def test_routing_matches_freeze_manifests():
    from app.services.registry_service import get_benchmark_model_ids, get_model_config, get_official_model_ids
    xman = json.loads((FIXTURES / "XGBOOST_BASELINE_FREEZE_MANIFEST.json").read_text())
    lman = json.loads((FIXTURES / "LR_BASELINE_FREEZE_MANIFEST.json").read_text())
    xsel = {c["target"].split("_")[0]: c for c in xman["selected_xgboost_candidates"]}
    lsel = {c["target"].split("_")[0]: c for c in lman["selected_lr_candidates"]}
    assert sorted(get_official_model_ids()) == sorted(OFFICIAL)
    assert sorted(get_benchmark_model_ids()) == sorted(BENCHMARK)
    for mid, (target, fs, thr) in OFFICIAL.items():
        cfg = get_model_config(mid)
        assert (cfg["target"], cfg["feature_set"], cfg["threshold"]) == (target, fs, thr)
        assert (xsel[target]["feature_set"], xsel[target]["threshold"]) == (fs, thr)
        assert cfg["official_prediction"] is True and cfg["benchmark_only"] is False
    for mid, (target, fs, thr, C) in BENCHMARK.items():
        cfg = get_model_config(mid)
        assert (cfg["target"], cfg["feature_set"], cfg["threshold"], cfg["selected_C"]) == (target, fs, thr, C)
        assert (lsel[target]["feature_set"], lsel[target]["threshold"], lsel[target]["selected_C"]) == (fs, thr, C)
        assert cfg["official_prediction"] is False and cfg["benchmark_only"] is True


@pytest.mark.parametrize("model_id", list(VALIDATION_FILES))
def test_served_predictions_equal_saved_frozen_validation_predictions(data, model_id):
    """Backend scoring path vs the probabilities saved when the models were frozen."""
    from app.services.model_service import score_row
    saved = pd.read_csv(FIXTURES / "frozen_validation" / VALIDATION_FILES[model_id], dtype={"project_id": str})
    merged = saved.merge(data, on=["project_id", "report_month"], how="left", validate="one_to_one")
    assert len(merged) == len(saved)
    served = np.array([score_row(model_id, _feature_row(r, model_id)) for _, r in merged.iterrows()])
    assert np.abs(served - merged["probability"].to_numpy()).max() < 1e-9


@pytest.mark.parametrize("model_id", list(OFFICIAL))
def test_portable_booster_equals_frozen_training_estimator(sample_rows, model_id):
    from app.services.model_service import get_model_bundle, score_row
    frozen = joblib.load(ARTIFACTS / "frozen_phase6_v1" / "models" / f"{model_id}.joblib")
    assert list(frozen["features"]) == list(get_model_bundle(model_id)["features"])
    raw = frozen["estimator"].predict_proba(frozen["preprocessor"].transform(sample_rows[frozen["features"]]))[:, 1]
    ref = frozen["calibrator"].predict_proba(raw.reshape(-1, 1))[:, 1]
    served = np.array([score_row(model_id, _feature_row(r, model_id)) for _, r in sample_rows.iterrows()])
    assert np.abs(served - ref).max() < 1e-12


def test_api_predict_equals_service_scoring(client, data):
    from app.services.model_service import score_row
    row = data[data["cost_eligible_6m"].eq(1)].iloc[0]
    body = {"project_id": row["project_id"], "as_of": row["report_month"]}
    res = client.post("/api/v1/risk/predict?include_benchmark=true", json=body).json()
    for block, spec in (("ml", OFFICIAL), ("benchmark", BENCHMARK)):
        for mid, (target, fs, thr, *_) in spec.items():
            p = res[block][target]
            assert p["model_id"] == mid and p["feature_set"] == fs and p["threshold"] == thr
            assert p["probability"] == pytest.approx(score_row(mid, _feature_row(row, mid)), abs=1e-12)
            assert p["risk"] == (p["probability"] >= thr)
            assert p["risk_level"] == ("HIGH" if p["risk"] else "LOW")
    assert res["ml"]["cost"]["model_name"] == "XGBoost"
    assert res["benchmark"]["cost"]["model_name"] == "LogisticRegression"


# ── 2/3. SHAP corresponds to the deployed model and reconstructs its output ───

@pytest.mark.parametrize("model_id", list(OFFICIAL))
def test_shap_probability_is_the_served_probability(sample_rows, model_id):
    from app.explainability.shap_engine import explain_row
    from app.services.model_service import score_row
    for _, r in sample_rows.head(80).iterrows():
        fr = _feature_row(r, model_id)
        assert explain_row(model_id, fr)["probability"] == pytest.approx(score_row(model_id, fr), abs=1e-12)


@pytest.mark.parametrize("model_id", list(OFFICIAL))
def test_shap_additivity_and_aggregation(sample_rows, model_id):
    import xgboost as xgb
    from app.explainability.shap_engine import calibrator_is_increasing, explain_row
    from app.services.model_service import get_model_bundle
    assert calibrator_is_increasing(model_id)
    bundle = get_model_bundle(model_id)
    for _, r in sample_rows.iterrows():
        fr = _feature_row(r, model_id)
        e = explain_row(model_id, fr, top_n=14)
        per_feature = sum(c["shap_value"] for c in e["all_contributors"])
        assert e["expected_value"] + e["shap_sum"] == pytest.approx(e["raw_margin"], abs=1e-4)
        assert per_feature == pytest.approx(e["shap_sum"], abs=1e-6)
        # the margin is the deployed booster's own margin
        X = bundle["preprocessor"].transform(pd.DataFrame([{f: fr.get(f, np.nan) for f in bundle["features"]}]))
        margin = float(bundle["booster"].predict(xgb.DMatrix(X), output_margin=True)[0])
        assert e["raw_margin"] == pytest.approx(margin, abs=1e-7)
        assert all(c["shap_value"] > 0 and c["direction"] == "increasing_risk" for c in e["positive_contributors"])
        assert all(c["shap_value"] < 0 and c["direction"] == "decreasing_risk" for c in e["negative_contributors"])
        assert [c["rank"] for c in e["all_contributors"]] == list(range(1, len(bundle["features"]) + 1))


@pytest.mark.parametrize("model_id", list(OFFICIAL))
def test_native_treeshap_matches_shap_treeexplainer_on_frozen_estimator(sample_rows, model_id):
    import shap  # required test dependency (requirements-dev.txt); never skipped
    import xgboost as xgb
    from app.services.model_service import get_model_bundle
    frozen = joblib.load(ARTIFACTS / "frozen_phase6_v1" / "models" / f"{model_id}.joblib")
    X = frozen["preprocessor"].transform(sample_rows[frozen["features"]])
    X = X.toarray() if hasattr(X, "toarray") else X
    reference = shap.TreeExplainer(frozen["estimator"]).shap_values(X)
    served = get_model_bundle(model_id)["booster"].predict(xgb.DMatrix(X), pred_contribs=True)[:, :-1]
    assert np.abs(np.asarray(reference) - served).max() < 1e-5


# ── 4. FCM ────────────────────────────────────────────────────────────────────

def test_fcm_weights_file_unchanged_and_valid():
    from app.fcm.weights import WEIGHTS_PATH, load_config
    assert _sha(WEIGHTS_PATH) == FCM_WEIGHTS_SHA256
    cfg = load_config()
    assert cfg.review_status == "DRAFT_NOT_DOMAIN_APPROVED"
    assert np.all((cfg.W >= -1) & (cfg.W <= 1))
    assert int((cfg.W != 0).sum()) == len(cfg.edges) == 16


def test_fcm_is_deterministic(data):
    from app.fcm.engine import reason
    row = data.iloc[1234].to_dict()
    runs = [json.dumps(reason(row, {"forecast_cost_pressure": 0.8}), sort_keys=True) for _ in range(3)]
    assert runs[0] == runs[1] == runs[2]


def test_fcm_matches_existing_simulator_update_rule(data):
    """New engine reproduces app.services.fcm_service._run_fcm exactly."""
    from app.fcm.concepts import INPUT_CONCEPTS, initial_state
    from app.fcm.engine import propagate
    from app.fcm.weights import load_config
    from app.services import fcm_service
    cfg = load_config()
    for i in (0, 500, 5000, 20000):
        init = initial_state(data.iloc[i].to_dict(), cfg.nodes)
        old, old_steps, old_conv = fcm_service._run_fcm(
            init, cfg.nodes, cfg.W, 50, 1e-6, frozen_nodes=set(INPUT_CONCEPTS), damping=cfg.damping
        )
        new = propagate(cfg, init)
        assert (new.iterations, new.converged) == (old_steps, old_conv)
        for n in cfg.nodes:
            assert round(new.final[n], 6) == old[n]


def test_fcm_inputs_clamped_outputs_bounded_and_overrides_validated(data):
    from app.fcm.concepts import INPUT_CONCEPTS
    from app.fcm.engine import reason
    res = reason(data.iloc[42].to_dict(), {"reported_delay_pressure": 1.7})
    states = {n["concept"]: n for n in res["nodes"]}
    assert states["reported_delay_pressure"]["final_state"] == 1.0  # clipped override, clamped
    for c in INPUT_CONCEPTS:
        assert states[c]["final_state"] == states[c]["initial_state"]
    assert all(0.0 <= n["final_state"] <= 1.0 for n in res["nodes"])
    assert res["converged"]
    with pytest.raises(ValueError):
        reason(data.iloc[42].to_dict(), {"intervention_priority": 0.9})
    with pytest.raises(ValueError):
        reason(data.iloc[42].to_dict(), {"not_a_concept": 0.1})


def test_fcm_pathways_are_consistent_with_graph(data):
    from app.fcm.engine import reason
    from app.fcm.weights import load_config
    cfg = load_config()
    edges = {(e["source"], e["target"]): float(e["weight"]) for e in cfg.edges}
    res = reason(data.iloc[7].to_dict(), max_pathways=20)
    states = {n["concept"]: n["final_state"] for n in res["nodes"]}
    for p in res["risk_increasing_pathways"]:
        assert len(set(p["path"])) == len(p["path"])
        assert [edges[(a, b)] for a, b in zip(p["path"], p["path"][1:])] == p["weights"]
        assert p["strength"] == pytest.approx(states[p["path"][0]] * float(np.prod(p["weights"])))
    assert res["protective_pathways"] == []  # draft has no negative edges
    assert res["pathway_note"]


def test_fcm_does_not_change_ml_predictions(client, data):
    row = data[data["cost_eligible_6m"].eq(1)].iloc[3]
    body = {"project_id": row["project_id"], "as_of": row["report_month"]}
    base = client.post("/api/v1/risk/assess", json=body).json()
    scen = client.post("/api/v1/risk/assess", json={**body, "scenario_overrides": {"forecast_cost_pressure": 1.0}}).json()
    assert base["ml"] == scen["ml"] and base["shap"] == scen["shap"]
    assert scen["fcm"]["scenario_overrides"] == {"forecast_cost_pressure": 1.0}


# ── 5. API response schema is stable ──────────────────────────────────────────

def _schemas() -> dict:
    from app import integration_schemas as s
    models = [s.RiskPredictResponse, s.RiskExplainResponse, s.RiskFCMResponse, s.RiskAssessResponse,
              s.FCMGraphResponse, s.ModelInfoResponse, s.RiskRequest, s.ExplainRequest, s.FCMRequest, s.AssessRequest]
    return {m.__name__: m.model_json_schema() for m in models}


def test_schema_snapshot():
    current = json.loads(json.dumps(_schemas(), sort_keys=True))
    if os.environ.get("UPDATE_SCHEMA_SNAPSHOT") == "1":
        SNAPSHOT.write_text(json.dumps(current, indent=1, sort_keys=True))
    assert SNAPSHOT.exists(), "schema snapshot missing"
    assert current == json.loads(SNAPSHOT.read_text()), "API response schema changed"


def test_endpoints_return_documented_shapes(client, data):
    row = data[data["schedule_eligible_6m"].eq(1)].iloc[10]
    body = {"project_id": row["project_id"], "as_of": row["report_month"]}
    a = client.post("/api/v1/risk/assess", json=body)
    assert a.status_code == 200
    j = a.json()
    assert set(j) >= {"project_id", "as_of", "data_row_month", "ml", "shap", "fcm", "benchmark"}
    assert set(j["ml"]) == {"role", "cost", "schedule", "compound", "disclaimer"}
    for t in ("cost", "schedule", "compound"):
        e = j["shap"]["explanations"][t]
        assert len(e["positive_contributors"]) <= 5 and len(e["negative_contributors"]) <= 5
        for c in e["positive_contributors"] + e["negative_contributors"]:
            assert set(c) == {"rank", "feature", "label", "value", "value_missing", "shap_value", "abs_shap_value", "direction"}
    assert client.post("/api/v1/risk/explain", json={**body, "targets": ["cost"]}).json()["shap"]["explanations"].keys() == {"cost"}
    assert client.post("/api/v1/risk/fcm", json=body).status_code == 200
    assert client.get("/api/v1/fcm/graph").status_code == 200
    info = client.get("/api/v1/model-info").json()
    assert {m["model_id"]: m["threshold"] for m in info["production"]} == {k: v[2] for k, v in OFFICIAL.items()}
    assert client.post("/api/v1/risk/predict", json={"project_id": "NO_SUCH_PROJECT", "as_of": "2025-01"}).status_code == 404
    assert client.post("/api/v1/risk/fcm", json={**body, "scenario_overrides": {"cost_pressure": 0.9}}).status_code == 422


def test_existing_frontend_routes_still_served(client, data):
    row = data[data["cost_eligible_6m"].eq(1)].iloc[0]
    body = {"project_id": row["project_id"], "as_of": row["report_month"]}
    for path in ("/api/v1/predict/official", "/api/v1/predict/benchmark", "/api/v1/simulate/fcm"):
        assert client.post(path, json=body).status_code == 200, path


# ── 6. Target columns never enter model features ──────────────────────────────

def test_no_target_or_split_columns_in_any_model():
    from app.services.model_service import get_model_bundle
    from app.services.registry_service import get_all_enabled_model_ids, get_model_config
    assert TARGET_LIKE == {f"{t}_{k}_6m" for t in ("cost", "schedule", "compound") for k in ("event", "eligible", "censored")}
    for mid in get_all_enabled_model_ids():
        feats = set(get_model_config(mid)["ordered_raw_input_features"])
        assert feats == set(get_model_bundle(mid)["features"])
        assert not feats & FORBIDDEN_PREDICTORS, mid
        if mid in OFFICIAL:
            assert not feats & OBSOLETE_TIMELINE_FIELDS, mid


def test_fcm_reads_no_target_columns():
    from app.fcm.concepts import SOURCE_COLUMNS
    assert not set(SOURCE_COLUMNS) & FORBIDDEN_PREDICTORS


@pytest.mark.parametrize("model_id", list(OFFICIAL) + list(BENCHMARK))
def test_injected_target_values_cannot_change_outputs(data, model_id):
    from app.explainability.shap_engine import explain_row
    from app.services.model_service import score_row
    row = data[data["cost_eligible_6m"].eq(1)].iloc[5]
    clean = _feature_row(row, model_id)
    poisoned = {**clean, **{c: 1 for c in TARGET_LIKE}, "split_a": "test", "project_age_months": 999.0}
    assert score_row(model_id, poisoned) == score_row(model_id, clean)
    if model_id in OFFICIAL:
        assert explain_row(model_id, poisoned)["shap_sum"] == explain_row(model_id, clean)["shap_sum"]


def test_prediction_uses_no_future_rows(client, data):
    """as_of before a project's later months must use the latest row <= as_of only."""
    pid = data["project_id"].value_counts().index[0]
    months = sorted(data.loc[data["project_id"] == pid, "report_month"])
    early = months[len(months) // 2]
    res = client.post("/api/v1/risk/predict", json={"project_id": pid, "as_of": early}).json()
    assert res["data_row_month"] == early


def test_actual_outcome_uses_registry_thresholds(client):
    """/projects/{id}/actual-outcome compares outcomes with the OFFICIAL predicted classes
    (registry thresholds), never a hardcoded or default class."""
    demos = json.loads((HERE.parent / "demo_data" / "demo_projects.json").read_text())["demo_projects"]
    for d in demos:
        target = d["target_model"].split("_")[0]
        pred = client.post("/api/v1/risk/predict", json={"project_id": d["project_id"], "as_of": d["as_of"]}).json()
        out = client.get(f"/api/v1/projects/{d['project_id']}/actual-outcome", params={"as_of": d["as_of"]}).json()
        match = {o["target"]: o for o in out["outcomes"]}[target]
        assert match["predicted_class"] == pred["ml"][target]["risk_level"]
        assert match["match_category"] == d["match_category"], d["demo_label"]


def test_frozen_checksums_manifest_intact():
    """Every immutable file (models, boosters, registry, FCM weights, dataset) is unchanged."""
    import subprocess, sys
    script = HERE.parent / "scripts" / "verify_frozen_artifacts.py"
    result = subprocess.run([sys.executable, str(script)], capture_output=True, text=True)
    assert result.returncode == 0, result.stdout
    assert result.stdout.count("OK ") == 18
