# MODEL_MANIFEST — RiskNexus (SIH26103)

**Revision:** 4 — 2026-09-27. Authoritative for the ML integration package.

**Status:** frozen models verified, routing confirmed, and the package verified by a fresh-extract audit (`docs/INTEGRATION_AUDIT_FINAL.md`).

## 1. Routing (confirmed by the project owner, 2026-09-27)

**Source:** `XGBOOST_BASELINE_FREEZE_MANIFEST.json` and `LR_BASELINE_FREEZE_MANIFEST.json` (frozen 2026-09-24). Copies are in `backend/tests/fixtures/`.

**Superseded:** the earlier task brief proposed cost ENHANCED@0.30, schedule@0.25 and compound@0.30. It is superseded and must not be used.

### Production (official predictions)

| Target | Model ID | Algorithm | Feature set | Threshold | Config |
|---|---|---|---|---|---|
| Cost | `cost_cuf_xgb` | XGBoost | COMMON (14) | **0.25** | depth 3, lr 0.05, 400 trees, min_child_weight 10, λ 10 |
| Schedule | `schedule_cuf_xgb` | XGBoost | COMMON (14) | **0.20** | depth 3, lr 0.05, 400 trees, min_child_weight 10, λ 10 |
| Compound | `compound_cuf_xgb` | XGBoost | COMMON (14) | **0.20** | depth 2, lr 0.05, 400 trees, min_child_weight 5, λ 5 |

### Benchmark (never official, never blended)

| Target | Model ID | Algorithm | Feature set | C | Threshold |
|---|---|---|---|---|---|
| Cost | `cost_cuf_lr` | Logistic Regression | ENHANCED (25) | 0.1 | 0.25 |
| Schedule | `schedule_cuf_lr` | Logistic Regression | COMMON (14) | 100 | 0.20 |
| Compound | `compound_cuf_lr` | Logistic Regression | COMMON (14) | 1.0 | 0.20 |

### Training protocol (all six models)

- **Data:** Split A train only. Test rows were never used.
- **Cross-validation:** 5-fold StratifiedGroupKFold by `project_id`.
- **Model selection:** validation PR-AUC.
- **Threshold:** maximum validation F1 on a 0.05 grid.
- **Calibration:** sigmoid calibration fitted on validation raw scores.
- **Excluded legacy features:** `project_age_months`, `elapsed_planned_ratio` and `planned_remaining_months`.

## 2. Inputs

**COMMON (ordered):**

`original_cost`, `planned_duration_months`, `cumulative_expenditure`, `cumulative_to_original_ratio`, `months_from_original_commissioning`, `exp_change_1m`, `exp_change_3m`, `exp_slope_3m`, `n_cost_revisions_to_date`, `n_schedule_revisions_to_date`, `sector_std`, `expenditure_available`, `planned_completion_available`, `sector_available`

**ENHANCED adds** (used only by `cost_cuf_lr`):

`current_forecast_cost`, `forecast_to_original_ratio`, `reported_delay_months`, `forecast_change_1m`, `forecast_change_3m`, `forecast_slope_3m`, `delay_change_1m`, `delay_change_3m`, `delay_slope_3m`, `delay_available`, `current_anticipated_completion_available`

**Preprocessing** is fitted and frozen inside each bundle:

- **Numeric and binary:** median imputation with missing-value indicators, then StandardScaler.
- **`sector_std`:** constant "MISSING", then OneHotEncoder with `handle_unknown="ignore"`.

**Inference path:**

```
raw = model(preprocessor(X))
probability = calibrator(raw)
risk = probability >= threshold
```

## 3. Artifact hashes (SHA-256)

| File (under `backend/artifacts/`) | SHA-256 |
|---|---|
| `frozen_phase6_v1/models/cost_cuf_xgb.joblib` | `1d260c90e541790464ccb1d5310e11d2207dcc81f53ab24402ca87d714891370` |
| `frozen_phase6_v1/models/schedule_cuf_xgb.joblib` | `78e3873290b57d72572bcf4c739b3cede630153551c07d9900350769e0652198` |
| `frozen_phase6_v1/models/compound_cuf_xgb.joblib` | `351a5bd75f76b5df178b972c19e1dfef6345b4029dbf077f8882d88e1fe58b68` |
| `frozen_phase6_v1/models/cost_cuf_lr.joblib` | `85bf848f985081189b44310be7c80885401ce65d0c9bf011354d91ae3a401836` |
| `frozen_phase6_v1/models/schedule_cuf_lr.joblib` | `41e3e7bfff283d0d847b6316fbd2a214be1ba3c17ecb8aa1418a87f59aad90a8` |
| `frozen_phase6_v1/models/compound_cuf_lr.joblib` | `31ad2fdf2167d02f54d645a5ffc79485555178e87695b1f6ff79b7c7a22a08ee` |
| `portable_phase6_v1/cost_cuf_xgb.ubj` | `d43e6e40f529bfa1274f903c5729373a070f5119ca9a72d57bf64e5103fd8927` |
| `portable_phase6_v1/schedule_cuf_xgb.ubj` | `dff5c04e727e804ee0f08faba1a5f24024cdd26f7a718b938a5d9ad6926cf061` |
| `portable_phase6_v1/compound_cuf_xgb.ubj` | `0e65322e9adf1e7d68228ed691629126cb71ab7be671c24a50c133d9c6f195df` |
| `portable_phase6_v1/cost_cuf_xgb_support.joblib` | `69542264208dcc57bc9e81f835875c6a109ff1a7f69c9c2af36ddbb24042403e` |
| `portable_phase6_v1/schedule_cuf_xgb_support.joblib` | `b4ac82ef3bdb804c0c1f59f93c5a323d1f53418604616abac8bd04ef0632f203` |
| `portable_phase6_v1/compound_cuf_xgb_support.joblib` | `c54b23fd042ea53ce860e3e3e212fa3a80bfb49ea911e79027befed14dfdc2bf` |
| `data/phase6/enhanced_phase6_corrected.csv` (under `backend/`) | `e2aa83f3835b1f3b21633715cdc0441ac10a174a2e6832f623c00f464305458c` |

**Which files are served:**

- **XGBoost:** the portable UBJ booster plus its support bundle. On all 65,407 rows its output is bit-identical to the frozen training estimator.
- **LR:** the frozen bundles are loaded directly.

## 4. Verification

- **Frozen reproduction:** all 6 served models reproduce their saved frozen validation predictions on every validation row (maximum difference < 1e-9).
- **SHAP additivity:** `expected_value + Σ SHAP = raw margin`; observed error is about 1e-6.
- **TreeSHAP parity:** equal to `shap.TreeExplainer` on the frozen estimators.
- **Runtime:** scikit-learn **1.6.1** (the version the pickles were saved with) and XGBoost **3.2.0**, on Python 3.11, 3.12 and 3.13.

## 5. Known limitations

- **Training code provenance:** the CV pipeline that produced the frozen bundles is not included. The bundled `run_corrected_phase6.py` from the lead package is a different, non-CV script. Predictions are fully reproducible from the bundles; training is not reproducible from the supplied code.
- **Split B:** Split B (temporal) was not frozen. Its test partition has only 153 eligible rows.
- **Schedule alert rate:** at threshold 0.20 the schedule model flags about 38% of validation rows. Use ranking or prioritisation in the UI.
- **FCM:** the FCM weights are **expert-defined draft weights** (`DRAFT_NOT_DOMAIN_APPROVED`).
