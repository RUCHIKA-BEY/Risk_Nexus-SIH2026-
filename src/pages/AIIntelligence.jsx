import { useState, useEffect } from 'react';
import { Sparkles, Brain, ShieldAlert, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchMLProjects, fetchModelsStatus } from '../services/mlApi';
import SectionCard from '../components/shared/SectionCard';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function AIIntelligence() {
  const [demoProjects, setDemoProjects] = useState([]);
  const [modelsStatus, setModelsStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchMLProjects({ demo: true }).catch(() => ({ items: [] })),
      fetchModelsStatus().catch(() => null),
    ]).then(([projs, mStatus]) => {
      setDemoProjects(projs?.items || projs?.projects || []);
      setModelsStatus(mStatus);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI Intelligence & Early-Warning</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
              Gemini + XGBoost SHAP
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Structured explainability and causal scenario simulation powered by deterministic ML models and Gemini reasoning.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SectionCard
            title="Historical Demonstration Projects"
            subtitle="Split-A test projects with full ML predictions, SHAP drivers, and Gemini synthesis"
          >
            <div className="space-y-3">
              {demoProjects.map(p => (
                <div
                  key={p.project_id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:border-slate-300 dark:hover:border-slate-600"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 shrink-0">
                        {p.project_id}
                      </span>
                      {p.name && (
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          ({p.name})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-words">
                      {p.sector || 'General'}{p.state ? ` · ${p.state}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 flex sm:self-center">
                    <Link
                      to={`/projects/${encodeURIComponent(p.project_id)}/risk?as_of=${p.last_report_month || ''}`}
                      className="w-full sm:w-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      aria-label={`AI Synthesis for ${p.project_id}`}
                    >
                      AI Synthesis <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Model Architecture & Routing Guarantees"
            subtitle="Verified deployment invariants enforcing strict separation"
          >
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <p className="font-bold text-blue-900 dark:text-blue-300">Official Production XGBoost Models</p>
                <p className="text-blue-700 dark:text-blue-400 mt-1">
                  <code>cost_cuf_xgb</code> (thr 0.88), <code>schedule_cuf_xgb</code> (thr 0.63), <code>compound_cuf_xgb</code> (thr 0.885). 17 exact raw features.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                <p className="font-bold text-purple-900 dark:text-purple-300">Deterministic Scenario Simulator (FCM)</p>
                <p className="text-purple-700 dark:text-purple-400 mt-1">
                  Bounded nonlinear simulation in [0, 1] allowing scenario what-if analysis without altering official ML scores.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <p className="font-bold text-amber-900 dark:text-amber-300">Ablation & Benchmark Safety</p>
                <p className="text-amber-700 dark:text-amber-400 mt-1">
                  <code>schedule_e3_xgb</code> strictly rejected and excluded. Logistic Regression benchmarks marked as benchmark-only.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
