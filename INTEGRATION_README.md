# RiskNexus ML Integration Package — INTEGRATION README

> **ANTIGRAVITY SHOULD INTEGRATE THE BACKEND/ML LAYER INTO THE COPIED RISK NEXUS REPOSITORY.**
>
> This package is an **integration package**, not a replacement repository. It contains **no frontend**. Do not overwrite, regenerate or restyle the existing RiskNexus frontend.

- **Package:** `RiskNexus_ML_Integration_Package_v2`
- **Date:** 2026-09-27
- **Project:** SIH 2026 — SIH26103 (RiskNexus / PAIMANA)
- **Verification:** fresh-extract audit in `docs/INTEGRATION_AUDIT_FINAL.md`

---

## 0. Rules for the integrating agent (read first)

1. **Copy these into the repository root:** `backend/` (whole folder), `docs/` and this file. Nothing else is needed.
2. **Never modify anything listed in §16.** If a test fails on a frozen file, **stop and report**. Do not re-hash, retrain, refit, recalibrate, re-threshold or regenerate anything.
3. **Never change thresholds or routing.** They live only in `backend/artifacts/deployment_v2/model_registry.json`. The frontend must never compute or apply thresholds itself.
4. **Frontend changes** are limited to calling the API in §12. Keep the disclaimers visible.
5. **Before you finish**, both of these must pass:
   - `python backend/scripts/verify_frozen_artifacts.py`
   - the full test suite (§11): **150 tests, 0 skipped, 0 failed**.

## 1. What this package contains

- **Backend:** a FastAPI application (`backend/app`) serving:
  - **ML prediction:** three frozen XGBoost production models (cost, schedule, compound risk within 6 months);
  - **LR benchmark:** three frozen Logistic Regression models, comparison only;
  - **SHAP:** exact TreeSHAP explanations of the production XGBoost models;
  - **FCM:** a fuzzy cognitive map reasoning and scenario layer, separate from ML;
  - **Existing dashboard endpoints:** projects, analytics, priority queue and Gemini text.
- **Frozen model artifacts** and their registry (`backend/artifacts/`).
- **The canonical scoring dataset** (`backend/data/phase6/enhanced_phase6_corrected.csv`, 25.8 MB, 65,047 rows, 13,497 projects).
- **Tests** (`backend/tests/`) with frozen reference predictions, freeze manifests and a schema snapshot.
- **Docs** (`docs/`): model manifest, integration-layer details, FCM approval template, final audit.

## 2. What is frozen

| Item | Why it is frozen |
|---|---|
| The 6 model bundles, 3 portable boosters and 3 support bundles | Trained on 2026-09-24 and verified to reproduce the frozen validation predictions exactly |
| `model_registry.json` | Holds the confirmed routing and thresholds |
| `fcm_weights.json` | The expert draft configuration; changes need domain approval (`docs/FCM_DOMAIN_APPROVAL_TEMPLATE.md`) |
| `enhanced_phase6_corrected.csv` | Checked at startup against its frozen SHA-256 |
| Feature definitions and preprocessing | These live inside the bundles |

**All 18 immutable files** are listed with their SHA-256 in `backend/FROZEN_CHECKSUMS.sha256`.

## 3. Production model routing (official predictions)

| Target | Model ID | Model | Feature set | Threshold |
|---|---|---|---|---|
| Cost | `cost_cuf_xgb` | XGBoost | COMMON (14 features) | **0.25** |
| Schedule | `schedule_cuf_xgb` | XGBoost | COMMON (14 features) | **0.20** |
| Compound | `compound_cuf_xgb` | XGBoost | COMMON (14 features) | **0.20** |

- **Decision rule:** `risk = probability >= threshold`, with `risk_level` of `HIGH` or `LOW`, computed by the backend.
- **Source:** the XGBoost and LR freeze manifests (2026-09-24), confirmed by the project owner on 2026-09-27.
- **Superseded:** any other routing (for example cost ENHANCED@0.30, or thresholds 0.88, 0.63 or 0.885) is obsolete.

