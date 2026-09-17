/**
 * RiskAssessment.jsx — Official risk prediction panel for a specific project/as-of date.
 * Displays: official XGBoost predictions, SHAP drivers, data quality warnings.
 * Disclaimer always shown. 
 * Separate buttons for: Exploratory Analysis, LR Benchmark, Actual Outcome Reveal.
 */
import { useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  fetchMLProjectDetail,
  fetchProjectTimeline,
  fetchOfficialPrediction,
  fetchActualOutcome,
  fetchAnalysisPrediction,
  fetchBenchmarkPrediction,
  runFCMSimulation,
  fetchAIExplanation,
  getRiskColor,
  formatRiskScore,
  getMatchBadge,
  RISK_DISCLAIMER,
} from '../services/mlApi';

// ── Sub-components ──────────────────────────────────────────────────────────────

function DisclaimerBanner({ text }) {
  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
      <span className="mt-0.5 flex-shrink-0">⚠️</span>
      <span>{text}</span>
    </div>
  );
}

function RiskScoreCard({ target, prediction, showAnimation }) {
  const colors = getRiskColor(prediction?.risk_class);
  const score = prediction?.risk_score ?? null;
  const pct = score !== null ? (score * 100).toFixed(1) : null;

  return (
    <div
      className={`relative rounded-xl border-2 ${colors.border} ${colors.bg} p-5 transition-all duration-500
        ${showAnimation ? 'ring-4 ring-offset-2 ring-blue-300 animate-pulse-once' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{target} Risk</p>
          <p className="text-xs text-slate-400 mt-0.5">{prediction?.dashboard_label || 'Official XGBoost'}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${colors.badge}`}
        >
          {prediction?.risk_class || '—'}
        </span>
      </div>

      {score !== null ? (
        <>
          <div className="mb-2">
            <div className="flex justify-between items-end mb-1">
              <span className={`text-3xl font-black ${colors.text}`}>{pct}<span className="text-sm font-normal ml-0.5">pts</span></span>
              <span className="text-xs text-slate-400">threshold: {((prediction?.threshold ?? 0) * 100).toFixed(0)}pts</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 relative">
              <div
                className={`h-2.5 rounded-full transition-all duration-700 ${prediction?.risk_class === 'HIGH' ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, score * 100)}%` }}
              />
              {/* Threshold marker */}
              <div
                className="absolute top-0 h-2.5 w-0.5 bg-slate-500 rounded-full"
                style={{ left: `${(prediction?.threshold ?? 0) * 100}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            {prediction?.risk_class === 'HIGH' ? '↑ Above threshold — alert flagged' : '↓ Below threshold — no alert'}
          </p>
        </>
      ) : (
        <p className="text-sm text-slate-400 mt-2">—</p>
      )}
    </div>
  );
}

function SHAPDriverPanel({ target, drivers }) {
  if (!drivers || drivers.length === 0) return null;
  const maxAbs = Math.max(...drivers.map(d => Math.abs(d.shap_value)), 0.001);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 capitalize">
        {target} — Top Drivers
      </h4>
      <p className="text-xs text-slate-400 mb-3">
        SHAP values show model associations, not proven causation.
      </p>
      <div className="space-y-2">
        {drivers.map((d, i) => {
          const pct = (Math.abs(d.shap_value) / maxAbs) * 100;
          const isPos = d.shap_value > 0;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[160px]" title={d.feature}>
                    {d.feature}
                  </span>
                  <span className={`text-xs font-medium ${isPos ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {isPos ? '↑' : '↓'} {d.shap_value.toFixed(4)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${isPos ? 'bg-rose-400' : 'bg-emerald-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OutcomeMatchCard({ outcome }) {
  if (!outcome) return null;
  const badge = getMatchBadge(outcome.match_category);
  return (
    <div className={`rounded-lg border px-4 py-3 ${
      outcome.match_category === 'TP' || outcome.match_category === 'TN'
        ? 'bg-emerald-50 border-emerald-200'
        : outcome.match_category
        ? 'bg-amber-50 border-amber-200'
        : 'bg-slate-50 border-slate-200'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold capitalize text-slate-700">{outcome.target} outcome</span>
        {outcome.match_category && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge.color}`}>
            {badge.icon} {badge.label}
          </span>
        )}
      </div>
      <div className="flex gap-4 text-xs text-slate-500 mt-1">
        <span>Predicted: <strong>{outcome.predicted_class || '—'}</strong></span>
        <span>Actual event: <strong>{outcome.actual_event === null ? 'N/A' : outcome.actual_event === 1 ? 'Yes' : 'No'}</strong></span>
      </div>
      {outcome.explanation && (
        <p className="text-xs text-slate-500 mt-2 italic">{outcome.explanation}</p>
      )}
    </div>
  );
}

function FCMPanel({ projectId, asOf }) {
  const [fcmResult, setFcmResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [overrides, setOverrides] = useState({});
  const FCM_NODES = [
    { key: 'physical_progress_gap', label: 'Physical Progress Gap' },
    { key: 'expenditure_progress_gap', label: 'Expenditure-Progress Gap' },
    { key: 'reported_delay_pressure', label: 'Delay Pressure' },
    { key: 'cost_revision_pressure', label: 'Cost Revision Pressure' },
    { key: 'schedule_revision_pressure', label: 'Schedule Revision Pressure' },
    { key: 'forecast_cost_pressure', label: 'Forecast Cost Pressure' },
  ];

  const runSimulation = async () => {
    setLoading(true);
    try {
      const result = await runFCMSimulation(projectId, asOf, overrides);
      setFcmResult(result);
    } catch (e) {
      console.error('FCM error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">What-If Scenario (FCM)</h3>
          <p className="text-xs text-slate-400 mt-0.5">Adjust input pressures and simulate systemic effects</p>
        </div>
        <button
          onClick={runSimulation}
          disabled={loading}
          className="px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Simulating…' : 'Run Simulation'}
        </button>
      </div>

      <DisclaimerBanner text={fcmResult?.disclaimer || 'Expert-weighted scenario simulation; not an official model prediction or causal estimate.'} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        {FCM_NODES.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0" max="1" step="0.05"
                value={overrides[key] ?? (fcmResult?.baseline?.[key] ?? 0.5)}
                onChange={(e) => setOverrides(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                className="flex-1 h-1.5 accent-violet-600"
              />
              <span className="text-xs w-8 text-right text-slate-500">
                {((overrides[key] ?? (fcmResult?.baseline?.[key] ?? 0.5)) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {fcmResult && (
        <div className="mt-5 space-y-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Simulation Results</h4>
          {['schedule_pressure', 'cost_pressure', 'intervention_priority'].map(node => {
            const baseline = fcmResult.baseline?.[node] ?? 0;
            const scenario = fcmResult.scenario?.[node] ?? 0;
            const change = fcmResult.changes?.[node] ?? 0;
            return (
              <div key={node} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 capitalize">{node.replace(/_/g, ' ')}</span>
                    <span className={`font-semibold ${change > 0 ? 'text-rose-600' : change < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {change > 0 ? '↑' : change < 0 ? '↓' : '='} {Math.abs(change * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 relative">
                    <div className="h-2 rounded-full bg-slate-300" style={{ width: `${baseline * 100}%` }} />
                    <div
                      className={`absolute top-0 h-2 rounded-full opacity-70 ${change > 0 ? 'bg-rose-400' : 'bg-emerald-400'}`}
                      style={{ left: `${Math.min(baseline, scenario) * 100}%`, width: `${Math.abs(change) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {!fcmResult.converged && (
            <p className="text-xs text-amber-600">⚠ FCM did not converge within the iteration limit.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────────

export default function RiskAssessment() {
  const { id: projectId } = useParams();
  const [searchParams] = useSearchParams();
  const asOf = searchParams.get('as_of') || '';

  const [project, setProject] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(asOf);
  const [prediction, setPrediction] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [analysisPred, setAnalysisPred] = useState(null);
  const [benchmarkPred, setBenchmarkPred] = useState(null);

  const [loading, setLoading] = useState(false);
  const [outcomeLoading, setOutcomeLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [error, setError] = useState(null);
  const [scoreAnimation, setScoreAnimation] = useState(false);

  // Load project info and timeline on mount
  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      fetchMLProjectDetail(projectId).catch(e => null),
      fetchProjectTimeline(projectId).catch(e => null),
    ]).then(([p, t]) => {
      setProject(p);
      setTimeline(t);
      // Auto-select last eligible month
      if (!selectedMonth && t?.timeline) {
        const eligible = t.timeline.filter(m => m.is_demo_eligible);
        if (eligible.length > 0) {
          setSelectedMonth(eligible[eligible.length - 1].report_month.slice(0, 7));
        } else if (t.timeline.length > 0) {
          setSelectedMonth(t.timeline[t.timeline.length - 1].report_month.slice(0, 7));
        }
      }
    });
  }, [projectId]);

  const runAssessment = useCallback(async () => {
    if (!projectId || !selectedMonth) return;
    setLoading(true);
    setError(null);
    setPrediction(null);
    setOutcome(null);
    setAiExplanation(null);
    setAnalysisPred(null);
    setBenchmarkPred(null);
    try {
      const result = await fetchOfficialPrediction(projectId, selectedMonth);
      setPrediction(result);
      setScoreAnimation(true);
      setTimeout(() => setScoreAnimation(false), 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedMonth]);

  const revealOutcome = async () => {
    if (!projectId || !selectedMonth) return;
    setOutcomeLoading(true);
    try {
      const data = await fetchActualOutcome(projectId, selectedMonth);
      // Merge predicted classes from current prediction
      if (prediction) {
        const predictedClasses = {};
        for (const [target, pred] of Object.entries(prediction.official_predictions || {})) {
          predictedClasses[target] = pred.risk_class;
        }
        // Attach predicted class to each outcome
        if (data.outcomes) {
          data.outcomes = data.outcomes.map(o => ({
            ...o,
            predicted_class: o.predicted_class || predictedClasses[o.target] || '—',
          }));
        }
      }
      setOutcome(data);
    } catch (e) {
      console.error('Outcome error:', e);
    } finally {
      setOutcomeLoading(false);
    }
  };

  const loadAIExplanation = async () => {
    if (!prediction) return;
    setAiLoading(true);
    try {
      const explanation = await fetchAIExplanation({
        projectId,
        asOf: selectedMonth,
        officialPredictions: prediction.official_predictions,
        topDrivers: prediction.top_drivers,
        dataQualityWarnings: prediction.data_quality_warnings,
      });
      setAiExplanation(explanation);
    } catch (e) {
      console.error('AI error:', e);
    } finally {
      setAiLoading(false);
    }
  };

  const loadAnalysis = async () => {
    if (!projectId || !selectedMonth) return;
    try {
      const data = await fetchAnalysisPrediction(projectId, selectedMonth);
      setAnalysisPred(data);
      setShowAnalysis(true);
    } catch (e) {
      console.error('Analysis error:', e);
    }
  };

  const loadBenchmark = async () => {
    if (!projectId || !selectedMonth) return;
    try {
      const data = await fetchBenchmarkPrediction(projectId, selectedMonth);
      setBenchmarkPred(data);
      setShowBenchmark(true);
    } catch (e) {
      console.error('Benchmark error:', e);
    }
  };

  // Eligible months from timeline
  const eligibleMonths = timeline?.timeline?.filter(m => m.is_demo_eligible) || [];
  const allMonths = timeline?.timeline || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          Risk Assessment
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Official XGBoost risk predictions — {project?.name || project?.sector || 'Project'} ({projectId})
        </p>
      </div>

      {/* Month selector & Run */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Assessment Month (As Of)
            </label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">— Select month —</option>
              {allMonths.map(m => {
                const month = m.report_month.slice(0, 7);
                const isEligible = m.is_demo_eligible;
                return (
                  <option key={month} value={month}>
                    {month} {isEligible ? '⭐' : ''}
                  </option>
                );
              })}
            </select>
            {eligibleMonths.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">⭐ = eligible demo month</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={runAssessment}
              disabled={loading || !selectedMonth}
              id="btn-run-assessment"
              className="px-6 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 flex items-center gap-2"
            >
              {loading ? (
                <><span className="animate-spin">⟳</span> Scoring…</>
              ) : (
                <><span>⚡</span> Run Assessment</>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 text-sm text-rose-700">
          ⚠ {error}
        </div>
      )}

      {/* Official Predictions */}
      {prediction && (
        <div className="space-y-5">
          <DisclaimerBanner text={prediction.disclaimer} />

          {/* Risk score cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['cost', 'schedule', 'compound'].map(target => (
              <RiskScoreCard
                key={target}
                target={target}
                prediction={prediction.official_predictions?.[target]}
                showAnimation={scoreAnimation}
              />
            ))}
          </div>

          {/* Data quality warnings */}
          {prediction.data_quality_warnings?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">Data Quality Notes</h4>
              <ul className="space-y-1">
                {prediction.data_quality_warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-amber-700">
                    <span>{w.severity === 'warning' ? '⚠' : 'ℹ'}</span>
                    <span>{w.issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* SHAP panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(prediction.top_drivers || {}).map(([target, drivers]) => (
              <SHAPDriverPanel key={target} target={target} drivers={drivers} />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={revealOutcome}
              disabled={outcomeLoading}
              id="btn-reveal-outcome"
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {outcomeLoading ? '⟳ Loading…' : '🔍 Reveal Actual Outcome'}
            </button>
            <button
              onClick={loadAIExplanation}
              disabled={aiLoading}
              id="btn-ai-explain"
              className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {aiLoading ? '⟳ Generating…' : '✨ AI Explanation'}
            </button>
            <button
              onClick={loadAnalysis}
              id="btn-exploratory"
              className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors"
            >
              🔬 Exploratory Analysis
            </button>
            <button
              onClick={loadBenchmark}
              id="btn-benchmark"
              className="px-4 py-2 bg-slate-500 text-white text-sm font-semibold rounded-lg hover:bg-slate-600 transition-colors"
            >
              📊 LR Benchmark
            </button>
          </div>
        </div>
      )}

      {/* Actual Outcomes Reveal */}
      {outcome && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-3">
            🔍 Historical Validation — Actual Outcomes
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {outcome.note}
          </p>
          <div className="space-y-3">
            {outcome.outcomes?.map((o, i) => <OutcomeMatchCard key={i} outcome={o} />)}
          </div>
          {!outcome.eligible && (
            <p className="text-xs text-amber-700 mt-3">⚠ This project/month is not in the eligible Split-A test population.</p>
          )}
        </div>
      )}

      {/* AI Explanation */}
      {aiExplanation && (
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-xl border border-violet-200 dark:border-violet-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">✨</span>
            <h3 className="text-base font-bold text-violet-900 dark:text-white">AI-Generated Explanation</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 ml-auto">
              {aiExplanation.source === 'gemini' ? 'Gemini AI' : 'Fallback'}
            </span>
          </div>
          <DisclaimerBanner text={aiExplanation.disclaimer} />
          <div className="mt-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Summary</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{aiExplanation.summary}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Main Drivers</h4>
                <ul className="space-y-1">
                  {aiExplanation.main_drivers?.map((d, i) => (
                    <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                      <span className="mt-0.5 text-rose-400">•</span>{d}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Suggested Actions</h4>
                <ul className="space-y-1">
                  {aiExplanation.suggested_actions?.map((a, i) => (
                    <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                      <span className="mt-0.5 text-emerald-400">→</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Limitations</h4>
                <ul className="space-y-1">
                  {aiExplanation.limitations?.map((l, i) => (
                    <li key={i} className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                      <span className="mt-0.5">⚠</span>{l}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FCM Simulator */}
      {prediction && (
        <FCMPanel projectId={projectId} asOf={selectedMonth} />
      )}

      {/* Exploratory Analysis (separate panel) */}
      {showAnalysis && analysisPred && (
        <div className="bg-amber-50 dark:bg-slate-800 rounded-xl border-2 border-amber-200 dark:border-amber-700 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🔬</span>
            <h3 className="text-base font-bold text-amber-900 dark:text-white">Exploratory Feature Analysis</h3>
            <span className="ml-auto text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-semibold">
              NOT official
            </span>
          </div>
          <DisclaimerBanner text={analysisPred.disclaimer} />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {analysisPred.exploratory_predictions?.map(pred => (
              <div key={pred.model_id} className="bg-white dark:bg-slate-700 rounded-lg border border-amber-200 p-3">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{pred.model_id}</p>
                <p className="text-xs text-slate-500">{pred.dashboard_label}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-lg font-black text-slate-800 dark:text-white">{formatRiskScore(pred.risk_score)}</span>
                  <span className="text-xs text-slate-400">pts</span>
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${getRiskColor(pred.risk_class).badge}`}>
                    {pred.risk_class}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LR Benchmark (separate panel) */}
      {showBenchmark && benchmarkPred && (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-slate-300 dark:border-slate-600 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📊</span>
            <h3 className="text-base font-bold text-slate-700 dark:text-white">
              Original/Legacy CUF Logistic Regression Benchmark
            </h3>
            <span className="ml-auto text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full font-semibold">
              benchmark only
            </span>
          </div>
          <DisclaimerBanner text={benchmarkPred.panel_tenure_warning} />
          <div className="mt-3">
            <DisclaimerBanner text={benchmarkPred.disclaimer} />
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {benchmarkPred.benchmark_predictions?.map(pred => (
              <div key={pred.model_id} className="bg-white dark:bg-slate-700 rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{pred.model_id}</p>
                <p className="text-xs text-slate-400">{pred.dashboard_label}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-lg font-black text-slate-800 dark:text-white">{formatRiskScore(pred.risk_score)}</span>
                  <span className="text-xs text-slate-400">pts</span>
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${getRiskColor(pred.risk_class).badge}`}>
                    {pred.risk_class}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project info */}
      {project && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Project Information</h3>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Project ID', project.project_id],
              ['Sector', project.sector],
              ['State', project.state],
              ['Source', project.source],
              ['Status', project.status],
              ['Data Points', project.available_months],
              ['First Month', project.first_report_month],
              ['Last Month', project.last_report_month],
            ].map(([label, value]) => (
              <div key={label} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                <dt className="text-xs text-slate-400 uppercase tracking-wide">{label}</dt>
                <dd className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
