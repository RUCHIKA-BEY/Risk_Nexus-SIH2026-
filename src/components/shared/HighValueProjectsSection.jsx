import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchHighValueProjects } from '../../services/mlApi';
import SectionCard from './SectionCard';

function formatIndianCurrency(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  const formatted = num.toLocaleString('en-IN', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
  return `₹${formatted} Cr`;
}

export default function HighValueProjectsSection() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetchHighValueProjects(20)
      .then((res) => {
        setProjects(res.items || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load high-value projects:', err);
        setError(err.message || 'Failed to load high-value projects');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const getNavState = () => ({
    source: 'public-dashboard',
    returnTo: '/',
    restoreScrollY: document.getElementById('main-content')?.scrollTop || 0,
    restoreSection: 'high-value',
  });

  return (
    <SectionCard
      id="high-value-projects-section"
      title="HIGH-VALUE PROJECTS"
      subtitle="Top 20 projects by sanctioned project cost"
      badge="CANONICAL PORTFOLIO"
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <p>
            Showing the latest available portfolio data for the highest-value monitored projects. Ranked strictly by sanctioned cost descending.
          </p>
          <span className="shrink-0 font-medium text-slate-600 dark:text-slate-300">
            {projects.length > 0 ? `Showing Top ${projects.length} Unique Projects` : ''}
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-600 dark:border-cyan-500/30 dark:border-t-cyan-400 animate-spin" />
            <p className="text-xs font-medium">Loading high-value projects…</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Aggregating latest project snapshots from canonical dataset</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="py-12 px-4 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col items-center justify-center text-center gap-3">
            <AlertCircle className="text-rose-600 dark:text-rose-400" size={24} />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">Unable to load high-value project data.</p>
              <p className="text-xs text-rose-700/80 dark:text-rose-300/80">{error}</p>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition-colors"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && projects.length === 0 && (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
            No high-value project data available.
          </div>
        )}

        {/* Loaded Content: Exact RiskNexus Project Table */}
        {!loading && !error && projects.length > 0 && (
          <>
            {/* Desktop / Tablet Full Table View */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Project ID</th>
                    <th className="py-3.5 px-4 min-w-[140px]">Sector</th>
                    <th className="py-3.5 px-4 min-w-[180px]">State / Agency</th>
                    <th className="py-3.5 px-4 min-w-[90px]">Status</th>
                    <th className="py-3.5 px-4 min-w-[100px]">Observations</th>
                    <th className="py-3.5 px-4 min-w-[110px]">Latest Month</th>
                    <th className="py-3.5 px-4 text-right min-w-[130px]">Sanctioned Cost</th>
                    <th className="py-3.5 px-4 text-right min-w-[130px]">Cumulative Spend</th>
                    <th className="py-3.5 px-4 text-right min-w-[90px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {projects.map((proj) => {
                    const rankFormatted = String(proj.rank).padStart(2, '0');
                    const hasSpend = proj.cumulative_expenditure !== null && proj.cumulative_expenditure !== undefined;
                    const hasCost = proj.sanctioned_cost !== null && proj.sanctioned_cost !== undefined;

                    return (
                      <tr
                        key={proj.project_id}
                        className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors group"
                      >
                        {/* Rank */}
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                          {rankFormatted}
                        </td>

                        {/* Project ID */}
                        <td className="py-3.5 px-4">
                          <Link
                            to={`/projects/${encodeURIComponent(proj.project_id)}/risk?as_of=${proj.last_report_month || ''}`}
                            state={getNavState()}
                            className="font-mono font-semibold text-blue-600 dark:text-cyan-400 hover:underline inline-block truncate max-w-[220px]"
                            title={proj.project_id}
                          >
                            {proj.project_id}
                          </Link>
                          {proj.name && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans truncate max-w-[220px] mt-0.5">
                              {proj.name}
                            </div>
                          )}
                        </td>

                        {/* Sector */}
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                          {proj.sector || '—'}
                        </td>

                        {/* State / Agency */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {proj.state || proj.agency ? (
                            <>
                              <div className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]" title={proj.state || '—'}>
                                {proj.state || '—'}
                              </div>
                              {proj.agency && (
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[180px]" title={proj.agency}>
                                  {proj.agency}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            proj.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-cyan-300'
                          }`}>
                            {proj.status || 'Ongoing'}
                          </span>
                        </td>

                        {/* Observations */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {proj.observations || '—'}
                        </td>

                        {/* Latest Month */}
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {proj.last_report_month || '—'}
                        </td>

                        {/* Sanctioned Cost */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-cyan-300">
                          {hasCost ? formatIndianCurrency(proj.sanctioned_cost) : '—'}
                        </td>

                        {/* Cumulative Spend */}
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {hasSpend ? formatIndianCurrency(proj.cumulative_expenditure) : '—'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            to={`/projects/${encodeURIComponent(proj.project_id)}/risk?as_of=${proj.last_report_month || ''}`}
                            state={getNavState()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-cyan-300 transition-colors"
                          >
                            <span>View</span>
                            <ArrowUpRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View (visible on < 768px screens) */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {projects.map((proj) => {
                const rankFormatted = String(proj.rank).padStart(2, '0');
                const hasSpend = proj.cumulative_expenditure !== null && proj.cumulative_expenditure !== undefined;
                const hasCost = proj.sanctioned_cost !== null && proj.sanctioned_cost !== undefined;

                return (
                  <div
                    key={proj.project_id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                          #{rankFormatted}
                        </span>
                        <Link
                          to={`/projects/${encodeURIComponent(proj.project_id)}/risk?as_of=${proj.last_report_month || ''}`}
                          state={getNavState()}
                          className="font-mono text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline truncate max-w-[180px]"
                        >
                          {proj.project_id}
                        </Link>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        proj.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-cyan-300'
                      }`}>
                        {proj.status || 'Ongoing'}
                      </span>
                    </div>

                    {proj.name && (
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {proj.name}
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{proj.sector || '—'}</span>
                      <span>•</span>
                      <span>{proj.state || '—'}</span>
                      {proj.agency && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400">{proj.agency}</span>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Sanctioned Cost</div>
                        <div className="font-mono font-bold text-slate-900 dark:text-cyan-300">
                          {hasCost ? formatIndianCurrency(proj.sanctioned_cost) : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Cumulative Spend</div>
                        <div className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {hasSpend ? formatIndianCurrency(proj.cumulative_expenditure) : '—'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span>Observations: </span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {proj.observations || '—'}
                        </span>
                      </div>
                      <div>
                        <span>Latest: </span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {proj.last_report_month || '—'}
                        </span>
                      </div>
                      <Link
                        to={`/projects/${encodeURIComponent(proj.project_id)}/risk?as_of=${proj.last_report_month || ''}`}
                        state={getNavState()}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-cyan-400 hover:underline ml-auto"
                      >
                        <span>View</span>
                        <ArrowUpRight size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}