## 4. Benchmark model routing (never official, never blended)

| Target | Model ID | Model | Feature set | C | Threshold |
|---|---|---|---|---|---|
| Cost | `cost_cuf_lr` | Logistic Regression | ENHANCED (25) | 0.1 | 0.25 |
| Schedule | `schedule_cuf_lr` | Logistic Regression | COMMON (14) | 100 | 0.20 |
| Compound | `compound_cuf_lr` | Logistic Regression | COMMON (14) | 1.0 | 0.20 |

At startup the backend refuses to run if the official set is not exactly the three XGBoost models, or if LR is marked able to replace them.

## 5. Directory structure

```
INTEGRATION_README.md                 <- this file
docs/
  MODEL_MANIFEST.md                   routing, features, hashes, verification
  INTEGRATION_LAYER.md                SHAP/FCM details, label map, FCM nodes/edges
  INTEGRATION_AUDIT_FINAL.md          fresh-extract audit results
  FCM_DOMAIN_APPROVAL_TEMPLATE.md     blank; FCM weights are NOT approved
backend/
  .env.example  .gitignore  .python-version
  requirements.txt  requirements-dev.txt
  FROZEN_CHECKSUMS.sha256             SHA-256 of all 18 immutable files
  app/
    main.py  config.py  schemas.py  integration_schemas.py
    routes/      risk.py (new) + health, projects, predictions, simulations, ai, analytics, actions
    services/    model_service, registry_service, project_service, feature_service,
                 risk_integration_service (new), shap_service, fcm_service, outcome_service, gemini_service
    explainability/  shap_engine.py, feature_labels.py
    fcm/             concepts.py, weights.py, engine.py, fcm_weights.json (frozen)
  artifacts/
    deployment_v2/model_registry.json             (frozen)
    frozen_phase6_v1/models/*.joblib, *_MANIFEST.json   (frozen)
    portable_phase6_v1/*.ubj, *_support.joblib, portable_manifest.json (frozen)
  data/phase6/enhanced_phase6_corrected.csv       (frozen, REQUIRED)
  demo_data/demo_projects.json, demo_rows.csv     demo labels / dev-only fallback
  scripts/verify_frozen_artifacts.py              integrity check (run it)
  scripts/verify_frozen_runtime.py                smoke test (scoring + SHAP)
  scripts/convert_frozen_xgboost_portable.py      provenance only; refuses to run
  tests/test_backend.py (101), tests/test_integration_layer.py (49), fixtures/, snapshots/
```

## 6. Required dataset location

- **Default path:** `backend/data/phase6/enhanced_phase6_corrected.csv`. It is bundled and needs no configuration.
- **Override:** set `CANONICAL_DATA_DIR` to an **absolute** folder containing the file.
- **Integrity:** at startup the file's SHA-256 must equal `e2aa83f3835b1f3b21633715cdc0441ac10a174a2e6832f623c00f464305458c`.
- **Remote source (Supabase Storage):** if the local file is absent and `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET` and `SUPABASE_OBJECT_PATH` are set, startup downloads the object **once** into `DATASET_CACHE_DIR` (default `backend/.dataset_cache`). The download goes to a temporary file, is checked (HTTP 200, full length, CSV header, SHA-256), and is renamed into the cache only after it passes. Later startups reuse a valid cached copy. Partial Supabase settings, a failed download or a wrong file fail startup with `DatasetConfigurationError`; the key never appears in logs or errors. `/model-info` reports `dataset.source` = `local`, `cache` or `supabase`.
- **If missing or altered:** startup fails with `DatasetConfigurationError`. There is **no silent demo fallback**. `ALLOW_DEMO_DATA=true` is an explicit dev-only escape hatch serving 4 projects; never use it for integration or production.
- **Content:** public-source OCMS/PAIMANA project monitoring records (IDs, costs, dates, sectors, states). It contains no personal data.
- **Git:** it must be committed. It is 25.8 MB, under GitHub's 100 MB limit, so no LFS is needed. `backend/.gitignore` re-includes it, but check the repository's root `.gitignore` with:

  ```
  git check-ignore -v backend/data/phase6/enhanced_phase6_corrected.csv
  ```

  This must print nothing.

