import { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchMLProjects } from '../services/mlApi';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import CountUpNumber from '../components/shared/CountUpNumber';

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
      <div className="animate-fade-in">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Project Schedule &amp; Milestones</h1>
        <p className="text-sm text-slate-500 mt-1">
          Observation timeline coverage and reporting status across active infrastructure initiatives.
        </p>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner
            label="Loading project milestones — please wait…"
            sublabel="Synchronizing project lifecycle schedules"
          />
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden animate-slide-up stagger-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-4 text-left">Project ID</th>
                  <th className="py-3 px-4 text-left">Sector</th>
                  <th className="py-3 px-4 text-left">First Observation</th>
                  <th className="py-3 px-4 text-left">Latest Observation</th>
                  <th className="py-3 px-4 text-left">Timeline Coverage</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-right">Trajectory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {projects.map((p) => (
                  <tr key={p.project_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-blue-600 dark:text-blue-400">
                      {p.project_id}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">{p.sector || '—'}</td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-400">{p.first_report_month}</td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-400">{p.last_report_month}</td>
                    <td className="py-3 px-4 text-xs">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <span className="font-mono">
                          <CountUpNumber value={p.available_months} /> monthly cycles
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        p.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {p.status || 'Ongoing'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/projects/${encodeURIComponent(p.project_id)}/trajectory`}
                        className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline inline-flex items-center gap-1"
                      >
                        View Trend <ArrowRight size={12} />
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
