/**
 * RiskAssessment.jsx — Official risk prediction panel for a specific project/as-of date.
 * Displays: official XGBoost predictions, SHAP drivers, data quality warnings.
 * Disclaimer always shown. 
 * Separate buttons for: Exploratory Analysis, LR Benchmark, Actual Outcome Reveal.
 */
import { useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Search, Sparkles, FlaskConical, BarChart2, Zap, Loader2 } from 'lucide-react';
import {
  fetchMLProjectDetail,
  fetchProjectTimeline,
  fetchOfficialPrediction,
  fetchActualOutcome,
  fetchAnalysisPrediction,
  fetchBenchmarkPrediction,
  fetchDeepExplanation,
  getRiskColor,
  formatRiskScore,
  getMatchBadge,
  RISK_DISCLAIMER,
} from '../services/mlApi';
import AIExplanationPanel from '../components/shared/AIExplanationPanel';
import TermInfo, { useGlossary } from '../components/shared/TermInfo';
import CountUpNumber from '../components/shared/CountUpNumber';
import FCMPanel from '../components/fcm/FCMPanel';

// ── Sub-components ──────────────────────────────────────────────────────────────

function DisclaimerBanner({ text }) {
  return (
    <div className="flex items-start gap-2 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
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
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{target} Risk</p>
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
              <span className={`text-3xl font-black ${colors.text}`}>
                <CountUpNumber value={pct} />
                <span className="text-sm font-normal ml-0.5 text-slate-400">pts</span>
              </span>
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
  const glossary = useGlossary();
  if (!drivers || drivers.length === 0) return null;
  const maxAbs = Math.max(...drivers.map(d => Math.abs(d.shap_value)), 0.001);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 capitalize">
        {target} — Top Drivers <TermInfo term="top_drivers" size={12} />
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
                  <span className="flex items-center gap-1 min-w-0">
                    <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[180px]" title={d.feature}>
                      {glossary[d.feature]?.label || d.feature}
                    </span>
                    <TermInfo term={d.feature} size={11} />
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

// FCMPanel is now imported from ../components/fcm/FCMPanel

// ── Error Message Extraction Helper ──────────────────────────────────────────

function extractErrorMessage(err) {
  if (!err) return 'Risk assessment could not be completed. Please try again.';
  if (typeof err === 'string' && err.trim()) {
    return err === '[object Object]' ? 'Risk assessment could not be completed. Please try again.' : err.trim();
  }
  if (err instanceof Error) {
    if (err.message && err.message !== '[object Object]') {
      return err.message;
    }
  }
  if (typeof err.detail === 'string' && err.detail.trim()) {
    return err.detail.trim();
  }
  if (Array.isArray(err.detail) && err.detail.length > 0) {
    return err.detail.map(d => (typeof d === 'string' ? d : d.msg || d.message || JSON.stringify(d))).join('; ');
  }
  if (typeof err.detail === 'object' && err.detail !== null) {
    return err.detail.message || err.detail.msg || JSON.stringify(err.detail);
  }
  if (typeof err.message === 'string' && err.message.trim() && err.message !== '[object Object]') {
    return err.message.trim();
  }
  return 'Risk assessment could not be completed. Please try again.';
}

// ── Main Page ───────────────────────────────────────────────────────────────────

export default function RiskAssessment() {
  const params = useParams();
  const projectId = params.id || params.projectId || '';
  const [searchParams, setSearchParams] = useSearchParams();
  const urlAsOf = searchParams.get('as_of') || '';

  const [project, setProject] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(urlAsOf);
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
      // Auto-select as_of or last eligible/available month
      if (urlAsOf) {
        setSelectedMonth(urlAsOf);
      } else if (p?.last_report_month) {
        setSelectedMonth(p.last_report_month);
      } else if (t?.timeline && t.timeline.length > 0) {
        setSelectedMonth(t.timeline[t.timeline.length - 1].report_month.slice(0, 7));
      }
    });
  }, [projectId, urlAsOf]);

  const runAssessment = useCallback(async (targetMonth) => {
    const monthToUse = (typeof targetMonth === 'string' && targetMonth.trim()) ? targetMonth.trim() : (typeof selectedMonth === 'string' ? selectedMonth.trim() : '');
    if (!projectId || !monthToUse) return;
    setLoading(true);
    setError(null);
    setPrediction(null);
    setOutcome(null);
    setAiExplanation(null);
    setAnalysisPred(null);
    setBenchmarkPred(null);
    try {
      const result = await fetchOfficialPrediction(projectId, monthToUse);
      setPrediction(result);
      setScoreAnimation(true);
      setTimeout(() => setScoreAnimation(false), 1500);
    } catch (e) {
      console.error('Risk assessment error:', e);
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedMonth]);


  // Auto-run assessment when month is selected
  useEffect(() => {
    if (projectId && selectedMonth) {
      runAssessment(selectedMonth);
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
      const explanation = await fetchDeepExplanation({ projectId, asOf: selectedMonth });
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
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
              onClick={() => runAssessment(selectedMonth)}
              disabled={loading || !selectedMonth}
              id="btn-run-assessment"
              className="px-6 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 inline-flex items-center gap-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Scoring…</>
              ) : (
                <><Zap size={16} /> Run Assessment</>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 text-sm text-rose-800 dark:text-rose-200 flex items-start gap-3 shadow-xs animate-fade-in">
          <span className="text-rose-600 dark:text-rose-400 shrink-0 text-base mt-0.5">⚠️</span>
          <div className="space-y-1">
            <h4 className="font-semibold text-rose-900 dark:text-rose-100">Risk Assessment Unavailable</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">{typeof error === 'string' ? error : extractErrorMessage(error)}</p>
          </div>
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {outcomeLoading
                ? <><Loader2 size={15} className="animate-spin" /> Loading…</>
                : <><Search size={15} /> Reveal Actual Outcome</>}
            </button>
            <button
              onClick={loadAIExplanation}
              disabled={aiLoading}
              id="btn-ai-explain"
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {aiLoading
                ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
                : <><Sparkles size={15} /> AI Explanation</>}
            </button>
            <button
              onClick={loadAnalysis}
              id="btn-exploratory"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors"
            >
              <FlaskConical size={15} /> Exploratory Analysis
            </button>
            <button
              onClick={loadBenchmark}
              id="btn-benchmark"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-500 text-white text-sm font-semibold rounded-lg hover:bg-slate-600 transition-colors"
            >
              <BarChart2 size={15} /> LR Benchmark
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

      {/* AI Explanation (deep, term-by-term) */}
      {aiExplanation && (
        <AIExplanationPanel data={aiExplanation} projectId={projectId} asOf={selectedMonth} />
      )}

      {/* FCM Simulator */}
      {prediction && (
        <FCMPanel projectId={projectId} asOf={selectedMonth || '2024-06'} />
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
          {benchmarkPred.panel_tenure_warning && (
            <div className="mb-3">
              <DisclaimerBanner text={benchmarkPred.panel_tenure_warning} />
            </div>
          )}
          <DisclaimerBanner text={benchmarkPred.disclaimer} />
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
        <div className="glass-card rounded-xl p-5 animate-slide-up stagger-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Project Information</h3>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Project ID', project.project_id],
              ['Sector', project.sector],
              ['State', project.state || project.state_std || project.location],
              ['Source', project.source],
              ['Status', project.status],
              ['Data Points', project.available_months ? `${project.available_months} months` : null],
              ['First Month', project.first_report_month],
              ['Last Month', project.last_report_month],
            ].map(([label, value]) => (
              <div key={label} className="glass-panel rounded-lg p-3">
                <dt className="text-xs text-slate-400 uppercase tracking-wide font-medium">{label}</dt>
                <dd className="text-sm font-semibold text-slate-850 dark:text-white mt-0.5">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