## 7. Required Python versions

- **Supported:** Python **3.11, 3.12 or 3.13**. All were tested with 150/150 passing. `.python-version` says 3.12.
- **Not supported:**
  - 3.10: pandas 3 and numpy 2.4 need 3.11+.
  - 3.14: no scikit-learn 1.6.1 wheel.
- **scikit-learn must stay at 1.6.1**, the version the frozen pickles were saved with.
- **XGBoost 3.2.0** reproduces the frozen predictions exactly.
- **Platform:** verified on Linux x86-64. Native Windows is **untested**: the frozen XGBoost `.joblib` files embed a memory snapshot, and a few tests load them. The served runtime path uses the portable `.ubj` boosters. On Windows, run the suite in WSL or a Linux container.

## 8. Installation

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate          # Windows (WSL recommended): .venv\Scripts\activate
pip install -r requirements-dev.txt   # = requirements.txt + shap==0.51.0 (tests)
```

Use `requirements.txt` alone for a runtime-only deployment. There are no system packages, GPU or compiler requirements.

## 9. Environment configuration

- **No `.env` is required.** All defaults are correct inside the package.
- **To override:** `cp backend/.env.example backend/.env` and edit. The backend reads `backend/.env` explicitly.
- **Empty values:** an **empty or unset** value always means "use the default", so an empty `MODEL_ARTIFACT_DIR=` can no longer redirect the backend.

| Variable | Default | Purpose |
|---|---|---|
| `MODEL_ARTIFACT_DIR` | `backend/artifacts/deployment_v2` | Registry location (artifact paths are relative to it) |
| `CANONICAL_DATA_DIR` | `backend/data/phase6` | Folder with the scoring dataset |
| `VERIFY_DATASET_SHA256` | `true` | Fail startup if the dataset is not the frozen file |
| `ALLOW_DEMO_DATA` | `false` | Dev-only 4-project fallback |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`, `SUPABASE_OBJECT_PATH` | empty | Download the dataset from Supabase Storage when the local file is absent. Server-side secret; never expose to the frontend |
| `DATASET_CACHE_DIR`, `DATASET_DOWNLOAD_TIMEOUT_SECONDS` | `backend/.dataset_cache`, `120` | Where the downloaded CSV is cached; download timeout |
| `DEMO_DATA_DIR` | `backend/demo_data` | Demo labels (`demo_projects.json`) |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | CORS; add the deployed frontend URL. `*` is rejected by tests |
| `GEMINI_API_KEY` | empty | Optional; without it `/ai/explain` returns a template. Never commit a key |
| `GEMINI_MODEL`, `GEMINI_TIMEOUT_SECONDS` | `gemini-1.5-flash`, `15` | Gemini settings |
| `GEMINI_EXPLAINER_MODEL`, `AI_TIMEOUT_SECONDS` | `gemini-flash-latest`, `45` | Model and timeout for `/ai/explain/deep` and the REX assistant (`/ai/ask`). Without `GEMINI_API_KEY` these use a rule-based explainer |
| `SCHEDULE_ALERT_TOP_N`, `SCHEDULE_ALERT_TOP_PERCENT` | `50`, `10.0` | Priority-queue capacity |
| `LOG_LEVEL`, `REQUEST_MAX_SIZE_BYTES` | `INFO`, `1048576` | Misc |
| `TVM_DATA_DIR` | outside repo | Unused (the analysis route is empty) |

**Frontend variable (existing repo):** `VITE_API_BASE_URL`, default `http://localhost:8000/api/v1`.

