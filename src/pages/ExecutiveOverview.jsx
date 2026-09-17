import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Package, Activity, AlertCircle, TrendingUp, ShieldAlert, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchDashboardMetrics, fetchMLProjects } from '../services/mlApi';
import KPICard from '../components/shared/KPICard';
import SectionCard from '../components/shared/SectionCard';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function ExecutiveOverview() {
  const [metrics, setMetrics] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchDashboardMetrics().catch(err => { console.error(err); return null; }),
      fetchMLProjects({ pageSize: 8 }).catch(err => { console.error(err); return { items: [] }; }),
    ]).then(([m, pData]) => {
      setMetrics(m);
      setProjects(pData?.items || pData?.projects || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Portfolio &gt; Executive Dashboard</p>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1">Infrastructure Portfolio Overview</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time risk monitoring backed by verified XGBoost models</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
              <Calendar size={14} />
              <span>Dataset: <strong>Canonical Phase-6</strong></span>
            </div>
            <button
              onClick={loadData}
              className="p-2 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Project Health Snapshot */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Portfolio KPIs</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Live portfolio summary computed across monitored projects</p>
          
          {loading ? (
            <LoadingSpinner />
          ) : metrics ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Total Monitored Projects"
                value={metrics.total_projects?.toLocaleString() || '13,497'}
                icon={Package}
                color="blue"
              />
              <KPICard
                title="Total Portfolio Cost"
                value={`Rs. ${((metrics.total_budget || 0) / 1000).toFixed(1)}K Cr`}
                icon={Activity}
                color="green"
              />
              <KPICard
                title="Schedule Risk Flagged"
                value={metrics.high_risk_schedule_count?.toLocaleString() || '0'}
                icon={ShieldAlert}
                color="amber"
              />
              <KPICard
                title="Active Priority Reviews"
                value={metrics.active_escalations?.toLocaleString() || '0'}
                icon={AlertCircle}
                color="red"
              />
            </div>
          ) : null}
        </div>

        {/* Monitored Projects Preview */}
        <SectionCard
          title="Active Projects Pipeline"
          subtitle="Recent projects with full risk assessment available"
        >
          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      <th className="text-left py-3 px-4">Project ID</th>
                      <th className="text-left py-3 px-4">Sector</th>
                      <th className="text-left py-3 px-4">State</th>
                      <th className="text-left py-3 px-4">Timeline</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-right py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr
                        key={p.project_id}
                        className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/projects/${encodeURIComponent(p.project_id)}/risk?as_of=${p.last_report_month || ''}`)}
                      >
                        <td className="py-3 px-4">
                          <span className="font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline">
                            {p.project_id}
                          </span>
                          {p.name && <div className="text-xs text-slate-500 font-sans">{p.name}</div>}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">{p.sector || '—'}</td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">{p.state || '—'}</td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                          {p.first_report_month} → {p.last_report_month}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            p.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          }`}>
                            {p.status || 'Ongoing'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline inline-flex items-center gap-1">
                            Drill Down <ArrowRight size={12} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <Link
                  to="/projects/all"
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  View All {metrics?.total_projects?.toLocaleString() || ''} Projects →
                </Link>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
