/**
 * SIH26103 — ML Backend API client.
 * All endpoints talk to FastAPI at VITE_API_BASE_URL (default http://localhost:8000/api/v1).
 *
 * ROUTING RULES (enforced here, mirrors backend):
 * - official predictions: cost_cuf_xgb, schedule_cuf_xgb, compound_cuf_xgb only
 * - analysis: cost_e3_xgb, cost_e4_xgb, compound_e1_xgb (not official, never blended)
 * - benchmark: LR models (benchmark_only, may_replace_xgboost=false)
 * - schedule_e3_xgb: never requested
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const RISK_SCORE_DISCLAIMER =
  'Risk scores are uncalibrated model outputs and are not literal real-world probabilities.';

const FCM_DISCLAIMER =
  'Expert-weighted scenario simulation; not an official model prediction or causal estimate.';

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `API error ${response.status}`);
  }
  return response.json();
}

// ── Health & Status ─────────────────────────────────────────────────────────────

export async function fetchMLHealth() {
  return apiFetch('/health');
}

export async function fetchModelsStatus() {
  return apiFetch('/models/status');
}

export async function fetchModelInfo() {
  return apiFetch('/model-info');
}

// ── Projects ────────────────────────────────────────────────────────────────────

export async function fetchMLProjects(options = {}) {
  const params = new URLSearchParams();
  if (options.page) params.set('page', options.page);
  if (options.pageSize || options.page_size) params.set('page_size', options.pageSize || options.page_size);
  if (options.search) params.set('search', options.search);
  if (options.sector) params.set('sector', options.sector);
  if (options.state) params.set('state', options.state);
  if (options.status) params.set('status', options.status);
  if (options.sortBy || options.sort_by) params.set('sort_by', options.sortBy || options.sort_by);
  if (options.sortDir || options.sort_dir) params.set('sort_dir', options.sortDir || options.sort_dir);
  if (options.demo !== undefined) params.set('demo', options.demo);

  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await apiFetch(`/projects${query}`);
  return data;
}

export async function fetchMLProjectDetail(projectId) {
  return apiFetch(`/projects/${encodeURIComponent(projectId)}`);
}

export async function fetchProjectTimeline(projectId) {
  return apiFetch(`/projects/${encodeURIComponent(projectId)}/timeline`);
}

// ── Metrics, Analytics & Operational Priority ───────────────────────────────────

export async function fetchDashboardMetrics() {
  return apiFetch('/dashboard/metrics');
}

export async function fetchAnalyticsOverview() {
  return apiFetch('/analytics/overview');
}

export async function fetchPriorityQueue({ topN = 50, topPct = 10.0 } = {}) {
  return apiFetch(`/actions/priority-queue?top_n=${topN}&top_pct=${topPct}`);
}

export async function compareProjects(projectIds) {
  return apiFetch('/projects/compare', {
    method: 'POST',
    body: JSON.stringify({ project_ids: projectIds }),
  });
}

// ── Official Predictions (production route) ─────────────────────────────────────

/**
 * Official risk prediction for a project at a given as-of date.
 * Returns cost, schedule, compound risk scores from the three official XGBoost models.
 * The response includes:
 *   - official_predictions: { cost, schedule, compound }
 *   - top_drivers: SHAP-based feature importance
 *   - data_quality_warnings: missing-data flags
 *   - disclaimer: must always be displayed
 */
export async function fetchOfficialPrediction(projectId, asOf) {
  const result = await apiFetch('/predict/official', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, as_of: asOf }),
  });
  // Ensure disclaimer is always present
  result.disclaimer = result.disclaimer || RISK_SCORE_DISCLAIMER;
  return result;
}

// ── Risk Trajectory ─────────────────────────────────────────────────────────────

/**
 * Full historical risk trajectory for a project (all available months).
 * Each point uses only information available at that T (no look-ahead).
 */
export async function fetchRiskTrajectory(projectId) {
  const result = await apiFetch(`/projects/${encodeURIComponent(projectId)}/trajectory`);
  result.disclaimer = result.disclaimer || RISK_SCORE_DISCLAIMER;
  return result;
}

// ── Actual Outcomes ──────────────────────────────────────────────────────────────

/**
 * Reveal actual 6-month outcomes for historical validation.
 * SEPARATE from prediction. Returns TP/TN/FP/FN match categories.
 */
export async function fetchActualOutcome(projectId, asOf) {
  return apiFetch(`/projects/${encodeURIComponent(projectId)}/actual-outcome?as_of=${encodeURIComponent(asOf)}`);
}

// ── Project Assessment (convenience) ────────────────────────────────────────────

export async function fetchProjectAssessment(projectId, asOf) {
  const result = await apiFetch(`/projects/${encodeURIComponent(projectId)}/assessment?as_of=${encodeURIComponent(asOf)}`);
  result.disclaimer = result.disclaimer || RISK_SCORE_DISCLAIMER;
  return result;
}

// ── Exploratory Analysis ─────────────────────────────────────────────────────────