## 10. Start the backend

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Startup order:**

1. Load and validate the registry.
2. Load and hash-verify the 6 models.
3. Load and hash-verify the dataset.

**Check it's working:**

- `GET http://localhost:8000/api/v1/health` returns `models_loaded: true`.
- `GET /api/v1/model-info` shows `dataset.mode = "canonical"` and `dataset.sha256_verified = true`.
- Interactive docs are at `/docs`.

## 11. Run the complete tests

```bash
cd backend
python scripts/verify_frozen_artifacts.py   # expect: PASS: 0 problem(s)
python scripts/verify_frozen_runtime.py     # expect: 3x PASS + final PASS
python -m pytest tests/ -rs                 # expect: 150 passed, 0 skipped
```

**Rules for the suite:**

- **Missing data fails the suite.** If the dataset or `shap` is missing, the suite **fails**; it never skips.
- **Schema snapshot:** `tests/snapshots/integration_schemas.json` locks the new API schemas. Refresh it only for an intentional contract change: `UPDATE_SCHEMA_SNAPSHOT=1 pytest -k schema_snapshot`.

**What the 150 tests cover:**

- frozen-model hash integrity;
- served predictions against frozen validation predictions (every validation row, all 6 models, < 1e-9);
- routing and thresholds against the freeze manifests;
- preprocessing and feature order;
- SHAP correspondence, additivity and TreeExplainer parity;
- FCM determinism, bounds and parity;
- API schemas;
- no future rows;
- target-leakage injection;
- dataset loaded and hash-verified;
- missing or altered dataset fails loudly;
- actual-outcome comparison uses registry thresholds;
- existing frontend routes still respond.

## 12. API endpoints

**Base URL:** `/api/v1`.

**Request body:** every POST body includes `project_id` (string) and `as_of` (`"YYYY-MM"` or `"YYYY-MM-DD"`).

**Data selection:** the backend uses only the latest dataset row at or before `as_of`, and returns it as `data_row_month`.

**Errors:**

- `404`: unknown project, or no row at or before `as_of`.
- `422`: validation error.

### New integration endpoints

| Method | Path | Purpose | Request fields | Key response fields |
|---|---|---|---|---|
| **POST** | **`/risk/assess`** **(primary)** | ML + SHAP + FCM + benchmark in one call | `project_id`, `as_of`; optional `include_benchmark` (true), `include_fcm` (true), `scenario_overrides` {input concept: 0–1}, `top_n` (5) | `ml.{cost,schedule,compound}` = `{probability, threshold, risk, risk_level, model_id, model_name, feature_set, official_prediction, horizon_months}`; `shap.explanations.<target>` = `{probability, threshold, risk, expected_value, raw_margin, shap_sum, additivity_error, positive_contributors[], negative_contributors[]}`; `fcm` (see below); `benchmark` (same shape as `ml`); disclaimers |
| POST | `/risk/predict` | Official XGBoost only | `project_id`, `as_of`; query `include_benchmark=true` for LR | `ml`, `benchmark` |
| POST | `/risk/explain` | XGBoost + SHAP | `project_id`, `as_of`; optional `targets` (all three), `top_n` | `ml`, `shap` |
| POST | `/risk/fcm` | FCM reasoning / what-if | `project_id`, `as_of`; optional `scenario_overrides`, `max_pathways` (5) | `fcm.{nodes[], edges[], activated_concepts[], risk_increasing_pathways[], protective_pathways[], pathway_note, propagated_risk_state, scenario_overrides, iterations, converged, review_status, disclaimer}` |
| GET | `/fcm/graph` | FCM structure for drawing | — | `nodes[]`, `edges[]`, `node_order[]`, `weight_matrix[][]`, `update_rule`, `damping`, `input_normalisation` |
| GET | `/model-info` | Routing, thresholds and provenance for display | — | `production[]` / `benchmark[]` `{model_id, threshold, feature_set, ordered_features, artifact_sha256, validation_metrics}`, `dataset{mode, sha256_verified, rows, projects}`, `runtime` |

