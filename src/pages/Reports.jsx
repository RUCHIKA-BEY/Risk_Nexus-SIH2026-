import { useState, useEffect } from 'react';
import { Printer, CheckCircle2 } from 'lucide-react';
import { fetchMLProjects, compareProjects } from '../services/mlApi';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function Reports() {
  const [demoProjects, setDemoProjects] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMLProjects({ pageSize: 20 }).then(res => {
      const items = res?.items || res?.projects || [];
      setDemoProjects(items);
      const initial = items.slice(0, 4).map(p => p.project_id);
      setSelectedIds(initial);
      if (initial.length > 0) {
        compareProjects(initial).then(rep => setReportData(rep)).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, []);

  const toggleProject = (id) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    setSelectedIds(next);
    if (next.length > 0) {
      compareProjects(next).then(rep => setReportData(rep));
    } else {
      setReportData(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Executive Risk Reports</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Generate and print official risk audit reports with verified XGBoost model outputs.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs hover:shadow-xs active:scale-[0.98] transition-all cursor-pointer self-start sm:self-center"
        >
          <Printer size={15} /> Print / Export PDF
        </button>
      </div>


      {/* Project Selector for Report */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Select Projects to Include in Report:
        </p>
        <div className="flex flex-wrap gap-2">
          {demoProjects.map(p => {
            const active = selectedIds.includes(p.project_id);
            return (
              <button
                key={p.project_id}
                onClick={() => toggleProject(p.project_id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors flex items-center gap-1.5 ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-400 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {active && <CheckCircle2 size={12} className="text-blue-600" />}
                {p.project_id}
              </button>
            );
          })}
        </div>
      </div>

      {/* Printable Report View */}
      {loading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner /></div>
      ) : reportData?.projects?.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-6 shadow-xs">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-4 flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">SIH26103 Risk Assessment Audit Report</h2>
              <p className="text-xs text-slate-500 mt-1">
                Generated from Canonical Phase-6 Dataset & Official Model Registry v2.0.0
              </p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p>Classification Horizon: 6 Months</p>
              <p className="mt-0.5">Report Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-6">
            {reportData.projects.map((p) => (
              <div
                key={p.project_id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono font-bold text-base text-slate-900 dark:text-white">{p.project_id}</span>
                    {p.name && <span className="ml-2 text-xs text-slate-600 dark:text-slate-400 font-medium">({p.name})</span>}
                    <p className="text-xs text-slate-500 mt-0.5">Sector: {p.sector || '—'} · State: {p.state || '—'} · Status: {p.status || 'Ongoing'}</p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">As of {p.as_of}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <div>
                    <span className="text-slate-400">Sanctioned Cost:</span>
                    <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {p.original_cost ? `Rs. ${p.original_cost.toLocaleString()} Cr` : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Expenditure:</span>
                    <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {p.cumulative_expenditure ? `Rs. ${p.cumulative_expenditure.toLocaleString()} Cr` : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Physical Progress:</span>
                    <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {p.physical_progress_pct !== null && p.physical_progress_pct !== undefined ? `${p.physical_progress_pct}%` : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Reported Delay:</span>
                    <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {p.reported_delay_months ? `${p.reported_delay_months} mo` : '0 mo'}
                    </p>
                  </div>
                </div>

                {/* Risk Scores */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                    <p className="text-slate-400 font-medium">Schedule Risk (schedule_cuf_xgb)</p>
                    <p className="text-sm font-mono font-bold mt-0.5 text-slate-900 dark:text-white">
                      {p.schedule_risk_score} ({p.schedule_risk_class})
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Threshold: 0.63</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                    <p className="text-slate-400 font-medium">Cost Risk (cost_cuf_xgb)</p>
                    <p className="text-sm font-mono font-bold mt-0.5 text-slate-900 dark:text-white">
                      {p.cost_risk_score} ({p.cost_risk_class})
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Threshold: 0.88</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                    <p className="text-slate-400 font-medium">Compound Risk (compound_cuf_xgb)</p>
                    <p className="text-sm font-mono font-bold mt-0.5 text-slate-900 dark:text-white">
                      {p.compound_risk_score} ({p.compound_risk_class})
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Threshold: 0.885</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-3">
            Disclaimer: Risk scores are uncalibrated model outputs and are not literal real-world probabilities. Generated by SIH26103 PAIMANA system.
          </div>
        </div>
      ) : null}
    </div>
  );
}