/**
 * Exploratory predictions (official_prediction=false).
 * Must be displayed in a separate panel and never blended with official results.
 */
export async function fetchAnalysisPrediction(projectId, asOf) {
  const result = await apiFetch('/predict/analysis', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, as_of: asOf }),
  });
  result.disclaimer = result.disclaimer || RISK_SCORE_DISCLAIMER;
  return result;
}

// ── Benchmark Predictions (LR) ───────────────────────────────────────────────────

/**
 * Original/Legacy CUF Logistic Regression Benchmark.
 * benchmark_only=true; may_replace_xgboost_predictions=false.
 */
export async function fetchBenchmarkPrediction(projectId, asOf) {
  const result = await apiFetch('/predict/benchmark', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, as_of: asOf }),
  });
  result.disclaimer = result.disclaimer || RISK_SCORE_DISCLAIMER;
  return result;
}

// ── FCM Scenario Simulation ─────────────────────────────────────────────────────

/**
 * FCM what-if scenario simulation.
 * scenario_overrides: { node_name: value_0_to_1 }
 * The response MUST be displayed with its disclaimer (it is not an official prediction).
 */
export async function runFCMSimulation(projectId, asOf, scenarioOverrides = {}, iterations = 50) {
  const result = await apiFetch('/simulate/fcm', {
    method: 'POST',
    body: JSON.stringify({
      project_id: projectId,
      as_of: asOf,
      scenario_overrides: scenarioOverrides,
      iterations,
    }),
  });
  result.disclaimer = result.disclaimer || FCM_DISCLAIMER;
  return result;
}

// ── AI Explanation (Gemini) ─────────────────────────────────────────────────────

/**
 * AI-generated plain-language explanation from Gemini.
 * Pass already-computed prediction/SHAP/FCM results.
 * Falls back gracefully to a deterministic template.
 */
export async function fetchAIExplanation({
  projectId,
  asOf,
  officialPredictions,
  topDrivers,
  fcmChanges,
  historicalComparison,
  dataQualityWarnings,
}) {
  return apiFetch('/ai/explain', {
    method: 'POST',
    body: JSON.stringify({
      project_id: projectId,
      as_of: asOf,
      official_predictions: officialPredictions,
      top_drivers: topDrivers,
      fcm_changes: fcmChanges,
      historical_comparison: historicalComparison,
      data_quality_warnings: dataQualityWarnings,
    }),
  });
}

// ── AI upgrade: deep explanation, REX assistant, glossary ──────────────────────

/**
 * Term-by-term explanation built on the backend from the project's own values,
 * peer comparison, base rates, SHAP drivers, FCM and trend.
 * source = 'gemini' when GEMINI_API_KEY is set, otherwise 'rule_based'.
 */
export async function fetchDeepExplanation({ projectId, asOf, fcmOverrides } = {}) {
  return apiFetch('/ai/explain/deep', {
    method: 'POST',
    body: JSON.stringify({
      project_id: projectId,
      as_of: asOf || null,
      fcm_overrides: fcmOverrides && Object.keys(fcmOverrides).length ? fcmOverrides : null,
    }),
  });
}

/** Ask REX a question; projectId/asOf are optional and add project context. */
export async function askRex({ question, projectId, asOf, page, history = [] }) {
  return apiFetch('/ai/ask', {
    method: 'POST',
    body: JSON.stringify({
      question,
      project_id: projectId || null,
      as_of: asOf || null,
      page: page || null,
      history: history.slice(-12),
    }),
  });
}

let _glossaryPromise = null;
/** Glossary of every dashboard term, fetched once and cached for the session. */
export function fetchGlossary() {
  if (!_glossaryPromise) {
    _glossaryPromise = apiFetch('/ai/glossary')
      .then((d) => Object.fromEntries((d.terms || []).map((t) => [t.key, t])))
      .catch((e) => { _glossaryPromise = null; throw e; });
  }
  return _glossaryPromise;
}

// ── Utilities ──────────────────────────────────────────────────────────────────

export const RISK_DISCLAIMER = RISK_SCORE_DISCLAIMER;
export const FCM_SIM_DISCLAIMER = FCM_DISCLAIMER;

export function getRiskColor(riskClass) {
  if (riskClass === 'HIGH') return { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-700' };
  if (riskClass === 'LOW') return { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' };
  return { text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-600' };
}

export function formatRiskScore(score) {
  if (score === null || score === undefined) return '—';
  return (score * 100).toFixed(1);
}

export function getMatchBadge(matchCategory) {
  const badges = {
    TP: { label: 'True Positive', color: 'bg-emerald-100 text-emerald-800', icon: '✓' },
    TN: { label: 'True Negative', color: 'bg-sky-100 text-sky-800', icon: '✓' },
    FP: { label: 'False Positive', color: 'bg-amber-100 text-amber-800', icon: '⚠' },
    FN: { label: 'False Negative', color: 'bg-rose-100 text-rose-800', icon: '⚠' },
  };
  return badges[matchCategory] || { label: matchCategory || '—', color: 'bg-slate-100 text-slate-600', icon: '?' };
}
