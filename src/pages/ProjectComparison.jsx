import { useState, useEffect } from 'react';
import { Plus, X, ArrowRight, ShieldAlert, BarChart2 } from 'lucide-react';
import { compareProjects, fetchMLProjects, getRiskColor, formatRiskScore } from '../services/mlApi';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function ProjectComparison() {
  const [selectedIds, setSelectedIds] = useState(['N22000123', 'N22000180', 'N22000215']);
  const [comparison, setComparison] = useState(null);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newId, setNewId] = useState('');

  const loadComparison = (ids) => {
    if (ids.length === 0) {
      setComparison({ projects: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    compareProjects(ids)
      .then(res => setComparison(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMLProjects({ pageSize: 50 }).then(res => {
      setAvailableProjects(res?.items || res?.projects || []);
    });
    loadComparison(selectedIds);
  }, []);

  const addProject = (id) => {
    const clean = id.trim();
    if (clean && !selectedIds.includes(clean) && selectedIds.length < 5) {
      const next = [...selectedIds, clean];
      setSelectedIds(next);
      loadComparison(next);
      setNewId('');
    }
  };

  const removeProject = (id) => {
    const next = selectedIds.filter(i => i !== id);
    setSelectedIds(next);
    loadComparison(next);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Project Comparison Matrix</h1>
        <p className="text-sm text-slate-500 mt-1">
          Side-by-side comparison of budget, execution progress, and official XGBoost risk predictions.
        </p>
      </div>

      {/* Selector Toolbar */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Comparing {selectedIds.length} / 5 Projects:
        </div>
        <div className="flex flex-wrap gap-2 flex-1">
          {selectedIds.map(id => (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-mono font-medium"
            >
              {id}
              <button onClick={() => removeProject(id)} className="hover:text-rose-500">
                <X size={13} />
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={newId}
            onChange={(e) => {
              if (e.target.value) addProject(e.target.value);
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          >
            <option value="">+ Add Project to Compare...</option>
            {availableProjects
              .filter(p => !selectedIds.includes(p.project_id))
              .map(p => (
                <option key={p.project_id} value={p.project_id}>
                  {p.project_id} ({p.sector || 'General'})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Comparison Grid */}
      {loading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner /></div>
      ) : !comparison || comparison.projects?.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          Select projects to compare above.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase text-left w-56">Metric / Property</th>
                  {comparison.projects.map(p => (
                    <th key={p.project_id} className="py-3 px-4 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 text-left min-w-[200px]">
                      <div>{p.project_id}</div>
                      {p.name && <div className="text-[11px] font-sans font-normal text-slate-500">{p.name}</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                <tr>
                  <td className="py-3 px-4 text-xs font-medium text-slate-500">Sector</td>
                  {comparison.projects.map(p => (
                    <td key={p.project_id} className="py-3 px-4 text-xs font-medium text-slate-800 dark:text-slate-200">{p.sector || '—'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 text-xs font-medium text-slate-500">State / Region</td>
                  {comparison.projects.map(p => (
                    <td key={p.project_id} className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">{p.state || '—'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 text-xs font-medium text-slate-500">Execution Status</td>
                  {comparison.projects.map(p => (
                    <td key={p.project_id} className="py-3 px-4 text-xs">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        {p.status || 'Ongoing'}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 text-xs font-medium text-slate-500">Original Cost</td>
                  {comparison.projects.map(p => (
                    <td key={p.project_id} className="py-3 px-4 text-xs font-mono font-medium">
                      {p.original_cost ? `Rs. ${p.original_cost.toLocaleString()} Cr` : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 text-xs font-medium text-slate-500">Cumulative Expenditure</td>
                  {comparison.projects.map(p => (
                    <td key={p.project_id} className="py-3 px-4 text-xs font-mono font-medium">
                      {p.cumulative_expenditure ? `Rs. ${p.cumulative_expenditure.toLocaleString()} Cr` : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 text-xs font-medium text-slate-500">Physical Progress</td>
                  {comparison.projects.map(p => (
                    <td key={p.project_id} className="py-3 px-4 text-xs font-mono font-medium">
                      {p.physical_progress_pct !== null && p.physical_progress_pct !== undefined ? `${p.physical_progress_pct}%` : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 text-xs font-medium text-slate-500">Reported Delay</td>
                  {comparison.projects.map(p => (
                    <td key={p.project_id} className="py-3 px-4 text-xs font-mono font-medium">
                      {p.reported_delay_months ? `${p.reported_delay_months} months` : '0 months'}
                    </td>
                  ))}
                </tr>

                {/* Official XGBoost Model Predictions Header */}
                <tr className="bg-slate-50/80 dark:bg-slate-900/80 font-bold text-xs">
                  <td colSpan={comparison.projects.length + 1} className="py-2.5 px-4 text-blue-700 dark:text-blue-400">
                    Official XGBoost 6-Month Risk Scores (Uncalibrated Model Outputs)
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <div>Schedule Risk (schedule_cuf_xgb)</div>
                    <div className="text-[10px] text-slate-400">Threshold: 0.63</div>
                  </td>
                  {comparison.projects.map(p => {
                    const col = getRiskColor(p.schedule_risk_class);
                    return (
                      <td key={p.project_id} className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${col.badge}`}>
                          {p.schedule_risk_score} ({p.schedule_risk_class})
                        </span>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <div>Cost Risk (cost_cuf_xgb)</div>
                    <div className="text-[10px] text-slate-400">Threshold: 0.88</div>
                  </td>
                  {comparison.projects.map(p => {
                    const col = getRiskColor(p.cost_risk_class);
                    return (
                      <td key={p.project_id} className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${col.badge}`}>
                          {p.cost_risk_score} ({p.cost_risk_class})
                        </span>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <div>Compound Risk (compound_cuf_xgb)</div>
                    <div className="text-[10px] text-slate-400">Threshold: 0.885</div>
                  </td>
                  {comparison.projects.map(p => {
                    const col = getRiskColor(p.compound_risk_class);
                    return (
                      <td key={p.project_id} className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${col.badge}`}>
                          {p.compound_risk_score} ({p.compound_risk_class})
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
