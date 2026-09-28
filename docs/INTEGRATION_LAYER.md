# RiskNexus integration layer — ML, SHAP and FCM

Added 2026-09-27. Additive only: the frozen model files, `model_registry.json`,
`fcm_weights.json` and every existing route are unchanged.

## Routing (authoritative, confirmed by the project owner 2026-09-27)

Source: `XGBOOST_BASELINE_FREEZE_MANIFEST.json` and `LR_BASELINE_FREEZE_MANIFEST.json`.

| Target | Production model | Feature set | Threshold | LR benchmark | Feature set | C | Threshold |
|---|---|---|---|---|---|---|---|
| Cost | `cost_cuf_xgb` | COMMON | 0.25 | `cost_cuf_lr` | ENHANCED | 0.1 | 0.25 |
| Schedule | `schedule_cuf_xgb` | COMMON | 0.20 | `schedule_cuf_lr` | COMMON | 100 | 0.20 |
| Compound | `compound_cuf_xgb` | COMMON | 0.20 | `compound_cuf_lr` | COMMON | 1.0 | 0.20 |

- **Source of routing values:** thresholds and routing are read from `model_registry.json`; the code never computes or changes them.
- **Decision rule:** `risk = probability >= threshold`, and `risk_level` is `HIGH` or `LOW`.
- **Frontend:** the frontend never applies thresholds itself.

## Endpoints (prefix `/api/v1`)

| Method | Path | Returns |
|---|---|---|
| GET | `/model-info` | Routing, thresholds, ordered features, artifact hashes, validation metrics, runtime versions |
| POST | `/risk/predict` (`?include_benchmark=true`) | `ml` (official XGBoost), optional `benchmark` (LR) |
| POST | `/risk/explain` | `ml` + `shap` for the requested targets |
| POST | `/risk/fcm` | `fcm` reasoning for the project-month, optional scenario overrides |
| GET | `/fcm/graph` | Concepts, edges and the numeric weight matrix |
| POST | `/risk/assess` | `ml` + `shap` + `fcm` + `benchmark` |

**Request body:** `{"project_id": "...", "as_of": "YYYY-MM[-DD]"}`.

**Data used:** the row at or before `as_of` only. The row actually used is returned as `data_row_month`.

**Unchanged routes:** `/predict/official`, `/predict/benchmark`, `/simulate/fcm` and the other existing routes still serve the current frontend.

Full JSON schemas are in `tests/snapshots/integration_schemas.json`. A test fails if they change.

## SHAP

- **Method:** exact TreeSHAP on the booster the backend actually serves, with the frozen preprocessor. Nothing is refitted.
- **Equivalence:** XGBoost native `pred_contribs` is identical to `shap.TreeExplainer`. A test checks this against the frozen training estimator.
- **Space:** raw log-odds before sigmoid calibration.
- **Additivity:** `expected_value + sum(shap) = raw_margin` is checked on every call, with tolerance 1e-4 (observed errors are about 1e-6).
- **Calibrated probability:** `calibrator(sigmoid(raw_margin))`, the same computation as `/predict`.
- **Direction:** the calibrator slope is positive for all three models, so SHAP direction carries over to the probability.
- **Magnitude:** SHAP values are not probability points.
- **Aggregation:** transformed columns are summed back to their raw feature. Missing-value indicators go to their feature; `sector_std` one-hot columns go to `sector_std`.
- **Contributor fields:** `rank`, `feature`, `label`, `value`, `value_missing`, `shap_value`, `abs_shap_value`, `direction`.
- **Top-N:** the top 5 increasing and top 5 decreasing contributors are returned.
- **Interpretation:** SHAP describes model associations, not causes.

### Feature-label mapping (`app/explainability/feature_labels.py`)

