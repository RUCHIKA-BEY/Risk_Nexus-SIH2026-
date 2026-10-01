import { useState, useEffect } from 'react';
import { ShieldAlert, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchPriorityQueue } from '../services/mlApi';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function Actions() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topN, setTopN] = useState(25);

  useEffect(() => {
    setLoading(true);
    fetchPriorityQueue({ topN, topPct: 10.0 })
      .then(res => setData(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [topN]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Operational Priority Queue</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Projects ranked by schedule risk score (<code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs font-mono">schedule_cuf_xgb &ge; 0.63</code>) within administrative review capacity.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Review Capacity:</label>
          <select
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
          >
            <option value={10}>Top 10 High Priority</option>
            <option value={25}>Top 25 High Priority</option>
            <option value={50}>Top 50 High Priority</option>
            <option value={100}>Top 100 High Priority</option>
          </select>
        </div>
      </div>


      {/* Overview Notice */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
        <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1">
          <p className="font-semibold">Model Risk Classification vs Administrative Review Queue</p>
          <p className="text-amber-700 dark:text-amber-400">
            The validated statistical threshold for the schedule model is 0.63. All projects with risk score &ge; 0.63 are statistically classified as HIGH risk. This queue orders projects by urgency to match limited reviewer capacity without altering the underlying model threshold.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner /></div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 text-left">Rank</th>
                  <th className="py-3 px-4 text-left">Project ID</th>
                  <th className="py-3 px-4 text-left">Sector</th>
                  <th className="py-3 px-4 text-left">State</th>
                  <th className="py-3 px-4 text-left">Schedule Risk Score</th>
                  <th className="py-3 px-4 text-left">Review Urgency</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {data?.items?.map((item) => (
                  <tr key={item.project_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="py-3 px-4 font-mono font-bold text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                      #{item.priority_rank}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        to={`/projects/${encodeURIComponent(item.project_id)}/risk?as_of=${item.as_of || ''}`}
                        className="font-mono font-semibold text-blue-600 dark:text-blue-400 group-hover:underline"
                      >
                        {item.project_id}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">{item.sector || '—'}</td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">{item.state || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 tabular-nums">
                        {item.schedule_risk_score} (HIGH)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {item.requires_immediate_review ? (
                        <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                          <ShieldAlert size={14} className="shrink-0" /> Immediate Escalation
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                          <AlertCircle size={14} className="shrink-0" /> Scheduled Review
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/projects/${encodeURIComponent(item.project_id)}/risk?as_of=${item.as_of || ''}`}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline inline-flex items-center gap-1"
                      >
                        Evaluate Risk <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
