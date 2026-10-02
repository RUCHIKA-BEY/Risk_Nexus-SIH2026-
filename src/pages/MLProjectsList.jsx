/**
 * MLProjectsList.jsx — Complete Project Browser with Live Backend Data.
 * Connects to /api/v1/projects with full pagination, search, filters, and Split-A demo toggle.
 */
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, ChevronLeft, ChevronRight, Sparkles, AlertTriangle } from 'lucide-react';
import { fetchMLProjects, fetchMLHealth, getRiskColor } from '../services/mlApi';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function MLProjectsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ items: [], total: 0, page: 1, total_pages: 1, page_size: 25 });
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const sector = searchParams.get('sector') || '';
  const state = searchParams.get('state') || '';
  const status = searchParams.get('status') || '';
  const isDemoOnly = searchParams.get('demo') === 'true';

  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetchMLProjects({
        page,
        pageSize: 25,
        search,
        sector,
        state,
        status,
        demo: isDemoOnly,
      }).catch(err => {
        setError(err.message);
        return { items: [], total: 0, page: 1, total_pages: 1 };
      }),
      fetchMLHealth().catch(() => null),
    ]).then(([res, h]) => {
      setData(res);
      setHealth(h);
      setLoading(false);
    });
  }, [page, search, sector, state, status, isDemoOnly]);

  const updateParam = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val === undefined || val === '' || val === null) {
      next.delete(key);
    } else {
      next.set(key, val);
    }
    if (key !== 'page') next.set('page', '1');
    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParam('search', searchInput);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">All Monitored Projects</h1>
            {isDemoOnly && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                Split-A Demo Subset
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Showing {data.total.toLocaleString()} projects from canonical Phase-6 database
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Demo filter toggle */}
          <button
            onClick={() => updateParam('demo', isDemoOnly ? null : 'true')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isDemoOnly
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <Sparkles size={14} />
            {isDemoOnly ? 'Viewing Demo Projects' : 'Filter Demo Projects'}
          </button>

          {health && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${
              health.models_loaded
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400'
                : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${health.models_loaded ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              FastAPI {health.models_loaded ? 'Online' : 'Loading'}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-4 text-sm text-rose-700 dark:text-rose-300 flex items-start gap-3">
          <AlertTriangle className="shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-semibold">Backend connection error</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by project ID, sector, state, or agency..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Search
          </button>

          {(search || sector || state || status || isDemoOnly) && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/50 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Filter size={14} />
            <span>Filter:</span>
          </div>

          <select
            value={status}
            onChange={(e) => updateParam('status', e.target.value)}
            className="px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            <option value="">All Statuses</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            value={sector}
            onChange={(e) => updateParam('sector', e.target.value)}
            className="px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            <option value="">All Sectors</option>
            <option value="RAILWAYS">Railways</option>
            <option value="ROAD TRANSPORT AND HIGHWAYS">Roads & Highways</option>
            <option value="POWER">Power</option>
            <option value="PETROLEUM">Petroleum</option>
            <option value="COAL">Coal</option>
            <option value="URBAN DEVELOPMENT">Urban Development</option>
          </select>
        </div>
      </div>

      {/* Projects Table / Grid */}
      {loading ? (
        <div className="py-24 flex justify-center">
          <LoadingSpinner
            label="Loading national infrastructure projects — please wait…"
            sublabel="Querying monitored project portfolio"
          />
        </div>
      ) : (
        <>
          <div className="glass-card rounded-xl overflow-hidden shadow-xs animate-slide-up stagger-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Project ID</th>
                    <th className="py-3.5 px-4">Sector</th>
                    <th className="py-3.5 px-4">State / Agency</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Observations</th>
                    <th className="py-3.5 px-4">Latest Month</th>
                    <th className="py-3.5 px-4">Target Types</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {data.items.map((project) => (
                    <tr
                      key={project.project_id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/projects/${encodeURIComponent(project.project_id)}/risk?as_of=${project.last_report_month || ''}`}
                          state={{ source: 'projects', returnTo: '/projects/all' }}
                          className="font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {project.project_id}
                        </Link>
                        {project.name && (
                          <div className="text-xs text-slate-500 font-sans font-medium">{project.name}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {project.sector || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                        <div>{project.state || project.state_std || project.location || '—'}</div>
                        <div className="text-[11px] text-slate-400">{project.agency || project.agency_std || ''}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          project.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        }`}>
                          {project.status || 'Ongoing'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                        {project.available_months} mo
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                        {project.last_report_month || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {project.has_cost_target && (
                            <span className="px-1.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] rounded font-medium">Cost</span>
                          )}
                          {project.has_schedule_target && (
                            <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] rounded font-medium">Schedule</span>
                          )}
                          {project.has_compound_target && (
                            <span className="px-1.5 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 text-[10px] rounded font-medium">Compound</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/projects/${encodeURIComponent(project.project_id)}/risk?as_of=${project.last_report_month || ''}`}
                          state={{ source: 'projects', returnTo: '/projects/all' }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                        >
                          Assess Risk →
                        </Link>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.items.length === 0 && (
              <div className="text-center py-20 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <Search className="text-slate-400" size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No projects matched your criteria</p>
                  <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search term.</p>
                </div>
                <button onClick={clearFilters} className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Clear all filters
                </button>
              </div>
            )}

            {/* Pagination Controls */}
            {data.total_pages > 1 && (
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-500">
                <div>
                  Page <span className="font-semibold text-slate-700 dark:text-slate-300">{data.page}</span> of{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{data.total_pages}</span> (
                  {data.total.toLocaleString()} total projects)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={data.page <= 1}
                    onClick={() => updateParam('page', (data.page - 1).toString())}
                    className="flex items-center gap-1 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button
                    disabled={data.page >= data.total_pages}
                    onClick={() => updateParam('page', (data.page + 1).toString())}
                    className="flex items-center gap-1 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