| Feature | Label | Used by |
|---|---|---|
| `original_cost` | Original approved cost (Rs crore) | all XGBoost + all LR |
| `planned_duration_months` | Planned duration (months) | all XGBoost + all LR |
| `cumulative_expenditure` | Cumulative expenditure to date (Rs crore) | all XGBoost + all LR |
| `cumulative_to_original_ratio` | Expenditure as share of original cost | all XGBoost + all LR |
| `months_from_original_commissioning` | Months past (+) / before (-) original commissioning date | all XGBoost + all LR |
| `exp_change_1m` | Expenditure change, last 1 month | all XGBoost + all LR |
| `exp_change_3m` | Expenditure change, last 3 months | all XGBoost + all LR |
| `exp_slope_3m` | Expenditure trend (3-month slope) | all XGBoost + all LR |
| `n_cost_revisions_to_date` | Number of cost revisions to date | all XGBoost + all LR |
| `n_schedule_revisions_to_date` | Number of schedule revisions to date | all XGBoost + all LR |
| `sector_std` | Sector | all XGBoost + all LR |
| `expenditure_available` | Expenditure reported this month | all XGBoost + all LR |
| `planned_completion_available` | Planned completion date available | all XGBoost + all LR |
| `sector_available` | Sector recorded | all XGBoost + all LR |
| `current_forecast_cost` | Current forecast cost (Rs crore) | LR cost benchmark only |
| `forecast_to_original_ratio` | Forecast cost / original cost | LR cost benchmark only |
| `reported_delay_months` | Reported delay at T (months) | LR cost benchmark only |
| `forecast_change_1m` | Forecast-cost change, last 1 month | LR cost benchmark only |
| `forecast_change_3m` | Forecast-cost change, last 3 months | LR cost benchmark only |
| `forecast_slope_3m` | Forecast-cost trend (3-month slope) | LR cost benchmark only |
| `delay_change_1m` | Reported-delay change, last 1 month | LR cost benchmark only |
| `delay_change_3m` | Reported-delay change, last 3 months | LR cost benchmark only |
| `delay_slope_3m` | Reported-delay trend (3-month slope) | LR cost benchmark only |
| `delay_available` | Delay reported this month | LR cost benchmark only |
| `current_anticipated_completion_available` | Anticipated completion date available | LR cost benchmark only |

## FCM (expert-defined DRAFT — `DRAFT_NOT_DOMAIN_APPROVED`)

- **Weights and rules:** unchanged from `app/fcm/fcm_weights.json` (config version `2ecb7359ecf3`) and the existing normalisation rules. They are configurable assumptions, not learned values and not derived from SHAP.
- **Relationship to ML:** the FCM never alters ML outputs. States are not probabilities, and pathways do not establish causality.
- **Evidence labels:** each edge's `basis` text says "Expert: …", but no approval has been recorded. Treat these as draft rationales until `FCM_DOMAIN_APPROVAL_TEMPLATE.md` is completed.

### Nodes

| Concept | Label | Role | Initial-state rule (draft) |
|---|---|---|---|
| `physical_progress_gap` | Physical progress gap | input | `clip(1 - physical_progress_pct/100, 0, 1) if physical_progress_available else 0.5` |
| `expenditure_progress_gap` | Expenditure pressure | input | `clip(cumulative_to_original_ratio / 3, 0, 1); missing ratio -> 0.5 before scaling` |
| `reported_delay_pressure` | Reported delay pressure | input | `clip(reported_delay_months / 60, 0, 1); missing -> 0` |
| `cost_revision_pressure` | Cost revision pressure | input | `clip(n_cost_revisions_to_date / 5, 0, 1); missing -> 0` |
| `schedule_revision_pressure` | Schedule revision pressure | input | `clip(n_schedule_revisions_to_date / 5, 0, 1); missing -> 0` |
| `forecast_cost_pressure` | Forecast cost pressure | input | `clip((forecast_to_original_ratio - 1) / 2, 0, 1); missing ratio -> 1 before scaling` |
| `schedule_pressure` | Schedule pressure | intermediate | `initial = mean(reported_delay_pressure, schedule_revision_pressure)` |
| `cost_pressure` | Cost pressure | intermediate | `initial = mean(expenditure_progress_gap, cost_revision_pressure)` |
| `intervention_priority` | Intervention priority | output | `initial = mean(schedule_pressure, cost_pressure)` |

### Edges (W[source, target])