**SHAP contributor object:**

```
{rank, feature, label, value, value_missing, shap_value, abs_shap_value, direction: "increasing_risk" | "decreasing_risk"}
```

### Existing endpoints (used by the current frontend `src/services/mlApi.js`; unchanged contracts)

- **System:** `GET /health`, `GET /models/status`.
- **Projects:**
  - `GET /projects` (paging and search), `GET /projects/{id}`;
  - `GET /projects/{id}/timeline`, `GET /projects/{id}/trajectory`, `GET /projects/{id}/assessment?as_of=`;
  - `GET /projects/{id}/actual-outcome?as_of=`;
  - `GET /projects/metrics`, `GET /dashboard/metrics`, `POST /projects/compare`.
- **Analytics and actions:** `GET /analytics/overview`, `GET /actions/priority-queue`.
- **Predictions:**
  - `POST /predict/official` (field name `risk_score`, not `probability`);
  - `POST /predict/benchmark`;
  - `POST /predict/analysis` (always an empty list: no exploratory models).
- **FCM and AI:** `POST /simulate/fcm` (older FCM response shape), `POST /ai/explain` (Gemini or template text).
- **AI explainer:** `POST /ai/explain/deep` (term-by-term explanation for one project-month), `POST /ai/ask` (REX assistant), `GET /ai/glossary` (terms behind the (i) tooltips).

**Change in this package:** `/projects/{id}/actual-outcome` now compares outcomes with the **official predicted classes** at the registry thresholds. It previously passed no predictions, so every prediction counted as "LOW", actual events all showed as false negatives and non-events as true negatives. The response shape is unchanged.

## 13. SHAP integration

- **Engine:** `backend/app/explainability/shap_engine.py`.
- **Model:** it explains the exact booster the backend serves, using the frozen preprocessor.
- **Method:** XGBoost native TreeSHAP (`pred_contribs`), identical to `shap.TreeExplainer` (a test checks this). The `shap` package is only a test dependency.
- **Additivity:** `expected_value + Σ shap_value = raw_margin` is checked on every call; a failure raises instead of returning wrong values.
- **Units:** SHAP values are **log-odds contributions to the raw XGBoost score before calibration**. **They are not probability percentages; never render them with a % sign.** Calibration is monotonic increasing, so `direction` and ranking carry over to the probability.
- **Aggregation:** columns roll back to the 14 raw features. Missing-value indicators map to their feature; `sector_std` one-hot columns map to `sector_std`.
- **Values:** `value` is the raw value at T. `value_missing: true` means the frozen preprocessor imputed it.
- **Labels:** `backend/app/explainability/feature_labels.py` (full table in `docs/INTEGRATION_LAYER.md`). Technical names are never changed.
- **Required UI wording:** "SHAP describes model associations, not causes." It is included as `shap.disclaimer`.
- **LR:** no SHAP for LR (benchmark only).

## 14. FCM integration

- **Modules:**
  - `backend/app/fcm/concepts.py`: 9 concepts and initial-state rules;
  - `backend/app/fcm/weights.py`: loads and validates `fcm_weights.json` and builds the weight matrix `W[source, target]`;
  - `backend/app/fcm/engine.py`: propagation and pathways.
- **Concepts:**
  - six inputs, fixed during propagation: physical progress gap, expenditure pressure, reported delay pressure, cost revision pressure, schedule revision pressure, forecast cost pressure;
  - two intermediates: `schedule_pressure`, `cost_pressure`;
  - one output: `intervention_priority`.
