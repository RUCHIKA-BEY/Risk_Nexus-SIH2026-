"""
Comprehensive backend test suite for SIH26103.
Covers all requirements specified in the task specification.

Run with:
    cd backend
    .venv/bin/pytest tests/ -v
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pandas as pd
import pytest

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import MODEL_ARTIFACT_DIR, DEMO_DATA_DIR
from app.services.registry_service import (
    load_registry, get_official_model_ids, get_analysis_model_ids,
    get_benchmark_model_ids, get_model_config, _validate_registry,
    get_registry,
)
from app.services.model_service import (
    load_all_models, is_loaded, score_row, classify, OFFICIAL_XGB_FEATURES,
    FORBIDDEN_PREDICTORS, OBSOLETE_TIMELINE_FIELDS,
)
from app.services.feature_service import build_feature_dict, check_data_quality
from app.services.fcm_service import (
    run_fcm_simulation, _validate_weights, _build_weight_matrix,
    _run_fcm, _sigmoid,
)
from app.services.outcome_service import get_actual_outcome, _match_category


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def setup_services():
    """Load all services once for the test session."""
    load_registry()
    load_all_models()
    from app.services.project_service import load_demo_data
    load_demo_data()  # canonical dataset is required; a missing/altered file fails the session


# Frozen production configuration (XGBOOST_/LR_BASELINE_FREEZE_MANIFEST.json, 2026-09-24).
PRODUCTION_ROUTING = {
    "cost_cuf_xgb": ("cost", "COMMON", 0.25),
    "schedule_cuf_xgb": ("schedule", "COMMON", 0.20),
    "compound_cuf_xgb": ("compound", "COMMON", 0.20),
}
BENCHMARK_ROUTING = {
    "cost_cuf_lr": ("cost", "ENHANCED", 0.25),
    "schedule_cuf_lr": ("schedule", "COMMON", 0.20),
    "compound_cuf_lr": ("compound", "COMMON", 0.20),
}
EXPECTED_14_COMMON_FEATURES = [
    "original_cost", "planned_duration_months", "cumulative_expenditure",
    "cumulative_to_original_ratio", "months_from_original_commissioning",
    "exp_change_1m", "exp_change_3m", "exp_slope_3m",
    "n_cost_revisions_to_date", "n_schedule_revisions_to_date", "sector_std",
    "expenditure_available", "planned_completion_available", "sector_available",
]
OLD_GENERATION_IDS = ["schedule_e3_xgb", "cost_e3_xgb", "cost_e4_xgb", "compound_e1_xgb"]
FROZEN_SAMPLES = json.loads(
    (Path(__file__).parent / "fixtures" / "frozen_samples.json").read_text()
)["samples"]


# ── 1. Application startup ─────────────────────────────────────────────────────

class TestApplicationStartup:
    def test_registry_loads(self):
        registry = get_registry()
        assert registry is not None
        assert "registry_version" in registry

    def test_models_are_loaded(self):
        assert is_loaded() is True

    def test_official_models_present(self):
        official = get_official_model_ids()
        assert set(official) == {"cost_cuf_xgb", "schedule_cuf_xgb", "compound_cuf_xgb"}

    def test_model_artifact_dir_exists(self):
        assert MODEL_ARTIFACT_DIR.exists()


# ── 2. Artifact hash verification ──────────────────────────────────────────────

class TestArtifactHashVerification:
    # Portable support bundles loaded at runtime (preprocessor + calibrator + feature order).
    EXPECTED_HASHES = {
        "cost_cuf_xgb": "69542264208dcc57bc9e81f835875c6a109ff1a7f69c9c2af36ddbb24042403e",
        "schedule_cuf_xgb": "b4ac82ef3bdb804c0c1f59f93c5a323d1f53418604616abac8bd04ef0632f203",
        "compound_cuf_xgb": "c54b23fd042ea53ce860e3e3e212fa3a80bfb49ea911e79027befed14dfdc2bf",
    }
    # Portable UBJ boosters (bit-identical outputs to the frozen training estimators).
    EXPECTED_BOOSTER_HASHES = {
        "cost_cuf_xgb": "d43e6e40f529bfa1274f903c5729373a070f5119ca9a72d57bf64e5103fd8927",
        "schedule_cuf_xgb": "dff5c04e727e804ee0f08faba1a5f24024cdd26f7a718b938a5d9ad6926cf061",
        "compound_cuf_xgb": "0e65322e9adf1e7d68228ed691629126cb71ab7be671c24a50c133d9c6f195df",
    }

    def test_booster_hashes_match(self):
        import hashlib
        for model_id, expected in self.EXPECTED_BOOSTER_HASHES.items():
            path = MODEL_ARTIFACT_DIR / get_model_config(model_id)["booster_path"]
            assert hashlib.sha256(path.read_bytes()).hexdigest() == expected, model_id

    def test_official_model_hashes_match(self):
        import hashlib
        for model_id, expected_hash in self.EXPECTED_HASHES.items():
            cfg = get_model_config(model_id)
            artifact_path = MODEL_ARTIFACT_DIR / cfg["artifact_path"]
            assert artifact_path.exists(), f"{artifact_path} not found"
            h = hashlib.sha256()
            with open(artifact_path, "rb") as f:
                for chunk in iter(lambda: f.read(65536), b""):
                    h.update(chunk)
            assert h.hexdigest() == expected_hash, f"Hash mismatch for {model_id}"


# ── 3. Model registry validation ───────────────────────────────────────────────

class TestModelRegistryValidation:
    def test_registry_contains_only_frozen_phase6_models(self):
        assert set(get_registry()["models"]) == set(PRODUCTION_ROUTING) | set(BENCHMARK_ROUTING)

    def test_old_generation_models_not_registered(self):
        for old_id in OLD_GENERATION_IDS:
            with pytest.raises(KeyError):
                get_model_config(old_id)
        assert get_analysis_model_ids() == []

    def test_official_models_exactly_three(self):
        official = get_official_model_ids()
        assert len(official) == 3
        assert set(official) == {"cost_cuf_xgb", "schedule_cuf_xgb", "compound_cuf_xgb"}

    def test_lr_benchmarks_flags(self):
        for mid in get_benchmark_model_ids():
            cfg = get_model_config(mid)
            assert cfg["benchmark_only"] is True
            assert cfg["official_prediction"] is False
            assert cfg["may_replace_xgboost_predictions"] is False

    def test_no_averaging_rule(self):
        registry = get_registry()
        assert registry["routing_rules"]["average_official_and_exploratory"] is False

    def test_lr_may_not_replace_xgboost(self):
        registry = get_registry()
        assert registry["routing_rules"]["lr_may_replace_xgboost"] is False

    def test_routing_invariants(self):
        """_validate_registry should pass without exceptions."""
        _validate_registry()


# ── 4. Exact official router mapping ───────────────────────────────────────────

class TestOfficialRouterMapping:
    def test_cost_routes_to_cost_cuf_xgb(self):
        cfg = get_model_config("cost_cuf_xgb")
        assert cfg["route"] == "production"
        assert cfg["official_prediction"] is True
        assert cfg["target"] == "cost"

    def test_schedule_routes_to_schedule_cuf_xgb(self):
        cfg = get_model_config("schedule_cuf_xgb")
        assert cfg["route"] == "production"
        assert cfg["official_prediction"] is True
        assert cfg["target"] == "schedule"

    def test_compound_routes_to_compound_cuf_xgb(self):
        cfg = get_model_config("compound_cuf_xgb")
        assert cfg["route"] == "production"
        assert cfg["official_prediction"] is True
        assert cfg["target"] == "compound"

    def test_production_routing_feature_sets_and_thresholds(self):
        for model_id, (target, feature_set, threshold) in PRODUCTION_ROUTING.items():
            cfg = get_model_config(model_id)
            assert (cfg["target"], cfg["feature_set"], cfg["threshold"]) == (target, feature_set, threshold)
        assert get_official_model_ids() == list(PRODUCTION_ROUTING)

    def test_benchmark_routing_feature_sets_and_thresholds(self):
        for model_id, (target, feature_set, threshold) in BENCHMARK_ROUTING.items():
            cfg = get_model_config(model_id)
            assert (cfg["target"], cfg["feature_set"], cfg["threshold"]) == (target, feature_set, threshold)
            assert cfg["route"] == "benchmark"


# ── 5. Old-generation model IDs are rejected everywhere ───────────────────────

class TestOldGenerationRejection:
    @pytest.mark.parametrize("old_id", OLD_GENERATION_IDS)
    def test_not_loaded(self, old_id):
        from app.services.model_service import _models
        assert old_id not in _models

    @pytest.mark.parametrize("old_id", OLD_GENERATION_IDS)
    def test_score_raises(self, old_id):
        with pytest.raises(KeyError):
            score_row(old_id, {})

    @pytest.mark.parametrize("old_id", OLD_GENERATION_IDS)
    def test_not_in_any_route(self, old_id):
        assert old_id not in get_analysis_model_ids()
        assert old_id not in get_official_model_ids()
        assert old_id not in get_benchmark_model_ids()

    def test_no_old_generation_model_files_under_artifacts(self):
        assert not (MODEL_ARTIFACT_DIR / "models").exists(), "old-generation models must be archived"
        assert not (MODEL_ARTIFACT_DIR / "research_archive").exists()


# ── 6. Exact 14-feature COMMON order ──────────────────────────────────────────

class TestFeatureOrder:
    def test_official_xgb_feature_order_exact(self):
        assert OFFICIAL_XGB_FEATURES == EXPECTED_14_COMMON_FEATURES

    def test_all_official_models_use_14_common_features(self):
        from app.services.model_service import get_model_bundle
        for model_id in get_official_model_ids():
            cfg = get_model_config(model_id)
            assert cfg["ordered_raw_input_features"] == EXPECTED_14_COMMON_FEATURES
            assert list(get_model_bundle(model_id)["features"]) == EXPECTED_14_COMMON_FEATURES


# ── 7. Obsolete field rejection for XGBoost ────────────────────────────────────

class TestObsoleteFieldRejection:
    def test_obsolete_fields_not_in_official_features(self):
        for obsolete in OBSOLETE_TIMELINE_FIELDS:
            assert obsolete not in OFFICIAL_XGB_FEATURES, f"{obsolete} must not be in official XGB features"

    def test_project_age_months_absent_from_official(self):
        assert "project_age_months" not in OFFICIAL_XGB_FEATURES

    def test_elapsed_planned_ratio_absent_from_official(self):
        assert "elapsed_planned_ratio" not in OFFICIAL_XGB_FEATURES

    def test_planned_remaining_months_absent_from_official(self):
        assert "planned_remaining_months" not in OFFICIAL_XGB_FEATURES


# ── 8. Sample prediction reproduction within 1e-6 ─────────────────────────────

class TestSamplePredictionReproduction:
    """Samples = frozen validation rows (tests/fixtures/frozen_samples.json)."""

    @pytest.mark.parametrize("model_id", list(PRODUCTION_ROUTING) + list(BENCHMARK_ROUTING))
    def test_official_sample_prediction_within_tolerance(self, model_id):
        for sample in FROZEN_SAMPLES[model_id]:
            score = score_row(model_id, sample["feature_row"])
            expected = sample["frozen_probability"]
            assert abs(score - expected) < 1e-9, (
                f"{model_id}: got {score:.10f}, expected {expected:.10f}, diff={abs(score-expected):.2e}"
            )

    @pytest.mark.parametrize("model_id", list(PRODUCTION_ROUTING) + list(BENCHMARK_ROUTING))
    def test_official_sample_classification(self, model_id):
        levels = []
        for sample in FROZEN_SAMPLES[model_id]:
            threshold = get_model_config(model_id)["threshold"]
            assert threshold == sample["threshold"]
            levels.append(classify(score_row(model_id, sample["feature_row"]), threshold))
            assert levels[-1] == sample["expected_risk_level"]
        assert set(levels) == {"HIGH", "LOW"}


# ── 9. Threshold classification ────────────────────────────────────────────────

class TestThresholdClassification:
    def test_high_when_at_or_above_threshold(self):
        assert classify(0.30, 0.25) == "HIGH"
        assert classify(0.25, 0.25) == "HIGH"
        assert classify(0.20, 0.20) == "HIGH"

    def test_low_when_below_threshold(self):
        assert classify(0.2499, 0.25) == "LOW"
        assert classify(0.1999, 0.20) == "LOW"

    def test_schedule_threshold_is_0_20(self):
        assert get_model_config("schedule_cuf_xgb")["threshold"] == 0.20

    def test_cost_threshold_is_0_25(self):
        assert get_model_config("cost_cuf_xgb")["threshold"] == 0.25

    def test_compound_threshold_is_0_20(self):
        assert get_model_config("compound_cuf_xgb")["threshold"] == 0.20


# ── 10. Official/exploratory separation ────────────────────────────────────────

class TestOfficialExploratorySeparation:
    def test_exploratory_not_official(self):
        for model_id in get_analysis_model_ids():
            cfg = get_model_config(model_id)
            assert cfg["official_prediction"] is False, f"{model_id} must not be official"

    def test_no_overlap_between_routes(self):
        official = set(get_official_model_ids())
        analysis = set(get_analysis_model_ids())
        benchmark = set(get_benchmark_model_ids())
        assert official.isdisjoint(analysis)
        assert official.isdisjoint(benchmark)
        assert analysis.isdisjoint(benchmark)


# ── 11. LR benchmark-only enforcement ─────────────────────────────────────────

class TestLRBenchmarkOnly:
    def test_lr_dashboard_label_marks_benchmark(self):
        for mid in get_benchmark_model_ids():
            label = get_model_config(mid).get("dashboard_label", "")
            assert "benchmark" in label.lower(), f"{mid} label must identify it as a benchmark"

    def test_lr_benchmarks_exclude_panel_tenure_fields(self):
        """The frozen Phase 6 LR models no longer use the panel-tenure timeline fields
        (the reason the old generation needed panel_tenure_warning)."""
        from app.services.model_service import get_model_bundle
        for mid in get_benchmark_model_ids():
            feats = set(get_model_config(mid)["ordered_raw_input_features"])
            assert not feats & OBSOLETE_TIMELINE_FIELDS, mid
            assert feats == set(get_model_bundle(mid)["features"])


# ── 12. Target/leakage column rejection ────────────────────────────────────────

class TestTargetLeakageRejection:
    def test_forbidden_predictors_not_in_official_features(self):
        for col in FORBIDDEN_PREDICTORS:
            assert col not in OFFICIAL_XGB_FEATURES, f"Forbidden column {col} in official features"

    def test_score_row_strips_forbidden_columns(self):
        """Pass a row with forbidden columns; they should be ignored."""
        feature_row = dict(FROZEN_SAMPLES["cost_cuf_xgb"][0]["feature_row"])
        # Inject forbidden columns
        feature_row["cost_event_6m"] = 1
        feature_row["split_a"] = "test"
        feature_row["project_id"] = "INJECTED"
        # Should not raise and should produce same score as without injection
        clean_row = {k: v for k, v in feature_row.items() if k not in FORBIDDEN_PREDICTORS}
        score_with = score_row("cost_cuf_xgb", feature_row)
        score_without = score_row("cost_cuf_xgb", clean_row)
        assert abs(score_with - score_without) < 1e-10


# ── 13. Historical outcome separation ──────────────────────────────────────────

class TestHistoricalOutcomeSeparation:
    def test_match_category_tp(self):
        assert _match_category("HIGH", 1) == "TP"

    def test_match_category_tn(self):
        assert _match_category("LOW", 0) == "TN"

    def test_match_category_fp(self):
        assert _match_category("HIGH", 0) == "FP"

    def test_match_category_fn(self):
        assert _match_category("LOW", 1) == "FN"

    def test_match_category_unknown(self):
        assert _match_category("HIGH", None) is None


# ── 14. Deterministic FCM ──────────────────────────────────────────────────────

class TestFCMDeterminism:
    def test_fcm_is_deterministic(self):
        nodes = ["a", "b", "c"]
        W = np.array([[0, 0.5, 0], [0, 0, 0.7], [0, 0, 0]])
        init = {"a": 0.6, "b": 0.4, "c": 0.5}
        result1, _, _ = _run_fcm(init, nodes, W, iterations=50, convergence_tolerance=1e-8)
        result2, _, _ = _run_fcm(init, nodes, W, iterations=50, convergence_tolerance=1e-8)
        for node in nodes:
            assert result1[node] == result2[node], f"Node {node} differs between runs"

    def test_fcm_states_bounded_0_1(self):
        from app.services.project_service import get_project_rows
        result = run_fcm_simulation("N22000180", "2024-06-01", {})
        for node, val in result.baseline.items():
            assert 0.0 <= val <= 1.0, f"Node {node}={val} out of [0,1]"
        for node, val in result.scenario.items():
            assert 0.0 <= val <= 1.0, f"Node {node}={val} out of [0,1]"

    def test_fcm_converges(self):
        result = run_fcm_simulation("N22000180", "2024-06-01", {})
        assert result.converged is True

    def test_fcm_no_nan(self):
        result = run_fcm_simulation("N22000180", "2024-06-01", {})
        for val in result.baseline.values():
            assert not math.isnan(val)
        for val in result.scenario.values():
            assert not math.isnan(val)


# ── 15. Bounded FCM states ─────────────────────────────────────────────────────

class TestFCMBoundedStates:
    def test_sigmoid_output_in_0_1(self):
        for x in [-100, -10, -1, 0, 1, 10, 100]:
            result = _sigmoid(x)
            assert 0.0 <= result <= 1.0

    def test_invalid_fcm_weights_raises(self):
        invalid_edges = [{"source": "a", "target": "b", "weight": 1.5}]
        with pytest.raises(ValueError, match="out of range"):
            _validate_weights(invalid_edges)

    def test_valid_fcm_weights_passes(self):
        valid_edges = [{"source": "a", "target": "b", "weight": 0.8}]
        _validate_weights(valid_edges)  # Should not raise

    def test_fcm_scenario_override_clamped(self):
        # Even extreme overrides should keep outputs in [0,1]
        result = run_fcm_simulation("N22000180", "2024-06-01", {"reported_delay_pressure": 1.0})
        for val in result.scenario.values():
            assert 0.0 <= val <= 1.0


# ── 16. SHAP output and additivity ────────────────────────────────────────────

class TestSHAPOutput:
    def _sample_feature_row(self):
        return FROZEN_SAMPLES["cost_cuf_xgb"][0]["feature_row"]

    def test_shap_returns_drivers(self):
        from app.services.shap_service import compute_shap
        feature_row = self._sample_feature_row()
        pos_d, neg_d = compute_shap("cost_cuf_xgb", feature_row, OFFICIAL_XGB_FEATURES, n_drivers=5)
        assert len(pos_d) > 0 or len(neg_d) > 0

    def test_shap_values_are_finite(self):
        from app.services.shap_service import compute_shap
        feature_row = self._sample_feature_row()
        pos_d, neg_d = compute_shap("cost_cuf_xgb", feature_row, OFFICIAL_XGB_FEATURES, n_drivers=5)
        for d in pos_d + neg_d:
            assert math.isfinite(d.shap_value)

    def test_shap_direction_consistent(self):
        from app.services.shap_service import compute_shap
        feature_row = self._sample_feature_row()
        pos_d, neg_d = compute_shap("cost_cuf_xgb", feature_row, OFFICIAL_XGB_FEATURES, n_drivers=5)
        for d in pos_d:
            assert d.direction == "increases_risk"
            assert d.shap_value > 0
        for d in neg_d:
            assert d.direction == "decreases_risk"
            assert d.shap_value < 0


# ── 17. Gemini mock tests ──────────────────────────────────────────────────────

class TestGeminiMocked:
    @pytest.mark.asyncio
    async def test_gemini_success(self):
        mock_response_text = json.dumps({
            "summary": "Test summary.",
            "main_drivers": ["driver1"],
            "suggested_actions": ["action1"],
            "limitations": ["limitation1"],
        })
        mock_model = MagicMock()
        mock_model.generate_content.return_value = MagicMock(text=mock_response_text)

        with patch("app.services.gemini_service.GEMINI_API_KEY", "test-key"):
            with patch("google.generativeai.configure"), \
                 patch("google.generativeai.GenerativeModel", return_value=mock_model):
                from app.services.gemini_service import generate_explanation
                result = await generate_explanation(
                    "TEST_PROJECT", "2024-01-01",
                    official_predictions={"cost": {"risk_score": 0.9}},
                )
                assert result.project_id == "TEST_PROJECT"
                assert result.source == "gemini"

    @pytest.mark.asyncio
    async def test_gemini_fallback_when_unavailable(self):
        with patch("app.services.gemini_service.GEMINI_API_KEY", ""):
            from app.services.gemini_service import generate_explanation
            result = await generate_explanation("FALLBACK_PROJECT", "2024-01-01")
            assert result.source == "fallback"
            assert result.project_id == "FALLBACK_PROJECT"

    @pytest.mark.asyncio
    async def test_gemini_fallback_on_exception(self):
        with patch("app.services.gemini_service.GEMINI_API_KEY", "test-key"):
            with patch("google.generativeai.configure"), \
                 patch("google.generativeai.GenerativeModel", side_effect=Exception("API error")):
                from app.services.gemini_service import generate_explanation
                result = await generate_explanation("ERR_PROJECT", "2024-01-01")
                assert result.source == "fallback"


# ── 18. API response schema validation ────────────────────────────────────────

class TestAPIResponseSchema:
    """Integration-level schema tests using the FastAPI TestClient."""

    @pytest.fixture(scope="class")
    def client(self):
        from fastapi.testclient import TestClient
        from app.main import app
        return TestClient(app)

    def test_health_schema(self, client):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "models_loaded" in data
        assert "official_models" in data
        assert data["status"] == "ok"

    def test_models_status_schema(self, client):
        response = client.get("/api/v1/models/status")
        assert response.status_code == 200
        data = response.json()
        assert "registry_version" in data
        assert "models" in data

    def test_projects_list_schema(self, client):
        response = client.get("/api/v1/projects")
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data
        assert len(data["projects"]) > 0

    def test_official_prediction_schema(self, client):
        response = client.post(
            "/api/v1/predict/official",
            json={"project_id": "N22000180", "as_of": "2024-06-01"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "official_predictions" in data
        assert "disclaimer" in data
        assert "cost" in data["official_predictions"]
        assert "schedule" in data["official_predictions"]
        assert "compound" in data["official_predictions"]
        # Verify no probability language
        disc = data["disclaimer"]
        assert "probability" not in disc.lower() or "not literal" in disc.lower()

    def test_risk_score_fields_named_correctly(self, client):
        """Outputs must use 'risk_score', not 'probability' or 'prob'."""
        response = client.post(
            "/api/v1/predict/official",
            json={"project_id": "N22000180", "as_of": "2024-06-01"},
        )
        data = response.json()
        for target, pred in data["official_predictions"].items():
            assert "risk_score" in pred
            assert "probability" not in pred

    def test_invalid_project_returns_404(self, client):
        response = client.post(
            "/api/v1/predict/official",
            json={"project_id": "NONEXISTENT123", "as_of": "2024-06-01"},
        )
        assert response.status_code == 404

    def test_invalid_project_id_format_rejected(self, client):
        response = client.post(
            "/api/v1/predict/official",
            json={"project_id": "../../etc/passwd", "as_of": "2024-06-01"},
        )
        assert response.status_code in (422, 400)

    def test_fcm_response_schema(self, client):
        response = client.post(
            "/api/v1/simulate/fcm",
            json={"project_id": "N22000180", "as_of": "2024-06-01"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "baseline" in data
        assert "scenario" in data
        assert "changes" in data
        assert "disclaimer" in data
        assert "official" not in data["disclaimer"].lower() or "not an official" in data["disclaimer"].lower()

    def test_analysis_predictions_not_official(self, client):
        response = client.post(
            "/api/v1/predict/analysis",
            json={"project_id": "N22000180", "as_of": "2024-06-01"},
        )
        assert response.status_code == 200
        data = response.json()
        for pred in data.get("exploratory_predictions", []):
            assert pred["official_prediction"] is False

    def test_benchmark_predictions_not_official(self, client):
        response = client.post(
            "/api/v1/predict/benchmark",
            json={"project_id": "N22000180", "as_of": "2024-06-01"},
        )
        assert response.status_code == 200
        data = response.json()
        for pred in data.get("benchmark_predictions", []):
            assert pred["official_prediction"] is False

    def test_actual_outcome_endpoint_separate_from_prediction(self, client):
        # Prediction endpoint
        pred_response = client.post(
            "/api/v1/predict/official",
            json={"project_id": "N22000180", "as_of": "2024-06-01"},
        )
        assert pred_response.status_code == 200
        assert "official_predictions" in pred_response.json()

        # Outcome endpoint
        outcome_response = client.get(
            "/api/v1/projects/N22000180/actual-outcome?as_of=2024-06-01"
        )
        assert outcome_response.status_code == 200
        outcome_data = outcome_response.json()
        assert "outcomes" in outcome_data
        # Prediction response does NOT contain actual outcomes
        assert "outcomes" not in pred_response.json()


# ── 19. CORS configuration ────────────────────────────────────────────────────

class TestCORSConfiguration:
    def test_cors_not_unrestricted(self):
        from app.config import ALLOWED_ORIGINS
        assert "*" not in ALLOWED_ORIGINS, "CORS must not be unrestricted (*)"
        assert len(ALLOWED_ORIGINS) > 0


# ── 20. Missing/extra input handling ──────────────────────────────────────────

class TestInputHandling:
    @pytest.fixture(scope="class")
    def client(self):
        from fastapi.testclient import TestClient
        from app.main import app
        return TestClient(app)

    def test_missing_required_field_returns_422(self, client):
        response = client.post("/api/v1/predict/official", json={"project_id": "N22000180"})
        assert response.status_code == 422

    def test_invalid_date_format_returns_422(self, client):
        response = client.post(
            "/api/v1/predict/official",
            json={"project_id": "N22000180", "as_of": "not-a-date"},
        )
        assert response.status_code == 422

    def test_invalid_fcm_weight_rejected(self, client):
        response = client.post(
            "/api/v1/simulate/fcm",
            json={
                "project_id": "N22000180",
                "as_of": "2024-06-01",
                "scenario_overrides": {"reported_delay_pressure": 2.0},  # > 1.0
            },
        )
        assert response.status_code == 422


# ── 21. Canonical Dataset & Full-Stack Dynamic Endpoints ───────────────────────

class TestCanonicalDataIntegration:
    @pytest.fixture(scope="class")
    def client(self):
        from fastapi.testclient import TestClient
        from app.main import app
        return TestClient(app)

    def test_projects_pagination_and_total(self, client):
        response = client.get("/api/v1/projects?page=1&page_size=20")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] == 13497  # full canonical dataset
        assert len(data["items"]) == 20
        assert data["total_pages"] > 50

    def test_projects_demo_filter(self, client):
        response = client.get("/api/v1/projects?demo=true")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 4
        for item in data["items"]:
            assert item["project_id"]

    def test_projects_search(self, client):
        response = client.get("/api/v1/projects?search=RAILWAYS&page_size=10")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) > 0

    def test_dashboard_metrics(self, client):
        response = client.get("/api/v1/dashboard/metrics")
        assert response.status_code == 200
        data = response.json()
        assert data["total_projects"] > 1000
        assert data["total_budget"] > 0
        assert data["sectors_count"] > 0

    def test_analytics_overview(self, client):
        response = client.get("/api/v1/analytics/overview")
        assert response.status_code == 200
        data = response.json()
        assert data["total_projects"] > 1000
        assert len(data["sector_distribution"]) > 0
        assert len(data["state_distribution"]) > 0
        assert len(data["progress_distribution"]) == 4

    def test_operational_priority_queue(self, client):
        response = client.get("/api/v1/actions/priority-queue?top_n=25")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) > 0
        assert data["items"][0]["schedule_risk_score"] >= data["items"][-1]["schedule_risk_score"]
        assert data["items"][0]["priority_rank"] == 1

    def test_compare_projects(self, client):
        # Pick 2 project IDs from the list
        list_res = client.get("/api/v1/projects?page_size=2").json()
        pids = [p["project_id"] for p in list_res["items"]]
        response = client.post("/api/v1/projects/compare", json={"project_ids": pids})
        assert response.status_code == 200
        data = response.json()
        assert len(data["projects"]) == 2
        for p in data["projects"]:
            assert "cost_risk_score" in p
            assert "schedule_risk_score" in p
            assert "compound_risk_score" in p