| # | Source | Target | Weight | Sign | Basis (verbatim from config) |
|---|---|---|---|---|---|
| 1 | `physical_progress_gap` | `schedule_pressure` | +0.70 | positive | Expert: projects with large physical progress gaps typically face schedule overruns |
| 2 | `physical_progress_gap` | `cost_pressure` | +0.50 | positive | Expert: stalled physical progress leads to idle resource costs |
| 3 | `expenditure_progress_gap` | `cost_pressure` | +0.80 | positive | Expert: spending outpacing physical progress is the primary cost overrun signal |
| 4 | `expenditure_progress_gap` | `schedule_pressure` | +0.40 | positive | Expert: expenditure-progress misalignment often co-occurs with schedule problems |
| 5 | `reported_delay_pressure` | `schedule_pressure` | +0.80 | positive | Expert: reported delay is directly linked to schedule pressure |
| 6 | `reported_delay_pressure` | `cost_pressure` | +0.50 | positive | Expert: delays increase holding and idling costs |
| 7 | `cost_revision_pressure` | `cost_pressure` | +0.90 | positive | Expert: repeated cost revisions are a leading indicator of budget overrun |
| 8 | `cost_revision_pressure` | `intervention_priority` | +0.60 | positive | Expert: high revision counts trigger review protocols |
| 9 | `schedule_revision_pressure` | `schedule_pressure` | +0.90 | positive | Expert: repeated schedule revisions directly reflect schedule instability |
| 10 | `schedule_revision_pressure` | `intervention_priority` | +0.60 | positive | Expert: repeated schedule revisions signal persistent problems requiring intervention |
| 11 | `forecast_cost_pressure` | `cost_pressure` | +0.75 | positive | Expert: forecast cost exceeding original cost is a direct cost overrun precursor |
| 12 | `forecast_cost_pressure` | `cost_revision_pressure` | +0.50 | positive | Expert: forecast cost inflation often precipitates formal cost revisions |
| 13 | `schedule_pressure` | `intervention_priority` | +0.70 | positive | Expert: projects under schedule pressure require prioritised review |
| 14 | `cost_pressure` | `intervention_priority` | +0.70 | positive | Expert: projects under cost pressure require prioritised review |
| 15 | `schedule_pressure` | `cost_pressure` | +0.40 | positive | Expert: schedule delays create cost escalation through prolonged resource deployment |
| 16 | `cost_pressure` | `schedule_pressure` | +0.30 | positive | Expert: budget pressures can cause contractors to reduce staffing, slowing progress |

- **Sign meaning:** a positive weight means a higher source state raises the target; a negative weight means it lowers the target (protective).
- **Current draft:** it has no negative edges, so `protective_pathways` is always empty and `pathway_note` says so.

### Propagation

- **Update rule:** `candidate_i = sigmoid(logit(A0_i) + sum_j W[j,i]·A_j)`, then `A ← 0.5·A + 0.5·candidate`.
- **Clamping:** input concepts are fixed at their initial values. All states are clipped to [0, 1].
- **Stopping rule:** stop when the maximum change is below 1e-6, or after 50 iterations.
- **Determinism:** the computation is fully deterministic.
- **Parity:** it reproduces the existing `/simulate/fcm` engine exactly (a test checks this).
- **Activated:** a concept whose final state is above 0.5, the sigmoid midpoint.
- **Pathway strength:** `final_state(source) × product(weights)` over simple paths from an input concept to `cost_pressure`, `schedule_pressure` or `intervention_priority`.

## Tests — `tests/test_integration_layer.py` (48 tests: the original 44 + 4 dataset/outcome checks)

**Frozen predictions**
- The six frozen files have unchanged SHA-256 hashes.
- Registry routing matches the freeze manifests.
- The served probability equals the saved frozen validation predictions for every validation row of all six models (< 1e-9).
- The portable booster equals the frozen training estimator.
- The API matches service-level scoring.

**SHAP**
- The SHAP probability equals the served probability.
- Additivity holds, and aggregation preserves the sum, on 290 rows × 3 models.
- The margin is the deployed booster's own margin.
- Native TreeSHAP equals `shap.TreeExplainer` on the frozen estimator.

**FCM**
- The weights file is unchanged and valid.
- Results are deterministic.
- Results match the existing engine.
- Inputs stay clamped and outputs stay bounded.
- Overrides are validated.
- Pathways are consistent with the graph.
- The FCM cannot change ML output.

**Schema**
- The response schemas match the snapshot.
- Endpoint shapes and error codes are as documented.
- The existing frontend routes still respond.

**Leakage**
- No target, eligibility, censoring, split or identity column appears in any model's features.
- The production models use none of the legacy timeline fields.
- The FCM reads no target column.
- Injected target values cannot change scores or SHAP.
- Only rows at or before `as_of` are used.

**How to run:**

```
cd backend
pip install -r requirements-dev.txt
python -m pytest tests/        # 149 tests, 0 skipped; the dataset is bundled
```

## Known open items

- **FCM approval:** the FCM weights and normalisation rules are **expert-defined draft weights** that still need domain approval.
- **Resolved on 2026-09-27:**
  - the old-generation tests were updated to the frozen configuration;
  - the obsolete artifacts were archived outside the package;
  - the dataset is bundled at `backend/data/phase6/`.