- **Edges:** 16 directed edges, all positive, weights 0.3 to 0.9.
- **Update rule:** `candidate = sigmoid(logit(A0) + Wᵀ·A)`, then `A ← 0.5·A + 0.5·candidate`.
- **Stopping rule:** stop when the maximum change is below 1e-6, or after 50 iterations.
- **Determinism:** deterministic, and identical to the existing `/simulate/fcm` engine.
- **Scenarios:** `scenario_overrides` accepts input concepts only, clipped to [0, 1]. Output concepts return 422.
- **Independence from ML:** the FCM **never** changes ML probabilities (a test checks this).
- **Pathways:** `strength = source_state × Π weights`.
- **Protective pathways:** always empty, because the draft has no negative edges. The response's `pathway_note` explains this.

**Status:** the current FCM weights are **expert-defined draft weights**, marked `DRAFT_NOT_DOMAIN_APPROVED`.

- **No approval recorded:** the approval template in `docs/` is blank.
- **Misleading basis text:** the edge `basis` strings begin "Expert: …", but no approval is recorded.
- **Required UI labelling:** show the FCM as scenario reasoning with the label **"Expert-defined draft weights"**. Never present it as a prediction, a probability or proof of causality.

## 15. What to copy into the existing repository

| From package | To repository | Notes |
|---|---|---|
| `backend/` (entire folder) | `<repo>/backend/` | If the repo already has a `backend/`, replace it with this one. Don't merge old artifacts or old tests. First diff for any custom code you must keep, and re-apply it only outside §16 |
| `docs/*` | `<repo>/docs/` (or `docs/ml/`) | Reference only |
| `INTEGRATION_README.md` | `<repo>/backend/INTEGRATION_README.md` or root | Keep it with the backend |

**What must come from the existing repository:**

- the frontend (`src/`, `public/`, `package.json`, Vite config);
- the root README, licence, CI configuration and root `.gitignore`.

**Frontend work that is safe to do (not included here):**

- call `/risk/assess`, `/fcm/graph` and `/model-info`;
- display the ML, SHAP and FCM disclaimers.

**Frontend clean-up:**

- `mlApi.js` mentions a `panel_tenure_warning` for LR. The frozen LR models no longer use panel-tenure features and the field is not returned, so drop that expectation.

## 16. Files that must NOT be modified

- `backend/artifacts/**` (all models, boosters, support bundles, manifests, `model_registry.json`)
- `backend/data/phase6/enhanced_phase6_corrected.csv`
- `backend/app/fcm/fcm_weights.json` (changes only through documented domain approval)
- `backend/FROZEN_CHECKSUMS.sha256`
- `backend/tests/fixtures/**` and `backend/tests/snapshots/**`
- the pinned `scikit-learn==1.6.1` and `xgboost==3.2.0` in `backend/requirements.txt`

**Do not run** `scripts/convert_frozen_xgboost_portable.py`; it refuses to run anyway.

**Do not re-add** any old-generation files: `artifacts/deployment_v2/models/`, `research_archive/`, `verification_results.json`, thresholds 0.88, 0.63 or 0.885, or `schedule_e3_xgb`.

## 17. Known limitations

- **FCM weights** are **expert-defined draft weights**. They are not domain-approved, not learned from data and not calibrated, and they establish no causality.
- **SHAP** values are log-odds associations, not causes and not probability percentages.
- **Schedule alert rate:** at threshold 0.20 the schedule model flags about 38% of validation rows. Present schedule risk as a ranked or prioritised list; `/actions/priority-queue` already caps capacity.
- **Horizon:** predictions cover a 6-month horizon and serve ranking and alerting. They are not guarantees.
- **Coverage:** only projects and months present in the bundled dataset can be scored. There is no raw-feature endpoint for new projects.
- **Training provenance:** the CV pipeline that trained the frozen models is not included. Predictions are reproducible; training is not reproducible from this package.
- **Split B:** Split B (temporal) was not frozen.
- **Windows:** native Windows is untested (see §7).
- **Gemini SDK:** `google-generativeai` is the legacy Gemini SDK. It is optional and only used by `/ai/explain`.
