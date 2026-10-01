import { useState, useEffect } from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchMLProjects } from '../services/mlApi';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function Milestones() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMLProjects({ pageSize: 30 })
      .then(res => setProjects(res?.items || res?.projects || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Project Schedule & Milestones</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Observation timeline coverage and reporting status across active infrastructure initiatives.
        </p>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner /></div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 text-left">Project ID</th>
                  <th className="py-3 px-4 text-left">Sector</th>
                  <th className="py-3 px-4 text-left">First Observation</th>
                  <th className="py-3 px-4 text-left">Latest Observation</th>
                  <th className="py-3 px-4 text-left">Timeline Coverage</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-right">Trajectory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {projects.map((p) => (
                  <tr key={p.project_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {p.project_id}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">{p.sector || '—'}</td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-400 tabular-nums">{p.first_report_month}</td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-400 tabular-nums">{p.last_report_month}</td>
                    <td className="py-3 px-4 text-xs">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Clock size={14} className="text-slate-400 shrink-0" />
                        <span className="font-mono tabular-nums">{p.available_months} monthly cycles</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                        p.status === 'Completed'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                      }`}>
                        {p.status || 'Ongoing'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/projects/${encodeURIComponent(p.project_id)}/trajectory`}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline inline-flex items-center gap-1"
                      >
                        View Trend <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
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
