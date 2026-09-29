"""Tests for the AI upgrade: deep explanation, REX assistant and glossary."""
from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

DEMO = "N22000180"
AS_OF = "2024-09-01"


@pytest.fixture(scope="module")
def client():
    from app.main import app
    with TestClient(app) as c:
        yield c


def test_glossary_covers_every_official_feature(client):
    from app.services.registry_service import get_model_config, get_official_model_ids
    keys = {t["key"] for t in client.get("/api/v1/ai/glossary").json()["terms"]}
    for mid in get_official_model_ids():
        for f in get_model_config(mid)["ordered_raw_input_features"]:
            assert f in keys, f"glossary missing {f}"


def test_deep_explanation_rule_based_is_grounded(client):
    with patch("app.services.ai_explainer_service.GEMINI_API_KEY", ""):
        r = client.post("/api/v1/ai/explain/deep", json={"project_id": DEMO, "as_of": AS_OF})
    assert r.status_code == 200
    d = r.json()
    assert d["source"] == "rule_based"
    assert d["data_row_month"] == "2024-09"
    assert {t["target"] for t in d["targets"]} == {"cost", "schedule", "compound"}
    # numbers come from the official models, not from the explainer
    from app.services import risk_integration_service as ris
    row = ris.load_row(DEMO, AS_OF)
    pred = ris.predict_block(row, "official_production")
    for t in d["targets"]:
        assert t["score_points"] == round(pred[t["target"]]["probability"] * 100, 1)
        assert t["risk_level"] == pred[t["target"]]["risk_level"]
    assert d["drivers"] and all(x["what_it_means"] and x["what_to_verify"] for x in d["drivers"])
    assert "Rs 2,510.86 crore" in d["overview"]


def test_deep_explanation_uses_gemini_output_when_available(client):
    from app.services import ai_explainer_service as s
    ctx = s.jsonable(s.build_context(DEMO, AS_OF))
    body = s.rule_based(ctx).model_copy(update={"headline": "GEMINI HEADLINE"})

    async def fake(system, prompt, schema):
        assert "CONTEXT" in prompt and "GLOSSARY" in prompt
        return body.model_dump_json()

    with patch.object(s, "GEMINI_API_KEY", "k"), patch.object(s, "_gemini", fake):
        d = client.post("/api/v1/ai/explain/deep", json={"project_id": DEMO, "as_of": AS_OF}).json()
    assert d["source"] == "gemini" and d["headline"] == "GEMINI HEADLINE"


def test_deep_explanation_falls_back_on_gemini_error(client):
    from app.services import ai_explainer_service as s

    async def boom(*a, **k):
        raise RuntimeError("quota")

    with patch.object(s, "GEMINI_API_KEY", "k"), patch.object(s, "_gemini", boom):
        d = client.post("/api/v1/ai/explain/deep", json={"project_id": DEMO, "as_of": AS_OF}).json()
    assert d["source"] == "rule_based"


def test_deep_explanation_unknown_project_404(client):
    r = client.post("/api/v1/ai/explain/deep", json={"project_id": "NO_SUCH_PROJECT", "as_of": AS_OF})
    assert r.status_code == 404


def test_fcm_scenario_is_reflected(client):
    with patch("app.services.ai_explainer_service.GEMINI_API_KEY", ""):
        d = client.post("/api/v1/ai/explain/deep", json={
            "project_id": DEMO, "as_of": AS_OF, "fcm_overrides": {"expenditure_progress_gap": 0.2}}).json()
    assert "With your scenario settings" in d["scenario"]


def test_ask_rule_based_explains_term_with_project_value(client):
    with patch("app.services.ai_explainer_service.GEMINI_API_KEY", ""):
        d = client.post("/api/v1/ai/ask", json={
            "question": "What is expenditure as a share of original cost?", "project_id": DEMO}).json()
    assert d["source"] == "rule_based"
    assert "6.75x original cost" in d["answer"]


def test_explanation_never_changes_official_scores(client):
    from app.services import risk_integration_service as ris
    row = ris.load_row(DEMO, AS_OF)
    before = ris.predict_block(row, "official_production")
    client.post("/api/v1/ai/explain/deep", json={"project_id": DEMO, "as_of": AS_OF,
                                                 "fcm_overrides": {"physical_progress_gap": 0.0}})
    after = ris.predict_block(row, "official_production")
    for t in ("cost", "schedule", "compound"):
        assert before[t]["probability"] == after[t]["probability"]
