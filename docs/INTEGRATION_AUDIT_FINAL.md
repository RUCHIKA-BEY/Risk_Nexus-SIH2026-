# Final integration audit — RiskNexus_ML_Integration_Package_v2

**Date:** 2026-09-27.

**Method:**

- extract the ZIP into an empty directory;
- create brand-new virtual environments for Python 3.11, 3.12 and 3.13 from the package's own `backend/requirements-dev.txt`;
- run every check against the extracted copy;
- start a real uvicorn server using a `.env` copied from `.env.example`.

**Frozen models:** no model was retrained, recalibrated, retuned or modified.

## Results

| # | Check | Result |
|---|---|---|
| 1 | Requirements install (3.11 / 3.12 / 3.13, fresh envs) | ✅ all three OK. Resolved: scikit-learn 1.6.1, xgboost 3.2.0, pandas 3.0.2, numpy 2.4.4, joblib 1.6.0, shap 0.51.0, fastapi 0.141.1 |
| 2 | `verify_frozen_artifacts.py` (18 immutable files) | ✅ PASS, 0 problems |
| 3 | Frozen model files vs the ORIGINAL frozen baseline archives | ✅ all 6 byte-identical |
| 3b | Portable boosters, support bundles, registry, FCM weights vs lead handoff | ✅ all 8 byte-identical |
| 3c | Bundled dataset vs Phase 6 handoff | ✅ identical, SHA-256 `e2aa83f3…458c` |
| 4 | Full test suite | ✅ **150 passed, 0 failed, 0 errors, 0 skipped** on each of Python 3.11, 3.12 and 3.13 (101 backend + 49 integration) |
| 5 | Runtime smoke test (scoring + TreeSHAP) | ✅ PASS for all three production models |
| 6 | Old-generation leftovers | ✅ `deployment_v2/models/` absent; no live code or config references 0.88, 0.63, 0.885, 3.4.1, scikit-learn 1.8 or `schedule_e3_xgb` |
| 7 | Live server with `.env` copied from `.env.example` | ✅ starts; `/health` ok; models loaded |
| 7a | Dataset actually loaded | ✅ `/model-info` → `mode=canonical`, `sha256_verified=true`, 65,047 rows, 13,497 projects |
| 7b | Routing and thresholds served | ✅ XGBoost COMMON 0.25 / 0.20 / 0.20; LR ENHANCED 0.25, COMMON 0.20, COMMON 0.20 |
| 7c | `/risk/assess` | ✅ ML + SHAP + FCM + benchmark; SHAP additivity error 7.5e-07 |
| 7d | FCM determinism over HTTP | ✅ identical responses; converged; status `DRAFT_NOT_DOMAIN_APPROVED` |
| 7e | `/fcm/graph` | ✅ 9 nodes, 16 edges |
| 7f | `/predict/official` class consistent with threshold | ✅ all three targets |
| 7g | `/projects/{id}/actual-outcome` | ✅ uses official predicted class (demo "Cost True Positive" → TP) |
| 8 | Dataset removed → startup | ✅ fails, exit code 3, `DatasetConfigurationError: Canonical dataset not found …` |
| 8b | Dataset removed → pytest | ✅ fails (collection error); nothing is skipped |

## What the 150 tests verify

- **Model artifact integrity:**
  - frozen, booster and support-bundle hashes;
  - the 18-file checksum manifest;
  - no old-generation files present.
- **Frozen prediction equivalence:**
  - served probabilities equal the saved frozen validation predictions, on every validation row of all 6 models (< 1e-9);
  - the portable booster equals the frozen training estimator;
  - the API equals service scoring;
  - frozen sample rows (one HIGH and one LOW per model) are reproduced.
- **Routing and thresholds:** they match both freeze manifests, and old-generation IDs are rejected.
- **Preprocessing:** the exact 14-feature COMMON order is present in both the registry and the bundles.
- **SHAP:**
  - the SHAP probability equals the served probability;
  - additivity and aggregation hold on 290 rows × 3 models;
  - the margin is the deployed booster's margin;
  - values equal `shap.TreeExplainer` on the frozen estimator.
- **FCM:**
  - the weights file is unchanged;
  - results are deterministic and identical to the existing engine;
  - input clamping, bounds and override validation work;
  - pathways are consistent with the graph;
  - the FCM cannot alter ML output.
- **API:**
  - schemas match the snapshot;
  - endpoint shapes and error codes are correct;
  - existing frontend routes still respond.
- **Leakage:**
  - no target, split or identity columns appear in any model;
  - injected target values change nothing;
  - no future rows are used.
- **Data:**
  - the dataset is bundled, loaded and hash-verified;
  - a missing or altered dataset fails loudly.

## Remaining limitations (not blockers)

- **FCM:** the FCM weights are **expert-defined draft weights**. They are not domain-approved.
- **Windows:** native Windows was not tested; use WSL or Linux.
- **Schedule alert rate:** about 38% at threshold 0.20; present schedule risk as a ranked list.
- **Training provenance:** the CV training script is not included (predictions are reproducible; training is not).
